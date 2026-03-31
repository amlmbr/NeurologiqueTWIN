"""
NeuroCity — Multi-Agent Simulation Model for NeurologiqueTWIN.

Orchestrates Patient, WatchTwin, Dispatcher, and Ambulance agents
within a simulated urban environment (configurable city geography).

Original source: SeizeIT2_CWGAN_RESNET_EEG/mesa_process.py (NeuroCity class)
Refactored: snapshot API, JSON-serialisable event log, configurable geography.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Tuple

try:
    from mesa import Model
    from mesa.time import RandomActivation
except ImportError:
    class Model:  # type: ignore
        def __init__(self): pass
    class RandomActivation:  # type: ignore
        def __init__(self, model):
            self.model = model
            self.agents = []
        def add(self, a): self.agents.append(a)
        def step(self):
            for a in list(self.agents): a.step()

from .agents import Ambulance, Dispatcher, Patient, WatchTwin


# ---------------------------------------------------------------------------
# Default geography — Paris metropolitan area
# ---------------------------------------------------------------------------

DEFAULT_BASE_EMS = (48.8566, 2.3522)        # SAMU Paris centre

DEFAULT_HOSPITALS = [
    ("Hôpital Lariboisière",   48.8798, 2.3553),
    ("Hôpital Pitié-Salpêtrière", 48.8387, 2.3620),
    ("Hôpital Sainte-Anne",    48.8336, 2.3364),
    ("Hôpital Bichat",         48.8993, 2.3309),
    ("Hôpital Necker",         48.8468, 2.3155),
]

DEFAULT_PATIENTS = [
    ("Patient-A", 48.8700, 2.3400),
    ("Patient-B", 48.8500, 2.3800),
    ("Patient-C", 48.8200, 2.3600),
]

DEFAULT_PARAMS: Dict[str, Any] = {
    "minutes_per_tick": 0.5,
    "preictal_start":   6,
    "ictal_start":      12,
    "postictal_start":  18,
    "end":              24,
}


# ---------------------------------------------------------------------------
# NeuroCity model
# ---------------------------------------------------------------------------

class NeuroCity(Model):
    """
    Master Mesa model for the NeurologiqueTWIN multi-agent simulation.

    Parameters
    ----------
    twin_factory : Callable
        Zero-argument factory that returns a new DigitalTwin instance.
        Called once per patient.
    base_ems : (lat, lon)
        Geographic location of the EMS dispatch centre.
    hospitals : list of (name, lat, lon)
        Available hospitals for routing.
    patients_cfg : list of (name, lat, lon)
        Patient starting locations.
    risk_threshold : float
        Risk threshold for alert triggering.
    params : dict, optional
        Simulation timing parameters (see DEFAULT_PARAMS).
    """

    def __init__(
        self,
        twin_factory: Callable,
        base_ems: Tuple[float, float] = DEFAULT_BASE_EMS,
        hospitals: Optional[List[Tuple[str, float, float]]] = None,
        patients_cfg: Optional[List[Tuple[str, float, float]]] = None,
        risk_threshold: float = 0.8,
        params: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__()

        self.params: Dict[str, Any] = {**DEFAULT_PARAMS, **(params or {})}
        self.clock: int = 0
        self.base_ems = base_ems

        self.schedule = RandomActivation(self)
        self.live: Dict[str, Any] = {"patients": {}, "ambulances": {}}
        self.events: List[Tuple[int, str, Dict]] = []

        _hospitals  = hospitals or DEFAULT_HOSPITALS
        _patients   = patients_cfg or DEFAULT_PATIENTS

        # Dispatcher
        self.dispatcher = Dispatcher(1000, self, hospitals=_hospitals)
        self.schedule.add(self.dispatcher)

        # Patients + WatchTwins
        self.twins: List[WatchTwin] = []
        uid = 1
        for name, lat, lon in _patients:
            patient = Patient(uid, self, name, lat, lon)
            self.schedule.add(patient)
            uid += 1

            twin = twin_factory()
            twin.risk_threshold = risk_threshold
            wt = WatchTwin(uid, self, twin, patient_id=patient.unique_id)
            self.schedule.add(wt)
            self.twins.append(wt)
            uid += 1

        self._next_amb_id = 5000
        self._ambulances: List[Ambulance] = []

    # ------------------------------------------------------------------
    # Step
    # ------------------------------------------------------------------

    def step(self) -> None:
        """Advance the simulation by one tick."""
        self.clock += 1
        self.schedule.step()

    def run(self, n_steps: Optional[int] = None) -> List[Dict]:
        """
        Run the simulation for n_steps ticks (or until params["end"]).

        Returns
        -------
        list of event dicts
        """
        max_steps = n_steps or self.params.get("end", 24)
        all_events: List[Dict] = []
        for _ in range(max_steps):
            self.step()
            all_events.extend(self.get_events())
        return all_events

    # ------------------------------------------------------------------
    # Ambulance factory
    # ------------------------------------------------------------------

    def create_ambulance(
        self,
        start: Tuple[float, float],
        dest: Tuple[float, float],
        target_pid: int,
        hospital: Tuple[str, float, float],
    ) -> Ambulance:
        self._next_amb_id += 1
        amb = Ambulance(
            self._next_amb_id, self, start, dest, target_pid, hospital
        )
        self._ambulances.append(amb)
        self.schedule.add(amb)
        return amb

    # ------------------------------------------------------------------
    # Event log management
    # ------------------------------------------------------------------

    def get_events(self) -> List[Dict]:
        """Drain the event queue and return JSON-serialisable dicts."""
        ev = [
            {"clock": clock, "type": etype, "data": data}
            for clock, etype, data in self.events
        ]
        self.events.clear()
        return ev

    # ------------------------------------------------------------------
    # State snapshot
    # ------------------------------------------------------------------

    def snapshot(self) -> Dict[str, Any]:
        """Return a full JSON-serialisable snapshot of the current state."""
        return {
            "clock": self.clock,
            "time_min": self.clock * self.params["minutes_per_tick"],
            "patients": dict(self.live.get("patients", {})),
            "ambulances": dict(self.live.get("ambulances", {})),
            "twin_risks": {
                wt.pid: wt.last_risk for wt in self.twins
            },
        }
