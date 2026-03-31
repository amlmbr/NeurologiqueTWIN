"""
Mesa Agent definitions for the NeurologiqueTWIN multi-agent simulation.

Four agent types model the full emergency response pipeline:
  Patient    — simulates physiological state progression (stable → pre-ictal → ictal)
  WatchTwin  — monitors the patient via the DigitalTwin engine
  Dispatcher — routes alerts to the nearest hospital and dispatches EMS
  Ambulance  — simulates two-phase EMS routing (to patient → to hospital)

Geographic routing uses the Haversine formula for accurate km distances.

Original source: SeizeIT2_CWGAN_RESNET_EEG/mesa_process.py
Refactored: cleaner state machine, postictal phase, typed annotations.
"""

from __future__ import annotations

import math
import random
from typing import Any, Dict, List, Optional, Tuple

try:
    from mesa import Agent, Model
    from mesa.time import RandomActivation
except ImportError:
    class Agent:  # type: ignore
        def __init__(self, unique_id, model):
            self.unique_id = unique_id
            self.model = model
        def step(self): pass

    class Model:  # type: ignore
        def __init__(self): pass

    class RandomActivation:  # type: ignore
        def __init__(self, model):
            self.model = model
            self.agents: List = []
        def add(self, a): self.agents.append(a)
        def step(self):
            for a in list(self.agents): a.step()


# ---------------------------------------------------------------------------
# Geographic utilities (duplicated here for agent module independence)
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def interp_geo(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
    t: float,
) -> Tuple[float, float]:
    """Linear geographic interpolation at fraction t ∈ [0, 1]."""
    return lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t


# ---------------------------------------------------------------------------
# Patient agent
# ---------------------------------------------------------------------------

class Patient(Agent):
    """
    Simulates a patient's physiological state over time.

    State machine:
        stable → preictal → ictal → postictal → stable (recovered)

    Vital dynamics (from SeizeIT2 calibration data):
        Baseline: HR ~ N(72, 3) bpm,  EDA ~ N(0.32, 0.03) µS,  EEG = 0.08
        Pre-ictal: HR +14, EDA +0.18, EEG +0.35 (added to baseline)
        Ictal:     HR +20, EDA +0.30, EEG +0.55
        Postictal: gradual recovery over ~6 ticks
    """

    STATES = ("stable", "preictal", "ictal", "postictal")

    def __init__(
        self,
        unique_id: int,
        model: Any,
        name: str,
        lat: float,
        lon: float,
    ) -> None:
        super().__init__(unique_id, model)
        self.name = name
        self.lat = lat
        self.lon = lon

        # Physiological baseline (patient-specific)
        self.hr_base  = random.gauss(72.0, 3.0)
        self.eda_base = random.gauss(0.32, 0.03)
        self.eeg_base = 0.08

        self.state: str = "stable"
        self.t: int = 0

    def step(self) -> None:
        self.t += 1
        params = self.model.params
        pre_t = params.get("preictal_start", 6)
        ict_t = params.get("ictal_start", 12)
        pos_t = params.get("postictal_start", 18)
        end_t = params.get("end", 24)

        if self.t >= end_t:
            self.state = "stable"
        elif self.t >= pos_t:
            self.state = "postictal"
        elif self.t >= ict_t:
            self.state = "ictal"
        elif self.t >= pre_t:
            self.state = "preictal"
        else:
            self.state = "stable"

        hr  = self.hr_base
        eda = self.eda_base
        eeg = self.eeg_base

        if self.state == "preictal":
            hr  += 14.0 + random.gauss(0, 2)
            eda += 0.18 + random.gauss(0, 0.03)
            eeg += 0.35
        elif self.state == "ictal":
            hr  += 20.0 + random.gauss(0, 3)
            eda += 0.30 + random.gauss(0, 0.05)
            eeg += 0.55
        elif self.state == "postictal":
            # Gradual recovery
            recovery = max(0.0, 1.0 - (self.t - params.get("postictal_start", 18)) / 6.0)
            hr  += 8.0 * recovery
            eda += 0.10 * recovery
            eeg += 0.15 * recovery

        self.model.live.setdefault("patients", {})[self.unique_id] = {
            "name": self.name,
            "lat": self.lat,
            "lon": self.lon,
            "state": self.state,
            "HR":     float(hr),
            "EDA":    float(eda),
            "EEG_EN": float(min(1.0, eeg)),
            "t":      self.t,
        }


# ---------------------------------------------------------------------------
# WatchTwin agent
# ---------------------------------------------------------------------------

class WatchTwin(Agent):
    """
    Monitors a patient agent via the DigitalTwin engine.

    Reads the patient's current vitals from model.live, feeds them to the
    digital twin predictor, and forwards alerts to the Dispatcher.
    """

    def __init__(
        self,
        unique_id: int,
        model: Any,
        twin,               # DigitalTwin instance
        patient_id: int,
    ) -> None:
        super().__init__(unique_id, model)
        self.twin = twin
        self.pid = patient_id
        self.last_risk: float = 0.0

    def step(self) -> None:
        p = self.model.live.get("patients", {}).get(self.pid)
        if p is None:
            return

        features = {
            "hr":         p["HR"],
            "eda":        p["EDA"],
            "eeg_energy": p["EEG_EN"],
            "steps":      0.25,
        }
        location = {"lat": p["lat"], "lon": p["lon"]}
        result = self.twin.step(features, location)
        self.last_risk = float(result["seizure_risk"])

        self.model.events.append(
            (self.model.clock, "risk", {"pid": self.pid, "risk": self.last_risk})
        )

        if self.last_risk >= self.twin.risk_threshold:
            self.model.dispatcher.receive_alert(
                self.pid, p["lat"], p["lon"], self.last_risk
            )


# ---------------------------------------------------------------------------
# Dispatcher agent
# ---------------------------------------------------------------------------

class Dispatcher(Agent):
    """
    Receives seizure alerts and routes the nearest ambulance to the patient.

    Uses the Haversine formula to select the closest hospital from a
    pre-configured list, then creates an Ambulance agent.
    """

    def __init__(
        self,
        unique_id: int,
        model: Any,
        hospitals: List[Tuple[str, float, float]],
    ) -> None:
        super().__init__(unique_id, model)
        self.hospitals = hospitals  # [(name, lat, lon), ...]
        self.alert_buffer: List[Dict] = []

    def receive_alert(self, pid: int, lat: float, lon: float, risk: float) -> None:
        self.alert_buffer.append({"pid": pid, "lat": lat, "lon": lon, "risk": risk})
        self.model.events.append(
            (self.model.clock, "alert_recv", {"pid": pid, "risk": risk})
        )

    def step(self) -> None:
        while self.alert_buffer:
            alert = self.alert_buffer.pop(0)
            nearest = self._nearest_hospital(alert["lat"], alert["lon"])
            amb = self.model.create_ambulance(
                start=self.model.base_ems,
                dest=(alert["lat"], alert["lon"]),
                target_pid=alert["pid"],
                hospital=nearest,
            )
            self.model.events.append(
                (self.model.clock, "dispatch", {
                    "pid": alert["pid"],
                    "hospital": nearest[0],
                    "eta_min": amb.eta_min,
                })
            )

    def _nearest_hospital(
        self, lat: float, lon: float
    ) -> Tuple[str, float, float]:
        best = min(
            self.hospitals,
            key=lambda h: haversine_km(lat, lon, h[1], h[2]),
        )
        return best


# ---------------------------------------------------------------------------
# Ambulance agent
# ---------------------------------------------------------------------------

class Ambulance(Agent):
    """
    Two-phase EMS routing agent.

    Phase 1: EMS base → patient location
    Phase 2: patient location → target hospital

    Speed: 40 km/h (urban emergency estimate).
    Reports arrival events to model.events on phase transitions.
    """

    SPEED_KMH = 40.0

    def __init__(
        self,
        unique_id: int,
        model: Any,
        start: Tuple[float, float],
        dest: Tuple[float, float],
        target_pid: int,
        hospital: Tuple[str, float, float],
    ) -> None:
        super().__init__(unique_id, model)
        self.slat, self.slon = start
        self.dlat, self.dlon = dest
        self.hname, self.hlat, self.hlon = hospital
        self.target_pid = target_pid

        self.progress: float = 0.0
        self.phase: str = "to_patient"

        dist = haversine_km(self.slat, self.slon, self.dlat, self.dlon)
        self.eta_min: float = max(0.5, dist / self.SPEED_KMH * 60.0)
        self.lat, self.lon = self.slat, self.slon

    def step(self) -> None:
        if self.phase == "done":
            return

        step_min = self.model.params.get("minutes_per_tick", 0.5)

        if self.phase == "to_patient":
            self.progress = min(1.0, self.progress + step_min / self.eta_min)
            self.lat, self.lon = interp_geo(
                self.slat, self.slon, self.dlat, self.dlon, self.progress
            )
            if self.progress >= 1.0:
                self.model.events.append(
                    (self.model.clock, "arrived_patient", {"pid": self.target_pid})
                )
                # Transition to phase 2
                self.slat, self.slon = self.lat, self.lon
                self.dlat, self.dlon = self.hlat, self.hlon
                self.progress = 0.0
                dist = haversine_km(self.slat, self.slon, self.dlat, self.dlon)
                self.eta_min = max(2.0, dist / self.SPEED_KMH * 60.0)
                self.phase = "to_hospital"

        else:  # to_hospital
            self.progress = min(1.0, self.progress + step_min / self.eta_min)
            self.lat, self.lon = interp_geo(
                self.slat, self.slon, self.dlat, self.dlon, self.progress
            )
            if self.progress >= 1.0:
                self.phase = "done"
                self.model.events.append(
                    (self.model.clock, "arrived_hospital", {
                        "pid": self.target_pid,
                        "hospital": self.hname,
                    })
                )

        self.model.live.setdefault("ambulances", {})[self.unique_id] = {
            "lat": self.lat,
            "lon": self.lon,
            "phase": self.phase,
            "target": self.target_pid,
            "progress": self.progress,
        }
