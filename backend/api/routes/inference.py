"""
Seizure risk inference endpoints.

POST /api/v1/predict         — scalar features → risk score + explanation
POST /api/v1/predict/image   — base64 RGB image → risk score
GET  /api/v1/predict/history — return rolling risk history (in-memory)
"""

from __future__ import annotations

import base64
import io
from collections import deque
from typing import Any, Deque, Dict, List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...core.digital_twin import DigitalTwin, default_location
from ...core.event_bus import EventBus
from ...core.risk_scorer import ExplainableRiskScorer
from ...core.seizure_predictor import KerasSeizurePredictor, EnsembleSeizurePredictor, MODEL_PATHS

router = APIRouter(prefix="/predict", tags=["Inference"])

# ---------------------------------------------------------------------------
# Singletons (lazy-initialised on first request)
# ---------------------------------------------------------------------------

_scorer = ExplainableRiskScorer()
_bus    = EventBus()
_twin: Optional[DigitalTwin] = None
_history: Deque[Dict] = deque(maxlen=200)


def _get_twin() -> DigitalTwin:
    global _twin
    if _twin is None:
        # Use explainable scorer as predictor (no TF dependency at startup)
        _twin = DigitalTwin(predictor=_scorer.score, bus=_bus)
    return _twin


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class FeaturesRequest(BaseModel):
    hr:          float = Field(72.0,  ge=20, le=250, description="Heart rate (bpm)")
    eda:         float = Field(0.35,  ge=0,  le=20,  description="Skin conductance (µS)")
    eeg_energy:  float = Field(0.08,  ge=0,  le=1,   description="Normalised EEG spectral energy")
    hrv:         Optional[float] = Field(None, description="HRV-RMSSD (ms)")
    steps:       Optional[float] = Field(None, description="Steps per hour")
    stress:      Optional[float] = Field(None, description="Stress index 0–1")
    tremor:      Optional[float] = Field(None, description="Tremor index 0–1")
    lat:         Optional[float] = Field(None, description="Patient latitude")
    lon:         Optional[float] = Field(None, description="Patient longitude")


class ImageRequest(BaseModel):
    image_b64: str = Field(..., description="Base64-encoded RGB PNG image (64×64)")
    transform: str = Field("rgb", description="Transform type: gasf | mtf | rp | rgb")
    hr:  float = Field(72.0)
    eda: float = Field(0.35)
    eeg_energy: float = Field(0.08)


class RiskResponse(BaseModel):
    seizure_risk: float
    risk_level:   str
    dominant_driver: str
    clinical_note:   str
    state:       str
    trend:       float
    maps_link:   str
    explanation: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=RiskResponse, summary="Predict seizure risk from physiological features")
def predict_features(req: FeaturesRequest):
    """
    Accepts multimodal physiological features and returns an explainable
    seizure risk score with per-feature attribution.
    """
    features: Dict[str, float] = {
        "hr":         req.hr,
        "eda":        req.eda,
        "eeg_energy": req.eeg_energy,
    }
    if req.hrv    is not None: features["hrv"]    = req.hrv
    if req.steps  is not None: features["steps"]  = req.steps
    if req.stress is not None: features["stress"] = req.stress
    if req.tremor is not None: features["tremor"] = req.tremor

    loc = ({"lat": req.lat, "lon": req.lon}
           if req.lat is not None and req.lon is not None
           else default_location())

    twin = _get_twin()
    twin_result = twin.step(features, loc)

    explanation = _scorer.explain(features)

    record = {
        "seizure_risk": twin_result["seizure_risk"],
        "risk_level":   explanation.risk_level,
        "dominant_driver": explanation.dominant_driver,
        "clinical_note":   explanation.clinical_note,
        "state":    twin_result["state"],
        "trend":    twin_result["trend"],
        "maps_link": twin_result["maps_link"],
        "explanation": _scorer.to_dict(explanation)["features"],
        "features": features,
        "timestamp": twin_result["timestamp"],
    }
    _history.append(record)

    return RiskResponse(
        seizure_risk=record["seizure_risk"],
        risk_level=record["risk_level"],
        dominant_driver=record["dominant_driver"],
        clinical_note=record["clinical_note"],
        state=record["state"],
        trend=record["trend"],
        maps_link=record["maps_link"],
        explanation=record["explanation"],
    )


_IMAGE_SIZE = 64   # ResNet-CBAM input resolution


@router.post("/image", summary="Predict seizure risk from a time-series image")
def predict_image(req: ImageRequest):
    """
    Accepts a base64-encoded 64×64 RGB image (GASF/MTF/RP) and runs
    the ResNet-CBAM model if available; falls back to feature scorer.
    """
    # Decode image
    try:
        img_bytes = base64.b64decode(req.image_b64)
        arr = np.frombuffer(img_bytes, dtype=np.float32)
        if arr.size == _IMAGE_SIZE * _IMAGE_SIZE * 3:
            img = arr.reshape(_IMAGE_SIZE, _IMAGE_SIZE, 3)
        else:
            raise ValueError(f"Expected {_IMAGE_SIZE}×{_IMAGE_SIZE}×3 float32 array, got {arr.size} elements")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid image payload: {exc}")

    features = {
        "rgb":        img,
        "hr":         req.hr,
        "eda":        req.eda,
        "eeg_energy": req.eeg_energy,
    }

    # Try model-based prediction
    risk = None
    for variant, path in MODEL_PATHS.items():
        if path.exists():
            try:
                pred = KerasSeizurePredictor(path)
                risk = pred(features)
                break
            except Exception:
                continue

    # Fallback
    if risk is None:
        risk = _scorer.score(features)

    explanation = _scorer.explain(features)
    return {
        "seizure_risk": risk,
        "risk_level":   explanation.risk_level,
        "model_used":   variant if risk is not None else "feature_fallback",
        "explanation":  _scorer.to_dict(explanation)["features"],
    }


@router.get("/history", summary="Return rolling inference history")
def get_history(limit: int = 50):
    """Return the last N inference results (in-memory, resets on restart)."""
    records = list(_history)[-limit:]
    # Remove non-serialisable numpy arrays
    clean = []
    for r in records:
        c = {k: v for k, v in r.items() if k != "features"}
        clean.append(c)
    return {"count": len(clean), "history": clean}


@router.delete("/history", summary="Clear inference history")
def clear_history():
    _history.clear()
    return {"status": "cleared"}
