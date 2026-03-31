"""
region_mapper.py
================
Maps ResNet-CBAM model output → hypothesized brain region for the digital twin.

SCIENTIFIC DISCLAIMER
---------------------
All region assignments produced by this module are HYPOTHESIZED AFFECTED ZONES.
They are derived from:
  - EEG channel topology (10-20 international system)
  - Rule-based seizure-type defaults from ILAE literature
  - No patient-specific MRI or source-localization data is used

This output MUST NOT be interpreted as validated clinical localization.
It is intended solely for academic digital twin visualization.

Resolution priority
-------------------
1. channel_scores  : weighted vote across importance-scored channels    → "channel_weighted"
2. dominant_channels : equal-weight vote over a channel list            → "channel_argmax"
3. seizure_type    : ILAE-based default region for the predicted type   → "demo_seizure_type"
4. global fallback : frontal midline (most common generalized onset)    → "fallback"

Usage
-----
    from backend.twin.region_mapper import resolve_region

    # With channel importance from SHAP / GradCAM
    result = resolve_region(
        seizure_type     = "Focal Temporal",
        channel_scores   = {"T3": 0.72, "F7": 0.45, "T5": 0.31, "C3": 0.18},
    )

    # Fallback only
    result = resolve_region(seizure_type="Absence")

    # result keys: region_name, lobe, side, x, y, z,
    #              highlight_intensity, localization_confidence, disclaimer,
    #              color_normal, color_alert, color_highlight, function,
    #              typical_channels, brodmann
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .brain_regions import BRAIN_REGIONS, SEIZURE_TYPE_DEFAULT_REGION, BrainRegion

# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "eeg_region_mapping.json"


def _load_config() -> dict:
    try:
        with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


_CFG:          dict           = _load_config()
_CHANNEL_MAP:  Dict[str, dict]= _CFG.get("channels", {})
_TYPE_MAP:     dict           = _CFG.get("seizure_type_default_regions", {})
_THRESHOLDS:   dict           = _CFG.get("thresholds", {})

# Pre-build a case-insensitive channel lookup
_CHANNEL_LOOKUP: Dict[str, dict] = {k.upper(): v for k, v in _CHANNEL_MAP.items()}

DISCLAIMER = (
    "⚠ HYPOTHESIZED AFFECTED ZONE — Academic digital twin demo only. "
    "Derived from EEG channel-to-lobe topology or seizure-type defaults. "
    "This is NOT validated clinical localization and must NOT be used "
    "for diagnostic or therapeutic decision-making."
)


# ---------------------------------------------------------------------------
# Intensity calculation
# ---------------------------------------------------------------------------

def compute_highlight_intensity(seizure_risk: float, threshold_min: float = 0.40) -> float:
    """
    Map seizure_risk → [0, 1] highlight intensity for the 3D brain region.

    Below threshold → 0.0 (no highlight).
    At threshold    → 0.0
    At 1.0 risk     → 1.0

    Formula: intensity = max(0, (risk - threshold_min) / (1.0 - threshold_min))
    """
    if seizure_risk < threshold_min:
        return 0.0
    return round(min(1.0, (seizure_risk - threshold_min) / (1.0 - threshold_min)), 4)


def risk_to_color(seizure_risk: float) -> str:
    """Return CSS hex color matching the risk level."""
    if seizure_risk >= 0.80:
        return "#ef4444"   # ictal — red
    if seizure_risk >= 0.60:
        return "#f97316"   # pre-ictal — orange
    if seizure_risk >= 0.40:
        return "#eab308"   # elevated — yellow
    return "#22c55e"       # stable — green


# ---------------------------------------------------------------------------
# Main mapper class
# ---------------------------------------------------------------------------

class RegionMapper:
    """
    Converts ResNet-CBAM model outputs into a hypothesized brain region.

    All three resolution strategies are tried in priority order.
    Each returns a full dict including highlight intensity, colors,
    3D coordinates, and an explicit disclaimer.
    """

    def __init__(self) -> None:
        self._channel_map = _CHANNEL_LOOKUP
        self._type_map    = _TYPE_MAP

    # ── Strategy 1: Weighted channel vote ──────────────────────────────────

    def from_channel_scores(
        self,
        channel_scores: Dict[str, float],
    ) -> Tuple[Optional[BrainRegion], str, dict]:
        """
        Weighted vote across EEG channels using their importance scores.

        Each channel maps to a brain region via the 10-20 system.
        The region receiving the highest summed importance wins.

        Returns
        -------
        (BrainRegion | None, confidence_label, vote_breakdown)
        """
        region_votes: Dict[str, float] = {}
        typical_channels: List[str]    = []

        for ch, score in channel_scores.items():
            # Normalize: strip spaces, uppercase, try with and without dash
            normalized = ch.strip().upper().replace(" ", "")
            meta = self._channel_map.get(normalized)
            if meta is None:
                # Try without internal dashes (e.g., "FP1F7" → skip, keep dashes)
                for key, val in self._channel_map.items():
                    if key.replace("-", "") == normalized.replace("-", ""):
                        meta = val
                        break
            if meta is None:
                continue

            region_name = meta.get("region", "")
            if region_name and abs(score) > 0:
                region_votes[region_name] = (
                    region_votes.get(region_name, 0.0) + abs(float(score))
                )
                typical_channels.append(ch)

        if not region_votes:
            return None, "unknown", {}

        # Winner = highest accumulated importance
        best = max(region_votes, key=lambda k: region_votes[k])
        total = sum(region_votes.values()) + 1e-9
        vote_breakdown = {k: round(v / total, 3) for k, v in sorted(
            region_votes.items(), key=lambda x: -x[1]
        )}

        region = BRAIN_REGIONS.get(best)
        return region, "channel_weighted", vote_breakdown

    # ── Strategy 2: Dominant channel list ──────────────────────────────────

    def from_dominant_channels(
        self,
        channels: List[str],
    ) -> Tuple[Optional[BrainRegion], str, dict]:
        """
        Equal-weight vote over a list of dominant/active channels.
        Simpler than weighted: each channel counts as 1.
        """
        equal_scores = {ch: 1.0 for ch in channels}
        region, _, breakdown = self.from_channel_scores(equal_scores)
        return region, "channel_argmax", breakdown

    # ── Strategy 3: Seizure-type default ───────────────────────────────────

    def from_seizure_type(
        self,
        seizure_type: str,
    ) -> Tuple[Optional[BrainRegion], str, List[str]]:
        """
        ILAE-based default region for the predicted seizure type.
        Explicitly labeled as 'demo_seizure_type' — lowest confidence.
        """
        type_meta  = self._type_map.get(seizure_type, {})
        region_name = type_meta.get("region")
        typical_chs = type_meta.get("typical_channels", [])

        if region_name is None:
            return None, "none", []

        region = BRAIN_REGIONS.get(region_name)
        return region, "demo_seizure_type", typical_chs

    # ── Master resolver ─────────────────────────────────────────────────────

    def resolve(
        self,
        seizure_risk:        float                     = 0.0,
        seizure_type:        Optional[str]             = None,
        channel_scores:      Optional[Dict[str, float]]= None,
        dominant_channels:   Optional[List[str]]       = None,
    ) -> dict:
        """
        Resolve hypothesized brain region from model outputs.

        Priority: channel_scores > dominant_channels > seizure_type > fallback

        Parameters
        ----------
        seizure_risk : float [0, 1]
            P(seizure) from ResNet-CBAM ensemble.
        seizure_type : str | None
            Predicted seizure type string.
        channel_scores : dict | None
            {channel_name: importance_score} from SHAP / GradCAM / feature importance.
        dominant_channels : list | None
            Active EEG channels (binary presence, equal weight).

        Returns
        -------
        Full region dict — see docstring for schema.
        """
        region:    Optional[BrainRegion] = None
        confidence = "none"
        breakdown: dict | list           = {}
        typical_chs: List[str]           = []

        # Strategy 1
        if channel_scores and any(abs(v) > 0 for v in channel_scores.values()):
            region, confidence, breakdown = self.from_channel_scores(channel_scores)
            if region:
                # collect the top channels that voted
                typical_chs = [ch for ch, v in sorted(
                    channel_scores.items(), key=lambda x: -abs(x[1])
                )[:5]]

        # Strategy 2
        if region is None and dominant_channels:
            region, confidence, breakdown = self.from_dominant_channels(dominant_channels)
            typical_chs = dominant_channels[:5]

        # Strategy 3
        if region is None and seizure_type:
            region, confidence, typical_chs = self.from_seizure_type(seizure_type)
            breakdown = {}

        # Strategy 4 — absolute fallback
        if region is None:
            region     = BRAIN_REGIONS.get("Frontal Midline")
            confidence = "fallback"
            typical_chs= ["Fz"]
            breakdown  = {}

        # Compute visualization values
        intensity = compute_highlight_intensity(seizure_risk)
        color_hl  = risk_to_color(seizure_risk)
        type_note = (self._type_map.get(seizure_type or "", {}).get("note", ""))

        if region is None:
            # Should never reach here (fallback is always set), but guard
            return {
                "region_name":             None,
                "lobe":                    None,
                "side":                    "unknown",
                "x": 0.0, "y": 0.0, "z": 0.0,
                "highlight_intensity":     0.0,
                "localization_confidence": "none",
                "color_normal":            "#6b7280",
                "color_alert":             "#ef4444",
                "color_highlight":         color_hl,
                "function":                "",
                "typical_channels":        [],
                "brodmann":                "",
                "vote_breakdown":          {},
                "seizure_type_note":       "",
                "disclaimer":              DISCLAIMER,
            }

        return {
            "region_name":             region.name,
            "lobe":                    region.lobe,
            "side":                    region.side,
            "x":                       region.x,
            "y":                       region.y,
            "z":                       region.z,
            "highlight_intensity":     intensity,
            "localization_confidence": confidence,
            "color_normal":            region.color_normal,
            "color_alert":             region.color_alert,
            "color_highlight":         color_hl,
            "function":                region.function,
            "typical_channels":        typical_chs,
            "brodmann":                _CHANNEL_MAP.get(
                                           (typical_chs[0] if typical_chs else "").upper(), {}
                                       ).get("brodmann", ""),
            "vote_breakdown":          breakdown,
            "seizure_type_note":       type_note,
            "disclaimer":              DISCLAIMER,
        }


# ---------------------------------------------------------------------------
# Module-level singleton + convenience function
# ---------------------------------------------------------------------------

_mapper = RegionMapper()


def resolve_region(
    seizure_risk:      float                     = 0.0,
    seizure_type:      Optional[str]             = None,
    channel_scores:    Optional[Dict[str, float]]= None,
    dominant_channels: Optional[List[str]]       = None,
) -> dict:
    """
    Convenience function — see RegionMapper.resolve() for full docs.

    Example
    -------
    >>> resolve_region(
    ...     seizure_risk     = 0.83,
    ...     seizure_type     = "Focal Temporal",
    ...     channel_scores   = {"T3": 0.72, "F7": 0.45, "T5": 0.31},
    ... )
    {
        "region_name": "Left Temporal",
        "lobe": "temporal",
        "side": "left",
        "x": -1.0, "y": -0.05, "z": 0.1,
        "highlight_intensity": 0.7167,
        "localization_confidence": "channel_weighted",
        "color_normal": "#4c1d95",
        "color_alert": "#f97316",
        "color_highlight": "#ef4444",
        "function": "Wernicke's area, verbal memory, auditory processing",
        "typical_channels": ["T3", "F7", "T5"],
        "brodmann": "BA21/BA22",
        "vote_breakdown": {"Left Temporal": 0.494, "Left Frontotemporal": 0.308, ...},
        "seizure_type_note": "Mesial temporal lobe epilepsy...",
        "disclaimer": "⚠ HYPOTHESIZED AFFECTED ZONE ..."
    }
    """
    return _mapper.resolve(
        seizure_risk      = seizure_risk,
        seizure_type      = seizure_type,
        channel_scores    = channel_scores,
        dominant_channels = dominant_channels,
    )
