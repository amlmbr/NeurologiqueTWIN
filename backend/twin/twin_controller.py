"""
twin_controller.py
==================
Orchestrator for the NeurologiqueTWIN brain digital twin.

Wires together:
  ┌─────────────────────────────┐
  │  ResNet-CBAM inference      │  → seizure_risk, seizure_type
  │  RegionMapper               │  → hypothesized brain region
  │  BrainTwinState             │  → state machine + region activation
  │  AlertManager               │  → emergency alert payload
  └─────────────────────────────┘

One TwinController instance per patient (held in _patient_twins registry).

API response schema
-------------------
{
  "patient_id":   str,
  "twin": {
    "status":         "stable"|"elevated"|"preictal"|"ictal"|"postictal",
    "status_label":   str,
    "status_color":   "#rrggbb",
    "seizure_risk":   float [0,1],
    "seizure_type":   str | null,
    "alert_level":    "info"|"yellow"|"orange"|"red"|"purple",
    "active_region":  RegionDict | null,
    "regions":        [RegionDict, ...],    # all 20 brain regions
    "recent_events":  [EventDict, ...],
    "maps_link":      str | null
  },
  "region":       RegionDict,           # resolved hypothesized zone
  "alert":        AlertDict | null,     # emergency alert (null if stable)
  "risk_history": [float, ...],         # last 20 readings
  "seizure_type": str | null,
  "band_powers":  {"delta":f, "theta":f, "alpha":f, "beta":f, "gamma":f},
  "eeg_energy":   float
}

Example input
-------------
{
  "patient_id":    "patient-001",
  "seizure_risk":  0.83,
  "seizure_type":  "Focal Temporal",
  "channel_scores": {"T3": 0.72, "F7": 0.45, "T5": 0.31},
  "lat": 33.9716,
  "lon": -6.8498,
  "fall_detected": false
}

Example output
--------------
See EXAMPLE_OUTPUT constant at bottom of file.
"""

from __future__ import annotations

import time
from typing import Dict, List, Optional

from .brain_state   import BrainTwinState
from .alert_manager import AlertManager
from .region_mapper import RegionMapper, resolve_region


# ---------------------------------------------------------------------------
# Patient registry  (in-memory, replaces DB in demo)
# ---------------------------------------------------------------------------

_patient_twins: Dict[str, "TwinController"] = {}


def get_or_create_twin(patient_id: str) -> "TwinController":
    """Return existing TwinController for patient_id or create a new one."""
    if patient_id not in _patient_twins:
        _patient_twins[patient_id] = TwinController(patient_id)
    return _patient_twins[patient_id]


def list_patients() -> List[str]:
    """Return all tracked patient IDs."""
    return list(_patient_twins.keys())


def delete_twin(patient_id: str) -> bool:
    """Remove a patient's twin from registry. Returns True if existed."""
    return bool(_patient_twins.pop(patient_id, None))


# ---------------------------------------------------------------------------
# TwinController
# ---------------------------------------------------------------------------

class TwinController:
    """
    Per-patient digital twin controller.

    Workflow called on every new EEG/inference cycle:
    ┌──────────────────────────────────────────────────────────┐
    │ 1. Receive seizure_risk + optional channels/type/IMU     │
    │ 2. Resolve hypothesized brain region (RegionMapper)      │
    │ 3. Update brain state machine (BrainTwinState)           │
    │    → activate/deactivate region SVG highlights           │
    │    → transition status: stable/elevated/preictal/ictal   │
    │ 4. Evaluate alert (AlertManager)                         │
    │    → generate emergency payload if risk >= threshold     │
    │ 5. Append to risk history (for timeline sparkline)       │
    │ 6. Return unified API response dict                      │
    └──────────────────────────────────────────────────────────┘

    Parameters
    ----------
    patient_id : str
        Unique patient identifier.
    max_history : int
        Maximum risk history kept in memory (default 100).
    """

    def __init__(self, patient_id: str, max_history: int = 100) -> None:
        self.patient_id     = patient_id
        self.brain_state    = BrainTwinState(patient_id=patient_id)
        self.alert_manager  = AlertManager(patient_id=patient_id)
        self.region_mapper  = RegionMapper()
        self._risk_history: List[float] = []
        self._type_history: List[str]   = []
        self._max_history   = max_history
        self._created_at    = time.time()
        self._n_calls       = 0

    # ------------------------------------------------------------------
    # Main pipeline
    # ------------------------------------------------------------------

    def process_inference(
        self,
        seizure_risk:        float,
        seizure_type:        Optional[str]             = None,
        channel_scores:      Optional[Dict[str, float]]= None,
        dominant_channels:   Optional[List[str]]       = None,
        lat:                 Optional[float]           = None,
        lon:                 Optional[float]           = None,
        fall_detected:       bool                      = False,
        band_powers:         Optional[Dict[str, float]]= None,
        eeg_energy:          float                     = 0.0,
    ) -> dict:
        """
        Execute the full digital twin update pipeline.

        Parameters
        ----------
        seizure_risk : float [0, 1]
            P(seizure) from ResNet-CBAM ensemble (3 models averaged).
        seizure_type : str | None
            Classified seizure type: Normal, Absence, Focal Temporal, etc.
        channel_scores : dict | None
            {channel_name: importance} from SHAP / attention / GradCAM.
            Used for highest-priority region resolution.
        dominant_channels : list | None
            Active EEG channels (binary presence).
        lat, lon : float | None
            Patient GPS coordinates for emergency link.
        fall_detected : bool
            True if IMU data suggests a fall (raises alert severity).
        band_powers : dict | None
            Spectral band powers {delta, theta, alpha, beta, gamma}.
        eeg_energy : float
            Normalized EEG spectral energy.

        Returns
        -------
        dict — see module docstring for full schema.
        """
        self._n_calls += 1

        # ── Step 1: Region mapping ────────────────────────────────────────
        region_meta = self.region_mapper.resolve(
            seizure_risk      = seizure_risk,
            seizure_type      = seizure_type,
            channel_scores    = channel_scores,
            dominant_channels = dominant_channels,
        )

        # ── Step 2: Brain state update ────────────────────────────────────
        twin_snapshot = self.brain_state.update(
            seizure_risk   = seizure_risk,
            seizure_type   = seizure_type,
            region_meta    = region_meta,
            lat            = lat,
            lon            = lon,
            channel_scores = channel_scores,
        )

        # ── Step 3: Alert evaluation ──────────────────────────────────────
        alert = self.alert_manager.evaluate(
            brain_status  = self.brain_state.status,
            seizure_risk  = seizure_risk,
            seizure_type  = seizure_type,
            region_name   = region_meta.get("region_name"),
            lobe          = region_meta.get("lobe"),
            lat           = lat,
            lon           = lon,
            fall_detected = fall_detected,
        )

        # ── Step 4: History ───────────────────────────────────────────────
        self._risk_history.append(round(float(seizure_risk), 4))
        if seizure_type:
            self._type_history.append(seizure_type)
        if len(self._risk_history) > self._max_history:
            self._risk_history = self._risk_history[-self._max_history:]
        if len(self._type_history) > self._max_history:
            self._type_history = self._type_history[-self._max_history:]

        # ── Step 5: Build response ────────────────────────────────────────
        return {
            "patient_id":   self.patient_id,
            "twin":         twin_snapshot,
            "region":       region_meta,
            "alert":        alert.to_dict() if alert else None,
            "risk_history": self._risk_history[-20:],
            "seizure_type": seizure_type,
            "band_powers":  band_powers or {},
            "eeg_energy":   round(float(eeg_energy), 4),
            "n_calls":      self._n_calls,
        }

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def get_state(self) -> dict:
        """Return current twin snapshot without running new inference."""
        return self.brain_state.snapshot()

    def get_risk_history(self) -> List[float]:
        return list(self._risk_history)

    def get_alert_history(self) -> list:
        return [a.to_dict() for a in self.alert_manager.history]

    def reset(self) -> None:
        """Reset twin to stable baseline. Clear history and region activation."""
        self.brain_state.reset()
        self._risk_history.clear()
        self._type_history.clear()
        self._n_calls = 0


# ---------------------------------------------------------------------------
# EXAMPLE PAYLOADS (for documentation / tests)
# ---------------------------------------------------------------------------

EXAMPLE_INPUT = {
    "patient_id":    "patient-001",
    "seizure_risk":  0.83,
    "seizure_type":  "Focal Temporal",
    "channel_scores": {
        "T3":  0.72,
        "F7":  0.45,
        "T5":  0.31,
        "C3":  0.18,
        "Fp1": 0.09,
    },
    "lat": 33.9716,
    "lon": -6.8498,
    "fall_detected": False,
    "eeg_energy":  0.42,
    "band_powers": {
        "delta": 0.12,
        "theta": 0.38,
        "alpha": 0.25,
        "beta":  0.18,
        "gamma": 0.07,
    },
}

EXAMPLE_OUTPUT = {
    "patient_id": "patient-001",
    "twin": {
        "patient_id":    "patient-001",
        "status":        "ictal",
        "status_label":  "ICTAL — Active seizure suspected",
        "status_color":  "#ef4444",
        "seizure_risk":  0.83,
        "seizure_type":  "Focal Temporal",
        "alert_level":   "red",
        "active_region": {
            "region_name":             "Left Temporal",
            "lobe":                    "temporal",
            "side":                    "left",
            "localization_confidence": "channel_weighted",
            "disclaimer":              "⚠ HYPOTHESIZED AFFECTED ZONE ...",
            "function":                "Wernicke's area, verbal memory, auditory processing",
            "color_alert":             "#f97316",
        },
        "regions": ["... 20 region dicts ..."],
        "recent_events": [
            {
                "timestamp":    1774960000.0,
                "brain_status": "ictal",
                "seizure_risk": 0.83,
                "seizure_type": "Focal Temporal",
                "region_name":  "Left Temporal",
                "lobe":         "temporal",
                "alert_level":  "red",
                "maps_link":    "https://maps.google.com/?q=33.9716,-6.8498",
                "notes":        "ICTAL — Active seizure suspected",
            }
        ],
        "maps_link": "https://maps.google.com/?q=33.9716,-6.8498",
    },
    "region": {
        "region_name":             "Left Temporal",
        "lobe":                    "temporal",
        "side":                    "left",
        "x": -1.0, "y": -0.05, "z": 0.10,
        "highlight_intensity":     0.7167,
        "localization_confidence": "channel_weighted",
        "color_normal":            "#4c1d95",
        "color_alert":             "#f97316",
        "color_highlight":         "#ef4444",
        "function":                "Wernicke's area, verbal memory, auditory processing",
        "typical_channels":        ["T3", "F7", "T5", "C3", "Fp1"],
        "brodmann":                "BA21/BA22",
        "vote_breakdown": {
            "Left Temporal":       0.494,
            "Left Frontotemporal": 0.308,
            "Left Post-Temporal":  0.212,
            "Left Motor Cortex":   0.123,
            "Left Prefrontal":     0.062,
        },
        "seizure_type_note": "Mesial temporal lobe epilepsy (MTLE); may be R or L",
        "disclaimer": "⚠ HYPOTHESIZED AFFECTED ZONE — Academic digital twin demo only ...",
    },
    "alert": {
        "alert_id":      "patient-001-1774960000-0001",
        "patient_id":    "patient-001",
        "timestamp":     1774960000.0,
        "alert_level":   "red",
        "brain_status":  "ictal",
        "seizure_risk":  0.83,
        "seizure_type":  "Focal Temporal",
        "region_name":   "Left Temporal",
        "lobe":          "temporal",
        "lat":           33.9716,
        "lon":           -6.8498,
        "fall_detected": False,
        "message":       "[ICTAL] Seizure risk 83.0% (Focal Temporal) — Hypothesized zone: Left Temporal. DISCLAIMER: Region is estimated for demo purposes only.",
        "action":        "EMERGENCY: Alert caregiver immediately. Contact emergency services if patient unresponsive.",
        "maps_link":     "https://maps.google.com/?q=33.9716,-6.8498",
    },
    "risk_history": [0.12, 0.18, 0.31, 0.52, 0.68, 0.75, 0.83],
    "seizure_type": "Focal Temporal",
    "band_powers": {
        "delta": 0.12,
        "theta": 0.38,
        "alpha": 0.25,
        "beta":  0.18,
        "gamma": 0.07,
    },
    "eeg_energy": 0.42,
    "n_calls": 7,
}
