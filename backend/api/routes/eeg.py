"""
EEG signal processing endpoints.

POST /api/v1/eeg/process      — preprocess a raw EEG segment
POST /api/v1/eeg/transform    — convert preprocessed EEG to image (GASF/MTF/RP)
POST /api/v1/eeg/features     — extract spectral features from an EEG epoch
POST /api/v1/eeg/full-pipeline — process + transform + predict in one call
"""

from __future__ import annotations

import base64
from typing import Dict, List, Literal, Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...signals.eeg_processor import EEGProcessor
from ...signals.transforms import TimeSeriesTransformer
from ...core.risk_scorer import ExplainableRiskScorer

router = APIRouter(prefix="/eeg", tags=["EEG Processing"])

_processor   = EEGProcessor()
_transformer = TimeSeriesTransformer()
_scorer      = ExplainableRiskScorer()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class RawEEGRequest(BaseModel):
    signal: List[float] = Field(..., description="Raw EEG samples")
    fs: float = Field(256.0, description="Sampling frequency (Hz)")
    lowcut: float = Field(0.5,  description="Band-pass low cutoff (Hz)")
    highcut: float = Field(50.0, description="Band-pass high cutoff (Hz)")


class TransformRequest(BaseModel):
    signal: List[float] = Field(..., description="Preprocessed (or raw) EEG epoch")
    method: str = Field("rgb", description="Transform: gasf | mtf | rp | rgb")
    image_size: int = Field(64, description="Output image resolution")
    return_base64: bool = Field(True, description="Encode result as base64 float32")


class FullPipelineRequest(BaseModel):
    signal: List[float]
    fs: float = Field(256.0)
    method: str = Field("rgb")
    hr:  Optional[float] = Field(None)
    eda: Optional[float] = Field(None)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/process", summary="Preprocess a raw EEG segment")
def process_eeg(req: RawEEGRequest):
    """
    Band-pass filter → notch filter → wavelet denoise → robust normalise.
    Returns the preprocessed signal as a float32 array.
    """
    proc = EEGProcessor(
        fs=req.fs,
        lowcut=req.lowcut,
        highcut=req.highcut,
    )
    raw = np.array(req.signal, dtype=np.float32)
    if len(raw) < 16:
        raise HTTPException(status_code=422, detail="Signal too short (min 16 samples)")

    processed = proc.process(raw)
    return {
        "n_samples": len(processed),
        "fs": req.fs,
        "signal": processed.tolist(),
        "stats": {
            "min":  float(processed.min()),
            "max":  float(processed.max()),
            "mean": float(processed.mean()),
            "std":  float(processed.std()),
        },
    }


@router.post("/transform", summary="Convert EEG epoch to 2D image")
def transform_eeg(req: TransformRequest):
    """
    Applies the specified time-series → image transform (GASF/MTF/RP/RGB).
    Returns the image as a base64-encoded float32 array or nested list.
    """
    signal = np.array(req.signal, dtype=np.float32)
    if len(signal) < 16:
        raise HTTPException(status_code=422, detail="Signal too short (min 16 samples)")

    trf = TimeSeriesTransformer(image_size=req.image_size)

    valid_methods = ("gasf", "mtf", "rp", "rgb")
    if req.method not in valid_methods:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid method '{req.method}'. Choose from {valid_methods}"
        )

    img = trf.transform(signal, method=req.method)  # type: ignore

    result: Dict = {
        "method": req.method,
        "shape": list(img.shape),
        "dtype": "float32",
    }

    if req.return_base64:
        result["image_b64"] = base64.b64encode(img.astype(np.float32).tobytes()).decode()
    else:
        result["image"] = img.tolist()

    return result


@router.post("/features", summary="Extract spectral features from an EEG epoch")
def extract_features(req: RawEEGRequest):
    """
    Extracts band powers (delta/theta/alpha/beta/gamma) and the normalised
    EEG spectral energy used as a digital twin input feature.
    """
    proc = EEGProcessor(fs=req.fs)
    signal = np.array(req.signal, dtype=np.float32)
    processed = proc.process(signal)
    return {
        "eeg_energy":  proc.spectral_energy(processed),
        "band_powers": proc.band_powers(processed),
        "n_samples":   len(processed),
        "fs":          req.fs,
    }


@router.post("/full-pipeline", summary="EEG process → transform → risk predict")
def full_pipeline(req: FullPipelineRequest):
    """
    Complete EEG pipeline:
    1. Preprocess raw signal
    2. Transform to RGB image (GASF+MTF+RP fusion)
    3. Extract spectral features
    4. Run explainable risk scorer
    Returns all intermediate outputs plus the final risk score.
    """
    proc = EEGProcessor(fs=req.fs)
    signal = np.array(req.signal, dtype=np.float32)
    if len(signal) < 32:
        raise HTTPException(status_code=422, detail="Signal too short (min 32 samples)")

    processed   = proc.process(signal)
    eeg_energy  = proc.spectral_energy(processed)
    band_powers = proc.band_powers(processed)

    trf = TimeSeriesTransformer()
    img = trf.transform(processed, method=req.method)  # type: ignore

    features = {
        "eeg_energy": eeg_energy,
        "hr":  req.hr  or 72.0,
        "eda": req.eda or 0.35,
    }
    explanation = _scorer.explain(features)

    return {
        "eeg_energy":  eeg_energy,
        "band_powers": band_powers,
        "seizure_type": _classify_seizure_type(band_powers, eeg_energy, explanation.seizure_risk),
        "image": {
            "method": req.method,
            "shape": list(img.shape),
            "image_b64": base64.b64encode(img.astype(np.float32).tobytes()).decode(),
        },
        "risk": {
            "seizure_risk":   explanation.seizure_risk,
            "risk_level":     explanation.risk_level,
            "dominant_driver": explanation.dominant_driver,
            "clinical_note":   explanation.clinical_note,
        },
        "explanation": _scorer.to_dict(explanation)["features"],
    }


def _classify_seizure_type(band_powers: Dict, eeg_energy: float, risk: float) -> Dict:
    """
    Rule-based seizure type classifier using EEG band powers.
    Returns the most likely seizure type with confidence and description.
    """
    d  = band_powers.get("delta", 0.0)
    th = band_powers.get("theta", 0.0)
    a  = band_powers.get("alpha", 0.0)
    b  = band_powers.get("beta",  0.0)
    g  = band_powers.get("gamma", 0.0)
    total = d + th + a + b + g + 1e-9

    d_r, th_r, a_r, b_r, g_r = d/total, th/total, a/total, b/total, g/total

    # Scoring rules calibrated from EEG literature
    scores = {
        "Normal":           max(0, 1.0 - risk * 1.5) * (1.0 if eeg_energy < 0.15 else 0.3),
        "Absence":          th_r * 2.0 * (1 - b_r) * (1 if risk > 0.2 else 0.1),
        "Focal Temporal":   (th_r + a_r) * 1.5 * (1 if risk > 0.3 else 0.1),
        "Focal Frontal":    b_r * 2.2 * (1 if risk > 0.3 else 0.1),
        "Myoclonic":        g_r * 2.5 * (1 if risk > 0.4 else 0.05),
        "Tonic":            (b_r + g_r) * 1.8 * (1 if eeg_energy > 0.3 else 0.2),
        "Tonic-Clonic":     (d_r * 0.8 + g_r * 0.2) * 2.0 * (1 if eeg_energy > 0.5 else 0.1),
    }

    best = max(scores, key=lambda k: scores[k])
    total_score = sum(scores.values()) + 1e-9
    confidence = scores[best] / total_score

    descriptions = {
        "Normal":         "No ictal activity detected. EEG within normal range.",
        "Absence":        "Theta-dominant pattern consistent with 3Hz spike-wave (absence / petit-mal).",
        "Focal Temporal": "Elevated theta/alpha pattern consistent with focal temporal lobe activity.",
        "Focal Frontal":  "Elevated beta activity consistent with focal frontal discharge.",
        "Myoclonic":      "Gamma-dominant fast activity consistent with myoclonic jerks.",
        "Tonic":          "Beta/gamma-dominant pattern consistent with tonic stiffening phase.",
        "Tonic-Clonic":   "Delta-dominant high-energy pattern consistent with tonic-clonic (grand-mal) event.",
    }

    return {
        "type": best,
        "confidence": round(float(confidence), 3),
        "description": descriptions[best],
        "scores": {k: round(float(v / total_score), 3) for k, v in scores.items()},
    }
