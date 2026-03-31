"""
Multimodal Fusion Engine — NeurologiqueTWIN
===========================================

Combines three complementary prediction streams into a single final
seizure risk score:

  1. CNN (ResNet-CBAM)   — image-based deep features from EEG transforms
  2. XGBoost             — handcrafted spectral + IMU tabular features
  3. NLP                 — clinical text analysis

Plus two contextual signals:
  4. IMU composite       — raw wearable feature score
  5. Temporal state      — current digital twin Markov state

Fusion formula
--------------
    r_final = softmax_weighted(
        w_cnn    · r_cnn    +
        w_xgb    · r_xgb    +
        w_nlp    · r_nlp    +
        w_imu    · r_imu    +
        w_state  · r_state
    )

Default weights (can be learned from validation data):
    CNN:     0.35   (highest — image model trained on real data, 90% acc)
    XGBoost: 0.30   (second — complementary feature perspective)
    NLP:     0.15   (moderate — text quality varies)
    IMU:     0.15   (moderate — direct physiological measurement)
    State:   0.05   (low — derived, not independent)

Weights are normalised to sum to 1 after masking unavailable sources.
This means the system degrades gracefully when some modalities are missing.

Confidence and uncertainty
--------------------------
The fusion also computes:
  - Agreement score: 1 - std(component_risks) — how much modalities agree
  - Confidence: overall reliability of the prediction

Attribution breakdown
---------------------
Returns a SHAP-style attribution showing each modality's contribution:
    {
        "cnn":    0.45,
        "xgboost": 0.25,
        "nlp":    0.12,
        "imu":    0.13,
        "state":  0.05,
    }
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ModalityScore:
    """Score from one prediction modality."""
    name: str
    risk: float          # P(seizure) ∈ [0, 1]
    weight: float        # Configured weight
    available: bool      # Was this modality actually computed?
    contribution: float  # Final weighted contribution (post-normalisation)


@dataclass
class FusionResult:
    """Complete multimodal fusion output."""
    final_risk: float          # Final fused P(seizure) ∈ [0, 1]
    risk_level: str            # "low" | "moderate" | "high" | "critical"
    modalities: List[ModalityScore]
    attribution: Dict[str, float]     # Modality → fraction of final score
    agreement: float                  # Inter-modality agreement ∈ [0, 1]
    confidence: float                 # Prediction confidence ∈ [0, 1]
    dominant_modality: str
    clinical_summary: str


# ---------------------------------------------------------------------------
# Default weights
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS: Dict[str, float] = {
    "cnn":     0.35,
    "xgboost": 0.30,
    "nlp":     0.15,
    "imu":     0.15,
    "state":   0.05,
}

# Mapping from digital twin state to risk contribution
STATE_RISK_MAP: Dict[str, float] = {
    "normal":    0.05,
    "preictal":  0.55,
    "ictal":     0.92,
    "postictal": 0.30,
}


# ---------------------------------------------------------------------------
# Fusion engine
# ---------------------------------------------------------------------------

class MultimodalFusionEngine:
    """
    Combines CNN, XGBoost, NLP, IMU, and state estimates into a single
    explainable seizure risk score.

    Parameters
    ----------
    weights : dict, optional — override DEFAULT_WEIGHTS
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None) -> None:
        self.weights = {**DEFAULT_WEIGHTS, **(weights or {})}
        # Normalise weights
        total = sum(self.weights.values())
        self.weights = {k: v / total for k, v in self.weights.items()}

    # ------------------------------------------------------------------
    # Main fusion
    # ------------------------------------------------------------------

    def fuse(
        self,
        cnn_risk:     Optional[float] = None,
        xgboost_risk: Optional[float] = None,
        nlp_risk:     Optional[float] = None,
        imu_risk:     Optional[float] = None,
        twin_state:   Optional[str]   = None,
    ) -> FusionResult:
        """
        Fuse all available modality scores.

        Any modality can be None (unavailable); weights are renormalised.

        Parameters
        ----------
        cnn_risk : float | None — ResNet-CBAM output P(seizure)
        xgboost_risk : float | None — XGBoost output P(seizure)
        nlp_risk : float | None — NLP risk_score ∈ [0,1]
        imu_risk : float | None — IMU composite risk ∈ [0,1]
        twin_state : str | None — digital twin Markov state

        Returns
        -------
        FusionResult
        """
        # Map state to risk contribution
        state_risk: Optional[float] = None
        if twin_state is not None:
            state_risk = STATE_RISK_MAP.get(twin_state.lower(), 0.1)

        inputs = {
            "cnn":     cnn_risk,
            "xgboost": xgboost_risk,
            "nlp":     nlp_risk,
            "imu":     imu_risk,
            "state":   state_risk,
        }

        # Build modality list; renormalise weights for available modalities
        available = {k: v for k, v in inputs.items() if v is not None}
        if not available:
            return self._empty_result()

        weight_sum = sum(self.weights[k] for k in available)
        eff_weights = {k: self.weights[k] / weight_sum for k in available}

        # Weighted sum
        final_risk = float(sum(
            eff_weights[k] * float(v) for k, v in available.items()
        ))
        final_risk = float(np.clip(final_risk, 0.0, 1.0))

        # Contributions (each modality's fraction of the final score)
        score_sum = sum(eff_weights[k] * float(v) for k, v in available.items())
        attribution = {
            k: round(eff_weights[k] * float(v) / (score_sum + 1e-8), 4)
            for k, v in available.items()
        }

        # Build ModalityScore list
        modalities = [
            ModalityScore(
                name=k,
                risk=float(v),
                weight=self.weights[k],
                available=True,
                contribution=attribution[k],
            )
            for k, v in available.items()
        ]
        for k in set(inputs) - set(available):
            modalities.append(ModalityScore(
                name=k, risk=0.0, weight=self.weights[k],
                available=False, contribution=0.0,
            ))

        # Agreement: 1 - coefficient of variation of available risks
        risks = np.array(list(available.values()), dtype=float)
        agreement = float(1.0 - np.std(risks) / (np.mean(risks) + 1e-8))
        agreement = float(np.clip(agreement, 0.0, 1.0))

        # Confidence: agreement × coverage fraction
        coverage = len(available) / len(inputs)
        confidence = float(agreement * coverage)

        # Dominant modality
        dominant = max(attribution, key=attribution.get)

        risk_level = self._risk_level(final_risk)
        summary = self._clinical_summary(final_risk, risk_level, dominant, modalities, agreement)

        return FusionResult(
            final_risk=final_risk,
            risk_level=risk_level,
            modalities=modalities,
            attribution=attribution,
            agreement=round(agreement, 4),
            confidence=round(confidence, 4),
            dominant_modality=dominant,
            clinical_summary=summary,
        )

    # ------------------------------------------------------------------
    # Convenience method
    # ------------------------------------------------------------------

    def fuse_from_dicts(
        self,
        cnn_result:     Optional[Dict] = None,
        xgboost_result: Optional[Dict] = None,
        nlp_result:     Optional[Dict] = None,
        imu_features:   Optional[Dict] = None,
        twin_result:    Optional[Dict] = None,
    ) -> FusionResult:
        """
        Fuse from the native output dicts of each component.

        Accepts the raw dicts returned by:
          - KerasSeizurePredictor() → {"seizure_risk": 0.8}
          - TabularSeizurePredictor.predict_with_attribution() → {"seizure_probability": 0.7}
          - ClinicalNLPAnalyzer.analyze() → {"risk_score": 0.6}
          - ExplainableRiskScorer.explain() → RiskExplanation.seizure_risk
          - DigitalTwin.step() → {"state": "preictal", ...}
        """
        cnn_risk     = float(cnn_result["seizure_risk"]) if cnn_result else None
        xgboost_risk = float(xgboost_result["seizure_probability"]) if xgboost_result else None
        nlp_risk     = float(nlp_result["risk_score"]) if nlp_result else None
        imu_risk: Optional[float] = None
        if imu_features:
            # Compute a simple composite IMU score
            hr  = float(imu_features.get("hr",  72.0))
            eda = float(imu_features.get("eda", 0.35))
            hrv = float(imu_features.get("hrv", 50.0))
            imu_risk = float(np.clip(
                0.4 * max(0, (hr - 72) / 20)
                + 0.3 * max(0, (eda - 0.35) / 0.3)
                + 0.3 * max(0, (50 - hrv) / 40),
                0, 1,
            ))
        twin_state = twin_result.get("state") if twin_result else None
        return self.fuse(cnn_risk, xgboost_risk, nlp_risk, imu_risk, twin_state)

    def to_dict(self, result: FusionResult) -> Dict:
        """Serialise FusionResult to JSON-safe dict."""
        return {
            "final_risk":        result.final_risk,
            "risk_level":        result.risk_level,
            "agreement":         result.agreement,
            "confidence":        result.confidence,
            "dominant_modality": result.dominant_modality,
            "clinical_summary":  result.clinical_summary,
            "attribution": result.attribution,
            "modalities": [
                {
                    "name":         m.name,
                    "risk":         m.risk,
                    "weight":       m.weight,
                    "available":    m.available,
                    "contribution": m.contribution,
                }
                for m in result.modalities
            ],
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _risk_level(risk: float) -> str:
        if risk >= 0.80: return "critical"
        if risk >= 0.55: return "high"
        if risk >= 0.30: return "moderate"
        return "low"

    @staticmethod
    def _clinical_summary(
        risk: float,
        level: str,
        dominant: str,
        modalities: List[ModalityScore],
        agreement: float,
    ) -> str:
        avail = [m.name for m in modalities if m.available]
        agr_str = "high agreement" if agreement > 0.7 else "moderate agreement" if agreement > 0.4 else "low agreement"
        return (
            f"Multimodal fusion ({', '.join(avail)}): {level} risk ({risk:.1%}). "
            f"Dominant signal: {dominant}. "
            f"Inter-modality {agr_str} ({agreement:.0%})."
        )

    @staticmethod
    def _empty_result() -> FusionResult:
        return FusionResult(
            final_risk=0.0, risk_level="low",
            modalities=[], attribution={},
            agreement=0.0, confidence=0.0,
            dominant_modality="none",
            clinical_summary="No modality data available.",
        )
