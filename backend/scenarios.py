"""
Pre-defined simulation scenarios for NeurologiqueTWIN.

Each scenario configures:
  - City geography (EMS base, hospitals, patient locations)
  - Simulation timing (when pre-ictal / ictal phases start)
  - Risk threshold and number of simulation ticks
  - A human-readable description for the UI

Scenarios are used by the /api/v1/simulation/run endpoint and the
Mesa demo in the frontend.
"""

from __future__ import annotations

import functools
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

from ..core.digital_twin import DigitalTwin
from ..core.seizure_predictor import KerasSeizurePredictor, EnsembleSeizurePredictor
from ..core.risk_scorer import ExplainableRiskScorer
from .city_model import NeuroCity, DEFAULT_BASE_EMS, DEFAULT_HOSPITALS


# ---------------------------------------------------------------------------
# Scenario definition
# ---------------------------------------------------------------------------

@dataclass
class Scenario:
    """Descriptor for a named simulation scenario."""
    id: str
    name: str
    description: str
    base_ems: Tuple[float, float]
    hospitals: List[Tuple[str, float, float]]
    patients: List[Tuple[str, float, float]]
    params: Dict[str, Any]
    risk_threshold: float = 0.75
    n_steps: int = 30


# ---------------------------------------------------------------------------
# Scenario registry
# ---------------------------------------------------------------------------

SCENARIOS: Dict[str, Scenario] = {
    "paris_single": Scenario(
        id="paris_single",
        name="Single Patient — Paris",
        description=(
            "One patient monitored in central Paris. "
            "Pre-ictal onset at step 8, ictal at step 14. "
            "Demonstrates the full alert-dispatch-arrival pipeline."
        ),
        base_ems=DEFAULT_BASE_EMS,
        hospitals=DEFAULT_HOSPITALS[:3],
        patients=[("Patient-Marie", 48.8700, 2.3500)],
        params={
            "minutes_per_tick": 0.5,
            "preictal_start": 8,
            "ictal_start": 14,
            "postictal_start": 20,
            "end": 30,
        },
        risk_threshold=0.75,
        n_steps=30,
    ),

    "paris_multi": Scenario(
        id="paris_multi",
        name="Multi-Patient — Paris Network",
        description=(
            "Three patients distributed across Paris, each with staggered "
            "seizure onsets. Tests the dispatcher's routing under load."
        ),
        base_ems=DEFAULT_BASE_EMS,
        hospitals=DEFAULT_HOSPITALS,
        patients=[
            ("Patient-A", 48.8700, 2.3400),
            ("Patient-B", 48.8500, 2.3800),
            ("Patient-C", 48.8200, 2.3600),
        ],
        params={
            "minutes_per_tick": 0.5,
            "preictal_start": 6,
            "ictal_start": 12,
            "postictal_start": 18,
            "end": 28,
        },
        risk_threshold=0.75,
        n_steps=28,
    ),

    "campus_scenario": Scenario(
        id="campus_scenario",
        name="University Campus",
        description=(
            "Scenario set on a university campus, demonstrating "
            "the system in an academic/research environment."
        ),
        base_ems=(48.7135, 2.1624),
        hospitals=[
            ("Hôpital Antoine-Béclère",  48.7598, 2.3319),
            ("Centre Hospitalier de Longjumeau", 48.6918, 2.2945),
            ("Hôpital Paul Brousse",     48.7761, 2.2261),
        ],
        patients=[
            ("Researcher-1", 48.7112, 2.1756),
            ("Student-2",    48.7095, 2.1640),
        ],
        params={
            "minutes_per_tick": 0.5,
            "preictal_start": 10,
            "ictal_start": 16,
            "postictal_start": 22,
            "end": 32,
        },
        risk_threshold=0.70,
        n_steps=32,
    ),

    "stress_test": Scenario(
        id="stress_test",
        name="Stress Test — Rapid Onset",
        description=(
            "Aggressive scenario: very short pre-ictal window (3 ticks) to "
            "test alert latency and dispatcher response time."
        ),
        base_ems=DEFAULT_BASE_EMS,
        hospitals=DEFAULT_HOSPITALS,
        patients=[
            ("Patient-X", 48.8566, 2.3522),
        ],
        params={
            "minutes_per_tick": 0.5,
            "preictal_start": 3,
            "ictal_start": 6,
            "postictal_start": 12,
            "end": 20,
        },
        risk_threshold=0.65,
        n_steps=20,
    ),
}


# ---------------------------------------------------------------------------
# Scenario runner
# ---------------------------------------------------------------------------

class ScenarioRunner:
    """
    Executes a named scenario and returns structured results.

    Parameters
    ----------
    model_path : str, optional
        Path to a single .h5 Keras model.  If None, uses the feature-based
        explainable scorer (no TensorFlow dependency needed).
    use_ensemble : bool
        If True, load all three ResNet-CBAM variants for ensemble prediction.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        use_ensemble: bool = False,
    ) -> None:
        self._model_path = model_path
        self._use_ensemble = use_ensemble

    def _make_predictor(self):
        """Build the seizure predictor (with graceful fallback)."""
        if self._use_ensemble:
            try:
                return EnsembleSeizurePredictor()
            except Exception:
                pass
        if self._model_path:
            try:
                pred = KerasSeizurePredictor(self._model_path)
                return pred
            except Exception:
                pass
        # Fallback: explainable feature scorer
        scorer = ExplainableRiskScorer()
        return scorer.score

    def _twin_factory(self) -> Callable:
        """Return a zero-argument factory for DigitalTwin instances."""
        predictor = self._make_predictor()

        def factory():
            return DigitalTwin(predictor=predictor)

        return factory

    def run(self, scenario_id: str) -> Dict[str, Any]:
        """
        Execute a scenario by ID.

        Returns
        -------
        dict with keys:
            scenario  — scenario metadata
            events    — list of simulation events
            snapshots — per-tick state snapshots
            summary   — aggregate statistics
        """
        if scenario_id not in SCENARIOS:
            raise ValueError(f"Unknown scenario: {scenario_id!r}. "
                             f"Available: {list(SCENARIOS)}")

        sc = SCENARIOS[scenario_id]
        factory = self._twin_factory()

        city = NeuroCity(
            twin_factory=factory,
            base_ems=sc.base_ems,
            hospitals=sc.hospitals,
            patients_cfg=sc.patients,
            risk_threshold=sc.risk_threshold,
            params=sc.params,
        )

        all_events: List[Dict] = []
        snapshots: List[Dict] = []

        for _ in range(sc.n_steps):
            city.step()
            all_events.extend(city.get_events())
            snapshots.append(city.snapshot())

        summary = self._summarise(all_events, snapshots)

        return {
            "scenario": {
                "id": sc.id,
                "name": sc.name,
                "description": sc.description,
                "n_steps": sc.n_steps,
                "risk_threshold": sc.risk_threshold,
            },
            "events": all_events,
            "snapshots": snapshots,
            "summary": summary,
        }

    @staticmethod
    def _summarise(events: List[Dict], snapshots: List[Dict]) -> Dict:
        alert_events  = [e for e in events if e["type"] == "alert_recv"]
        dispatch_evts = [e for e in events if e["type"] == "dispatch"]
        arrival_evts  = [e for e in events if e["type"] == "arrived_patient"]

        max_risk = max(
            (wt_risk
             for snap in snapshots
             for wt_risk in snap.get("twin_risks", {}).values()),
            default=0.0,
        )

        eta_values = [
            e["data"].get("eta_min", 0) for e in dispatch_evts
        ]
        avg_eta = sum(eta_values) / len(eta_values) if eta_values else 0.0

        return {
            "n_alerts": len(alert_events),
            "n_dispatches": len(dispatch_evts),
            "n_arrivals": len(arrival_evts),
            "max_risk": round(max_risk, 4),
            "avg_eta_min": round(avg_eta, 2),
            "total_ticks": len(snapshots),
        }
