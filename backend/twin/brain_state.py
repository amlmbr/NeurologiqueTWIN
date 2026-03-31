"""
brain_state.py
==============
Digital twin state machine for a single patient's brain.

States (Markov chain):
  stable ──(risk≥0.40)──> elevated
  elevated ──(risk≥0.60)──> preictal
  preictal ──(risk≥0.80)──> ictal
  ictal ──(risk drops + grace_s)──> postictal
  postictal ──(grace expires)──> stable

Each state transition:
  - activates / deactivates brain region SVG highlights
  - sets highlight_intensity = f(seizure_risk)
  - appends a TwinEvent to the event log
  - returns a full serializable snapshot for the API

DISCLAIMER: Region activation is HYPOTHESIZED for digital twin visualization.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

from .brain_regions import BRAIN_REGIONS, BrainRegion
from .region_mapper import compute_highlight_intensity, risk_to_color


# ---------------------------------------------------------------------------
# Status enum + display metadata
# ---------------------------------------------------------------------------

class BrainStatus(str, Enum):
    STABLE    = "stable"
    ELEVATED  = "elevated"
    PREICTAL  = "preictal"
    ICTAL     = "ictal"
    POSTICTAL = "postictal"


THRESHOLDS: Dict[BrainStatus, float] = {
    BrainStatus.ICTAL:    0.80,
    BrainStatus.PREICTAL: 0.60,
    BrainStatus.ELEVATED: 0.40,
}

STATUS_LABELS: Dict[BrainStatus, str] = {
    BrainStatus.STABLE:    "Stable — No significant seizure activity",
    BrainStatus.ELEVATED:  "Elevated Risk — Increased monitoring recommended",
    BrainStatus.PREICTAL:  "Pre-ictal — Possible seizure onset, notify caregiver",
    BrainStatus.ICTAL:     "ICTAL — Active seizure suspected",
    BrainStatus.POSTICTAL: "Post-ictal — Recovery phase, patient may be confused",
}

STATUS_COLORS: Dict[BrainStatus, str] = {
    BrainStatus.STABLE:    "#22c55e",
    BrainStatus.ELEVATED:  "#eab308",
    BrainStatus.PREICTAL:  "#f97316",
    BrainStatus.ICTAL:     "#ef4444",
    BrainStatus.POSTICTAL: "#8b5cf6",
}

ALERT_LEVELS: Dict[BrainStatus, str] = {
    BrainStatus.STABLE:    "info",
    BrainStatus.ELEVATED:  "yellow",
    BrainStatus.PREICTAL:  "orange",
    BrainStatus.ICTAL:     "red",
    BrainStatus.POSTICTAL: "purple",
}


# ---------------------------------------------------------------------------
# Event log entry
# ---------------------------------------------------------------------------

@dataclass
class TwinEvent:
    """
    A single timestamped digital twin state event.
    Serializable to dict for API / frontend.
    """
    timestamp:    float
    patient_id:   str
    brain_status: BrainStatus
    seizure_risk: float
    seizure_type: Optional[str]
    region_name:  Optional[str]
    lobe:         Optional[str]
    alert_level:  str
    lat:          Optional[float]
    lon:          Optional[float]
    notes:        str = ""

    def to_dict(self) -> dict:
        return {
            "timestamp":    round(self.timestamp, 3),
            "patient_id":   self.patient_id,
            "brain_status": self.brain_status.value,
            "seizure_risk": round(self.seizure_risk, 4),
            "seizure_type": self.seizure_type,
            "region_name":  self.region_name,
            "lobe":         self.lobe,
            "alert_level":  self.alert_level,
            "lat":          self.lat,
            "lon":          self.lon,
            "maps_link":    _make_maps_link(self.lat, self.lon),
            "notes":        self.notes,
        }


def _make_maps_link(lat: Optional[float], lon: Optional[float]) -> Optional[str]:
    if lat is not None and lon is not None:
        return f"https://maps.google.com/?q={lat},{lon}"
    return None


# ---------------------------------------------------------------------------
# Brain Twin State Machine
# ---------------------------------------------------------------------------

class BrainTwinState:
    """
    Tracks the current state of one patient's brain digital twin.

    Each call to `update()`:
    1. Computes new BrainStatus from seizure_risk + postictal grace
    2. Activates the hypothesized brain region (or deactivates all)
    3. Sets highlight intensity proportional to risk
    4. Logs the event if above baseline
    5. Returns a serializable snapshot for the API

    Parameters
    ----------
    patient_id : str
    max_history : int
        Max events kept in the in-memory log.
    postictal_grace_s : float
        Seconds to remain in postictal state after ictal risk drops.
    """

    def __init__(
        self,
        patient_id:         str,
        max_history:        int   = 100,
        postictal_grace_s:  float = 30.0,
    ) -> None:
        self.patient_id         = patient_id
        self.max_history        = max_history
        self.postictal_grace_s  = postictal_grace_s

        # Current state
        self.status:             BrainStatus           = BrainStatus.STABLE
        self.seizure_risk:       float                 = 0.0
        self.seizure_type:       Optional[str]         = None
        self.active_region_meta: Optional[dict]        = None

        # Per-twin copy of regions (mutable activation state)
        self.regions: Dict[str, BrainRegion] = {
            k: BrainRegion(
                name=v.name, lobe=v.lobe, side=v.side,
                x=v.x, y=v.y, z=v.z,
                color_normal=v.color_normal,
                color_alert=v.color_alert,
                function=v.function,
            )
            for k, v in BRAIN_REGIONS.items()
        }

        # Timing
        self._last_ictal_ts:  Optional[float] = None
        self._last_update_ts: float           = time.time()

        # Event log
        self.event_log: List[TwinEvent] = []

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(
        self,
        seizure_risk:   float,
        seizure_type:   Optional[str]  = None,
        region_meta:    Optional[dict] = None,
        lat:            Optional[float]= None,
        lon:            Optional[float]= None,
        channel_scores: Optional[dict] = None,
    ) -> dict:
        """
        Update twin state from new inference outputs.

        Returns the full twin snapshot dict.
        """
        now = time.time()
        self._last_update_ts = now
        self.seizure_risk    = float(seizure_risk)
        self.seizure_type    = seizure_type

        # Compute new status
        new_status = self._compute_status(seizure_risk, now)
        self.status = new_status

        if new_status == BrainStatus.ICTAL:
            self._last_ictal_ts = now

        # Activate regions
        self._update_regions(seizure_risk, region_meta)

        # Log if non-stable
        alert_level = ALERT_LEVELS[new_status]
        if seizure_risk >= THRESHOLDS[BrainStatus.ELEVATED]:
            event = TwinEvent(
                timestamp    = now,
                patient_id   = self.patient_id,
                brain_status = new_status,
                seizure_risk = seizure_risk,
                seizure_type = seizure_type,
                region_name  = region_meta.get("region_name") if region_meta else None,
                lobe         = region_meta.get("lobe")        if region_meta else None,
                alert_level  = alert_level,
                lat          = lat,
                lon          = lon,
                notes        = STATUS_LABELS[new_status],
            )
            self.event_log.append(event)
            if len(self.event_log) > self.max_history:
                self.event_log = self.event_log[-self.max_history:]

        return self.snapshot(lat=lat, lon=lon)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _compute_status(self, risk: float, now: float) -> BrainStatus:
        """Determine current BrainStatus, respecting postictal grace period."""
        if risk >= THRESHOLDS[BrainStatus.ICTAL]:
            return BrainStatus.ICTAL

        # Check postictal grace
        if (self._last_ictal_ts is not None and
                (now - self._last_ictal_ts) < self.postictal_grace_s):
            return BrainStatus.POSTICTAL

        if risk >= THRESHOLDS[BrainStatus.PREICTAL]:
            return BrainStatus.PREICTAL
        if risk >= THRESHOLDS[BrainStatus.ELEVATED]:
            return BrainStatus.ELEVATED
        return BrainStatus.STABLE

    def _update_regions(self, risk: float, region_meta: Optional[dict]) -> None:
        """Deactivate all regions; activate the hypothesized one if risk is elevated."""
        for r in self.regions.values():
            r.deactivate()

        if not region_meta:
            return
        if risk < THRESHOLDS[BrainStatus.ELEVATED]:
            return

        region_name = region_meta.get("region_name")
        if not region_name or region_name not in self.regions:
            return

        intensity = compute_highlight_intensity(risk)
        self.regions[region_name].activate(intensity=intensity)
        self.active_region_meta = region_meta

    # ------------------------------------------------------------------
    # Snapshot
    # ------------------------------------------------------------------

    def snapshot(
        self,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> dict:
        """
        Full serializable state snapshot for the API / frontend.

        Frontend state contract
        -----------------------
        {
          "patient_id":    str,
          "status":        "stable"|"elevated"|"preictal"|"ictal"|"postictal",
          "status_label":  str,
          "status_color":  "#rrggbb",
          "seizure_risk":  float,
          "seizure_type":  str | null,
          "alert_level":   "info"|"yellow"|"orange"|"red"|"purple",
          "active_region": {
              "region_name":             str,
              "lobe":                    str,
              "side":                    str,
              "highlight_intensity":     float [0,1],
              "localization_confidence": str,
              "disclaimer":              str,
              "color_normal":            "#rrggbb",
              "color_alert":             "#rrggbb",
              "function":                str
          } | null,
          "regions": [
            {
              "name":          str,       // e.g. "Left Temporal"
              "lobe":          str,       // "temporal"
              "side":          str,       // "left" | "right" | "midline"
              "x", "y", "z":  float,     // normalized 3D coords [-1, 1]
              "is_active":     bool,      // true = highlighted
              "activation":    float,     // 0.0-1.0 highlight intensity
              "color_normal":  "#rrggbb",
              "color_alert":   "#rrggbb",
              "color_current": "#rrggbb", // interpolated
              "function":      str
            }, ...
          ],
          "recent_events": [...],
          "last_updated":  float (unix timestamp),
          "maps_link":     str | null
        }
        """
        # Determine active region from activated regions
        active_region_out = None
        for r in self.regions.values():
            if r.is_active and self.active_region_meta:
                active_region_out = {
                    **self.active_region_meta,
                    "highlight_intensity": round(r.activation, 4),
                    "color_current": r.current_color(),
                }
                break

        return {
            "patient_id":    self.patient_id,
            "status":        self.status.value,
            "status_label":  STATUS_LABELS[self.status],
            "status_color":  STATUS_COLORS[self.status],
            "seizure_risk":  round(self.seizure_risk, 4),
            "seizure_type":  self.seizure_type,
            "alert_level":   ALERT_LEVELS[self.status],
            "active_region": active_region_out,
            "regions":       [r.to_dict() for r in self.regions.values()],
            "recent_events": [e.to_dict() for e in self.event_log[-10:]],
            "last_updated":  round(self._last_update_ts, 3),
            "maps_link":     _make_maps_link(lat, lon),
        }

    def reset(self) -> None:
        """Return twin to stable baseline."""
        self.status          = BrainStatus.STABLE
        self.seizure_risk    = 0.0
        self.seizure_type    = None
        self.active_region_meta = None
        self._last_ictal_ts  = None
        for r in self.regions.values():
            r.deactivate()
