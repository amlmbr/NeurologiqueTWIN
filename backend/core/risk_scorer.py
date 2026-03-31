"""
Explainable Risk Scorer — NeurologiqueTWIN
==========================================

Provides feature-level attribution alongside the global seizure risk score.
This enables clinicians and caregivers to understand *which* physiological
signals are driving the current risk level — a core requirement for any
medical AI system deployed in a clinical setting.

Scoring design
--------------
The raw score is computed as a weighted sum of normalised feature deviations
from patient-calibrated baselines:

    z_i = (x_i − μ_i) / σ_i          (z-score from baseline)
    c_i = w_i · tanh(z_i · 0.75)     (signed contribution, bounded)
    score_raw = Σ c_i                 (∈ [-Σw_i, +Σw_i])
    risk = sigmoid((score_raw − 0) / 0.5)  (mapped to [0, 1])

For inverted features (HRV, steps — where low values indicate higher risk):
    z_i_eff = −z_i

Temporal smoothing
------------------
An exponential moving average (EMA) is applied over successive scoring calls
on the same scorer instance:

    EMA_t = α · score_t + (1−α) · EMA_{t-1}

This prevents spurious high-risk scores from transient measurement noise and
mirrors the digital twin's own smoothing.

Trend boost
-----------
When the EMA score is rising rapidly (trend > threshold), the final risk is
boosted by up to 10 percentage points:

    risk_boosted = risk + trend_boost_factor · max(0, trend)

Attribution format
------------------
The explainability dictionary follows the SHAP-style additive format:

    {
        "eeg_energy": { "value": 0.45, "contribution": +0.28, "direction": "increases_risk" },
        "hr":         { "value": 92.0, "contribution": +0.18, "direction": "increases_risk" },
        "hrv":        { "value": 35.0, "contribution": +0.12, "direction": "increases_risk" },
        "eda":        { "value": 0.55, "contribution": +0.08, "direction": "increases_risk" },
        "steps":      { "value": 80.0, "contribution": -0.03, "direction": "decreases_risk" },
    }

Original: SeizeIT2_CWGAN_RESNET_EEG/keras_adapter.py (feature fallback scorer)
Upgraded: z-score normalisation, EMA smoothing, trend boost, SHAP-style attribution.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np


# ---------------------------------------------------------------------------
# Physiological feature specifications
# ---------------------------------------------------------------------------

_FEATURE_SPECS: Dict[str, Dict] = {
    "eeg_energy": {
        "baseline": 0.08,  "std": 0.06,  "weight": 0.30,
        "normal_range": (0.0, 0.25),  "unit": "norm.",
        "label": "EEG Spectral Energy",    "inverted": False,
    },
    "hr": {
        "baseline": 72.0,  "std": 12.0,  "weight": 0.22,
        "normal_range": (55.0, 90.0),  "unit": "bpm",
        "label": "Heart Rate",             "inverted": False,
    },
    "eda": {
        "baseline": 0.35,  "std": 0.10,  "weight": 0.18,
        "normal_range": (0.15, 0.60),  "unit": "µS",
        "label": "Skin Conductance (EDA)", "inverted": False,
    },
    "hrv": {
        "baseline": 50.0,  "std": 15.0,  "weight": 0.15,
        "normal_range": (20.0, 80.0),  "unit": "ms",
        "label": "Heart Rate Variability", "inverted": True,
    },
    "steps": {
        "baseline": 250.0, "std": 100.0, "weight": 0.07,
        "normal_range": (0.0, 600.0),  "unit": "steps/h",
        "label": "Physical Activity",      "inverted": True,
    },
    "stress": {
        "baseline": 0.25,  "std": 0.15,  "weight": 0.05,
        "normal_range": (0.0, 0.60),   "unit": "score",
        "label": "Composite Stress Index", "inverted": False,
    },
    "tremor": {
        "baseline": 0.05,  "std": 0.05,  "weight": 0.03,
        "normal_range": (0.0, 0.20),   "unit": "norm.",
        "label": "Tremor Index",           "inverted": False,
    },
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class FeatureContribution:
    name: str
    key: str
    value: float
    z_score: float
    contribution: float          # Signed ∈ (-weight, +weight)
    direction: str               # "increases_risk" | "decreases_risk" | "neutral"
    normal_range: Tuple[float, float]
    unit: str
    weight: float


@dataclass
class RiskExplanation:
    seizure_risk: float          # Final risk ∈ [0, 1] (after EMA + trend boost)
    raw_risk: float              # Before smoothing
    ema_risk: float              # After EMA only
    risk_level: str              # "low" | "moderate" | "high" | "critical"
    features: List[FeatureContribution]
    dominant_driver: str
    attribution_dict: Dict[str, float]   # key → contribution (SHAP-style)
    clinical_note: str
    raw_features: Dict[str, float] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Scorer
# ---------------------------------------------------------------------------

class ExplainableRiskScorer:
    """
    Weighted, explainable risk scorer with EMA smoothing and trend boost.

    Parameters
    ----------
    feature_specs : dict, optional — override default specs
    ema_alpha : float — smoothing factor ∈ (0,1], default 0.35
    trend_boost : float — max risk boost from rising trend, default 0.10
    trend_window : int — number of past scores used for trend estimation
    """

    def __init__(
        self,
        feature_specs: Optional[Dict] = None,
        ema_alpha: float = 0.35,
        trend_boost: float = 0.10,
        trend_window: int = 10,
    ) -> None:
        self.specs = {**_FEATURE_SPECS, **(feature_specs or {})}
        self.ema_alpha = ema_alpha
        self.trend_boost = trend_boost
        self.trend_window = trend_window

        self._ema: float = 0.0
        self._score_history: List[float] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def score(self, features: Dict[str, float]) -> float:
        """Return the final temporal-smoothed + trend-boosted risk ∈ [0, 1]."""
        return self.explain(features).seizure_risk

    def explain(self, features: Dict[str, float]) -> RiskExplanation:
        """
        Full explainable scoring.

        Steps:
        1. Compute per-feature z-scores and signed contributions.
        2. Sum contributions → raw_score → sigmoid → raw_risk.
        3. Apply EMA smoothing → ema_risk.
        4. Apply trend boost → final risk.
        5. Build attribution dict and clinical note.
        """
        contribs: List[FeatureContribution] = []
        total_contrib = 0.0

        for key, spec in self.specs.items():
            if key not in features:
                continue
            val = float(features[key])
            baseline = spec["baseline"]
            std = spec["std"]
            weight = spec["weight"]
            inverted = spec.get("inverted", False)

            z = (val - baseline) / (std + 1e-8)
            if inverted:
                z = -z

            contrib = weight * float(np.tanh(z * 0.75))
            total_contrib += contrib

            direction = (
                "increases_risk" if contrib > 0.015
                else "decreases_risk" if contrib < -0.015
                else "neutral"
            )
            contribs.append(FeatureContribution(
                name=spec["label"],
                key=key,
                value=val,
                z_score=round(z, 3),
                contribution=round(contrib, 4),
                direction=direction,
                normal_range=spec["normal_range"],
                unit=spec["unit"],
                weight=weight,
            ))

        # Raw risk via sigmoid
        raw_risk = float(self._sigmoid(total_contrib / 0.5))

        # EMA smoothing
        self._ema = self.ema_alpha * raw_risk + (1.0 - self.ema_alpha) * self._ema
        ema_risk = self._ema

        # Trend boost
        self._score_history.append(ema_risk)
        if len(self._score_history) > self.trend_window:
            self._score_history.pop(0)
        trend = self._trend_slope()
        boost = self.trend_boost * max(0.0, trend / 0.01)  # normalise slope
        final_risk = float(np.clip(ema_risk + boost, 0.0, 1.0))

        # Attribution dict (SHAP-style)
        attribution = {c.key: c.contribution for c in contribs}

        # Dominant driver
        dominant = (
            max(contribs, key=lambda c: abs(c.contribution)).name
            if contribs else "Unknown"
        )

        risk_level = self._risk_level(final_risk)
        note = self._clinical_note(
            risk_level, dominant,
            [c for c in contribs if c.direction == "increases_risk"]
        )

        return RiskExplanation(
            seizure_risk=final_risk,
            raw_risk=raw_risk,
            ema_risk=ema_risk,
            risk_level=risk_level,
            features=contribs,
            dominant_driver=dominant,
            attribution_dict=attribution,
            clinical_note=note,
            raw_features=dict(features),
        )

    def reset(self) -> None:
        """Reset temporal state (call between patients)."""
        self._ema = 0.0
        self._score_history.clear()

    def to_dict(self, explanation: RiskExplanation) -> Dict:
        """Serialise a RiskExplanation to a JSON-safe dict."""
        return {
            "seizure_risk":    explanation.seizure_risk,
            "raw_risk":        explanation.raw_risk,
            "ema_risk":        explanation.ema_risk,
            "risk_level":      explanation.risk_level,
            "dominant_driver": explanation.dominant_driver,
            "clinical_note":   explanation.clinical_note,
            "attribution": explanation.attribution_dict,
            "features": [
                {
                    "key":          c.key,
                    "name":         c.name,
                    "value":        c.value,
                    "z_score":      c.z_score,
                    "contribution": c.contribution,
                    "direction":    c.direction,
                    "normal_range": list(c.normal_range),
                    "unit":         c.unit,
                    "weight":       c.weight,
                }
                for c in explanation.features
            ],
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _sigmoid(x: float) -> float:
        return 1.0 / (1.0 + math.exp(-x)) if (x := float(x)) > -500 else 0.0

    def _trend_slope(self) -> float:
        h = self._score_history
        if len(h) < 3:
            return 0.0
        xs = np.arange(len(h), dtype=float)
        ys = np.array(h)
        p = np.polyfit(xs, ys, 1)
        return float(p[0])

    @staticmethod
    def _risk_level(risk: float) -> str:
        if risk >= 0.80:
            return "critical"
        if risk >= 0.55:
            return "high"
        if risk >= 0.30:
            return "moderate"
        return "low"

    @staticmethod
    def _clinical_note(
        risk_level: str,
        dominant: str,
        increasing: List[FeatureContribution],
    ) -> str:
        names = ", ".join(c.name for c in increasing) or "multiple signals"
        if risk_level == "critical":
            return (
                f"CRITICAL seizure risk. Primary driver: {dominant}. "
                f"Elevated biomarkers: {names}. Immediate clinical review recommended."
            )
        if risk_level == "high":
            return (
                f"High seizure risk. {dominant} is the dominant contributor. "
                f"Monitor closely: {names}."
            )
        if risk_level == "moderate":
            return (
                f"Moderate risk. Watch for changes in {dominant}. "
                "Consider medication review if sustained."
            )
        return "Low seizure risk. Patient within normal physiological parameters."


import math  # noqa: E402 — placed here to keep top-level imports clean
