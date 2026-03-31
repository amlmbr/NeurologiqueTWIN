"""
alert_manager.py
================
Generates structured emergency alerts when seizure risk crosses thresholds.

Alert levels:
  yellow → risk >= 0.40  (elevated)
  orange → risk >= 0.60  (pre-ictal)
  red    → risk >= 0.80  (ictal / critical)
  purple → post-ictal recovery
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from .brain_state import BrainStatus, STATUS_LABELS


# ---------------------------------------------------------------------------
# Alert dataclass
# ---------------------------------------------------------------------------

@dataclass
class SeizureAlert:
    alert_id:        str
    patient_id:      str
    timestamp:       float
    alert_level:     str      # "yellow" | "orange" | "red" | "purple"
    brain_status:    str
    seizure_risk:    float
    seizure_type:    Optional[str]
    region_name:     Optional[str]
    lobe:            Optional[str]
    lat:             Optional[float]
    lon:             Optional[float]
    fall_detected:   bool
    message:         str
    action:          str
    maps_link:       Optional[str]

    def to_dict(self) -> dict:
        return {
            "alert_id":     self.alert_id,
            "patient_id":   self.patient_id,
            "timestamp":    self.timestamp,
            "alert_level":  self.alert_level,
            "brain_status": self.brain_status,
            "seizure_risk": round(self.seizure_risk, 4),
            "seizure_type": self.seizure_type,
            "region_name":  self.region_name,
            "lobe":         self.lobe,
            "lat":          self.lat,
            "lon":          self.lon,
            "fall_detected":self.fall_detected,
            "message":      self.message,
            "action":       self.action,
            "maps_link":    self.maps_link,
        }


# ---------------------------------------------------------------------------
# Alert Manager
# ---------------------------------------------------------------------------

class AlertManager:
    """
    Generates and stores alerts for a patient's brain twin.

    Integration:
    - Call ``evaluate(...)`` after every inference update.
    - It returns a SeizureAlert if one should be raised, else None.
    - Alerts are stored in ``self.history``.
    """

    LEVEL_MAP = {
        BrainStatus.ICTAL:      "red",
        BrainStatus.PREICTAL:   "orange",
        BrainStatus.ELEVATED:   "yellow",
        BrainStatus.POSTICTAL:  "purple",
        BrainStatus.STABLE:     "info",
    }

    def __init__(self, patient_id: str, max_history: int = 50) -> None:
        self.patient_id  = patient_id
        self.max_history = max_history
        self.history: list[SeizureAlert] = []
        self._alert_counter = 0

    def evaluate(
        self,
        brain_status:    BrainStatus,
        seizure_risk:    float,
        seizure_type:    Optional[str]  = None,
        region_name:     Optional[str]  = None,
        lobe:            Optional[str]  = None,
        lat:             Optional[float]= None,
        lon:             Optional[float]= None,
        fall_detected:   bool           = False,
    ) -> Optional[SeizureAlert]:
        """
        Evaluate current state and generate an alert if warranted.
        Returns None for STABLE (risk < 0.40) states.
        """
        if brain_status == BrainStatus.STABLE:
            return None

        level   = self.LEVEL_MAP.get(brain_status, "info")
        message = self._build_message(brain_status, seizure_risk, seizure_type, region_name, fall_detected)
        action  = self._recommended_action(brain_status, fall_detected)

        self._alert_counter += 1
        alert_id = f"{self.patient_id}-{int(time.time())}-{self._alert_counter:04d}"

        maps_link = None
        if lat is not None and lon is not None:
            maps_link = f"https://maps.google.com/?q={lat},{lon}"

        alert = SeizureAlert(
            alert_id     = alert_id,
            patient_id   = self.patient_id,
            timestamp    = time.time(),
            alert_level  = level,
            brain_status = brain_status.value,
            seizure_risk = seizure_risk,
            seizure_type = seizure_type,
            region_name  = region_name,
            lobe         = lobe,
            lat          = lat,
            lon          = lon,
            fall_detected= fall_detected,
            message      = message,
            action       = action,
            maps_link    = maps_link,
        )

        self.history.append(alert)
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]

        return alert

    def _build_message(
        self,
        status: BrainStatus,
        risk: float,
        seizure_type: Optional[str],
        region: Optional[str],
        fall: bool,
    ) -> str:
        risk_pct = f"{risk*100:.1f}%"
        type_str = f" ({seizure_type})" if seizure_type and seizure_type != "Normal" else ""
        region_str = f" — Hypothesized zone: {region}" if region else ""
        fall_str   = " ⚠️ FALL DETECTED" if fall else ""
        return (
            f"[{status.value.upper()}] Seizure risk {risk_pct}{type_str}{region_str}{fall_str}. "
            f"DISCLAIMER: Region is estimated for demo purposes only."
        )

    def _recommended_action(self, status: BrainStatus, fall: bool) -> str:
        if status == BrainStatus.ICTAL or fall:
            return "EMERGENCY: Alert caregiver immediately. Contact emergency services if patient unresponsive."
        if status == BrainStatus.PREICTAL:
            return "HIGH ALERT: Notify caregiver. Prepare for possible seizure. Move patient to safe position."
        if status == BrainStatus.ELEVATED:
            return "MONITOR: Increase observation frequency. Log activity."
        if status == BrainStatus.POSTICTAL:
            return "RECOVERY: Keep patient safe. Do not restrain. Monitor breathing."
        return "Continue monitoring."

    def latest_alert(self) -> Optional[SeizureAlert]:
        return self.history[-1] if self.history else None
