"""
Agent-based simulation endpoints.

GET  /api/v1/simulation/scenarios         — list available scenarios
POST /api/v1/simulation/run               — run a scenario
POST /api/v1/simulation/step              — advance an active simulation one tick
GET  /api/v1/simulation/snapshot          — get current state snapshot
POST /api/v1/simulation/reset             — reset/restart a scenario
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...simulation.scenarios import SCENARIOS, ScenarioRunner
from ...simulation.city_model import NeuroCity
from ...core.digital_twin import DigitalTwin
from ...core.risk_scorer import ExplainableRiskScorer

router = APIRouter(prefix="/simulation", tags=["Simulation"])

# ---------------------------------------------------------------------------
# In-memory active simulation state
# ---------------------------------------------------------------------------

_active_city: Optional[NeuroCity] = None
_active_scenario_id: Optional[str] = None
_runner = ScenarioRunner()


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    scenario_id: str = Field(..., description="Scenario ID from /scenarios")
    model_path:  Optional[str] = Field(None, description="Path to .h5 model (optional)")
    use_ensemble: bool = Field(False, description="Use all 3 ResNet-CBAM models")


class StepRequest(BaseModel):
    n_steps: int = Field(1, ge=1, le=100, description="Number of ticks to advance")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/scenarios", summary="List available simulation scenarios")
def list_scenarios():
    """Return all pre-defined simulation scenarios with metadata."""
    return {
        "scenarios": [
            {
                "id": sc.id,
                "name": sc.name,
                "description": sc.description,
                "n_steps": sc.n_steps,
                "n_patients": len(sc.patients),
                "n_hospitals": len(sc.hospitals),
                "risk_threshold": sc.risk_threshold,
            }
            for sc in SCENARIOS.values()
        ]
    }


@router.post("/run", summary="Run a full simulation scenario")
def run_scenario(req: RunRequest):
    """
    Executes a complete scenario synchronously and returns all events,
    per-tick snapshots, and aggregate statistics.

    For long scenarios this may take several seconds. Use /step for
    interactive tick-by-tick execution.
    """
    global _active_city, _active_scenario_id

    if req.scenario_id not in SCENARIOS:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario '{req.scenario_id}' not found. "
                   f"Available: {list(SCENARIOS)}"
        )

    runner = ScenarioRunner(
        model_path=req.model_path,
        use_ensemble=req.use_ensemble,
    )
    result = runner.run(req.scenario_id)
    _active_scenario_id = req.scenario_id
    return result


@router.post("/interactive/start", summary="Start an interactive simulation")
def start_interactive(req: RunRequest):
    """
    Initialise a scenario for tick-by-tick interactive stepping.
    Call /step to advance and /snapshot to read state.
    """
    global _active_city, _active_scenario_id

    if req.scenario_id not in SCENARIOS:
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {req.scenario_id}")

    sc = SCENARIOS[req.scenario_id]
    scorer = ExplainableRiskScorer()

    def predictor(features):
        return scorer.score(features)

    def twin_factory():
        return DigitalTwin(predictor=predictor)

    _active_city = NeuroCity(
        twin_factory=twin_factory,
        base_ems=sc.base_ems,
        hospitals=sc.hospitals,
        patients_cfg=sc.patients,
        risk_threshold=sc.risk_threshold,
        params=sc.params,
    )
    _active_scenario_id = req.scenario_id

    return {
        "status": "started",
        "scenario_id": req.scenario_id,
        "clock": 0,
        "snapshot": _active_city.snapshot(),
    }


@router.post("/interactive/step", summary="Advance interactive simulation")
def step_interactive(req: StepRequest):
    """Advance the active interactive simulation by N ticks."""
    if _active_city is None:
        raise HTTPException(
            status_code=409,
            detail="No active simulation. Call /interactive/start first."
        )
    all_events: list = []
    for _ in range(req.n_steps):
        _active_city.step()
        all_events.extend(_active_city.get_events())

    return {
        "clock": _active_city.clock,
        "events": all_events,
        "snapshot": _active_city.snapshot(),
    }


@router.get("/interactive/snapshot", summary="Get current simulation state")
def get_snapshot():
    """Return the current state of the active interactive simulation."""
    if _active_city is None:
        raise HTTPException(status_code=409, detail="No active simulation.")
    return _active_city.snapshot()


@router.post("/interactive/reset", summary="Reset the active simulation")
def reset_interactive():
    """Stop and clear the active interactive simulation."""
    global _active_city, _active_scenario_id
    _active_city = None
    _active_scenario_id = None
    return {"status": "reset"}
