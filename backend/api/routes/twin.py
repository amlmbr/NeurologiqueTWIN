"""
twin.py — Brain Digital Twin API
==================================

Endpoints
---------
POST /api/v1/twin/inference
    EEG signal OR pre-computed features
    → seizure risk → hypothesized brain region → twin state → alert

GET  /api/v1/twin/state/{patient_id}
    Current twin snapshot for a patient

POST /api/v1/twin/reset/{patient_id}
    Reset brain twin to stable baseline

GET  /api/v1/twin/patients
    List all tracked patient IDs

POST /api/v1/twin/edf
    Upload CHB-MIT .edf file → per-window seizure analysis (10s windows)

GET  /api/v1/twin/schema
    Return documented example input/output payloads

DISCLAIMER
----------
All brain region outputs are HYPOTHESIZED AFFECTED ZONES for academic
digital twin demonstration. NOT clinical localization. NOT medically validated.
"""

from __future__ import annotations

import os
import tempfile
import time
from typing import Dict, List, Literal, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field

from ...twin.twin_controller import (
    get_or_create_twin, list_patients, delete_twin,
    EXAMPLE_INPUT, EXAMPLE_OUTPUT,
)
from ...twin.region_mapper import resolve_region
from ...signals.eeg_processor import EEGProcessor
from ...core.risk_scorer import ExplainableRiskScorer

router = APIRouter(prefix="/twin", tags=["Digital Brain Twin"])

_scorer = ExplainableRiskScorer()


# ============================================================================
# Pydantic request / response schemas
# ============================================================================

class InferenceRequest(BaseModel):
    """
    Input to the brain twin inference pipeline.

    Two modes:
      - Signal mode: provide raw EEG samples (signal + fs)
      - Feature mode: provide pre-computed features (eeg_energy, hr, eda)

    Channel mapping for brain region localization (optional):
      - channel_scores: dict of {channel_name: importance_score}
        → used if available from SHAP, GradCAM, or attention weights
      - dominant_channels: list of active channel names (equal weight)
    """
    patient_id:        str                          = Field("patient-demo",
                            description="Unique patient identifier")
    # Signal mode
    signal:            Optional[List[float]]        = Field(None,
                            description="Raw 1D EEG signal (samples). Min 32 samples required.")
    fs:                float                        = Field(256.0,
                            description="Sampling frequency in Hz (default: 256Hz for CHB-MIT)")
    # Feature mode (used when no raw signal is provided)
    hr:                Optional[float]              = Field(None, description="Heart rate (bpm)")
    eda:               Optional[float]              = Field(None, description="Electrodermal activity (µS)")
    eeg_energy:        Optional[float]              = Field(None, description="Normalized EEG spectral energy [0,1]")
    hrv:               Optional[float]              = Field(None, description="Heart rate variability (ms)")
    # Channel importance for region mapping
    channel_scores:    Optional[Dict[str, float]]   = Field(None,
                            description="EEG channel importance scores {channel: score}. "
                                        "Used for best-quality region resolution (Strategy 1).")
    dominant_channels: Optional[List[str]]          = Field(None,
                            description="Active EEG channels (Strategy 2 if channel_scores absent).")
    # Patient context
    lat:               Optional[float]              = Field(None, description="GPS latitude")
    lon:               Optional[float]              = Field(None, description="GPS longitude")
    fall_detected:     bool                         = Field(False,
                            description="True if IMU/accelerometer detected a fall")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "summary": "Full signal + channel scores",
                    "value": {
                        "patient_id": "patient-001",
                        "signal": [0.12, -0.05, 0.33, "... 1024 samples"],
                        "fs": 256.0,
                        "channel_scores": {"T3": 0.72, "F7": 0.45, "T5": 0.31},
                        "lat": 33.9716, "lon": -6.8498,
                        "fall_detected": False,
                    }
                },
                {
                    "summary": "Feature-only (no raw signal)",
                    "value": {
                        "patient_id": "patient-002",
                        "eeg_energy": 0.42,
                        "hr": 92.0,
                        "eda": 1.2,
                        "dominant_channels": ["T3", "T7", "F7"],
                    }
                }
            ]
        }
    }


class RegionResponse(BaseModel):
    """Hypothesized brain region resolved from model output."""
    region_name:             Optional[str]  = Field(None,  description="Named brain region (e.g. 'Left Temporal')")
    lobe:                    Optional[str]  = Field(None,  description="Brain lobe: frontal|temporal|parietal|occipital|central")
    side:                    Optional[str]  = Field(None,  description="Lateralization: left|right|midline")
    x:                       float          = Field(0.0,   description="Normalized 3D x-coordinate [-1,1] (left-right)")
    y:                       float          = Field(0.0,   description="Normalized 3D y-coordinate [-1,1] (front-back)")
    z:                       float          = Field(0.0,   description="Normalized 3D z-coordinate [-1,1] (bottom-top)")
    highlight_intensity:     float          = Field(0.0,   description="Visual highlight intensity [0,1] proportional to risk")
    localization_confidence: str            = Field("none",description="channel_weighted|channel_argmax|demo_seizure_type|fallback|none")
    color_normal:            str            = Field("#6b7280")
    color_alert:             str            = Field("#ef4444")
    color_highlight:         str            = Field("#22c55e", description="Current highlight color based on risk level")
    function:                str            = Field("", description="Neurological function of this region")
    typical_channels:        List[str]      = Field([])
    brodmann:                str            = Field("", description="Brodmann area(s) reference")
    vote_breakdown:          Dict[str,float]= Field({}, description="Channel vote distribution across regions")
    seizure_type_note:       str            = Field("")
    disclaimer:              str            = Field("⚠ HYPOTHESIZED AFFECTED ZONE — Academic digital twin demo only.")


class BrainRegionItem(BaseModel):
    name:          str
    lobe:          str
    side:          str
    x:             float
    y:             float
    z:             float
    is_active:     bool
    activation:    float
    color_normal:  str
    color_alert:   str
    color_current: str
    function:      str


class TwinEventItem(BaseModel):
    timestamp:    float
    brain_status: str
    seizure_risk: float
    seizure_type: Optional[str]
    region_name:  Optional[str]
    lobe:         Optional[str]
    alert_level:  str
    maps_link:    Optional[str]
    notes:        str


class TwinStateResponse(BaseModel):
    """Complete brain twin snapshot — frontend state contract."""
    patient_id:    str
    status:        Literal["stable","elevated","preictal","ictal","postictal"]
    status_label:  str
    status_color:  str
    seizure_risk:  float
    seizure_type:  Optional[str]
    alert_level:   Literal["info","yellow","orange","red","purple"]
    active_region: Optional[dict]   = None
    regions:       List[dict]       = []
    recent_events: List[dict]       = []
    last_updated:  float            = 0.0
    maps_link:     Optional[str]    = None


class AlertResponse(BaseModel):
    alert_id:      str
    patient_id:    str
    timestamp:     float
    alert_level:   str
    brain_status:  str
    seizure_risk:  float
    seizure_type:  Optional[str]
    region_name:   Optional[str]
    lobe:          Optional[str]
    lat:           Optional[float]
    lon:           Optional[float]
    fall_detected: bool
    message:       str
    action:        str
    maps_link:     Optional[str]


class InferenceResponse(BaseModel):
    """Complete response from POST /api/v1/twin/inference."""
    patient_id:    str
    twin:          dict           = Field(description="Full brain twin snapshot")
    region:        dict           = Field(description="Hypothesized region (see RegionResponse)")
    alert:         Optional[dict] = Field(None, description="Emergency alert (null if stable)")
    risk_history:  List[float]    = []
    seizure_type:  Optional[str]  = None
    band_powers:   Dict[str,float]= {}
    eeg_energy:    float          = 0.0
    n_calls:       int            = 0


# ============================================================================
# Internal helpers
# ============================================================================

def _classify_seizure_type(band_powers: dict, eeg_energy: float, risk: float) -> str:
    """Rule-based seizure type classifier (shared with eeg.py)."""
    d  = band_powers.get("delta", 0.0)
    th = band_powers.get("theta", 0.0)
    a  = band_powers.get("alpha", 0.0)
    b  = band_powers.get("beta",  0.0)
    g  = band_powers.get("gamma", 0.0)
    total = d + th + a + b + g + 1e-9
    d_r, th_r, a_r, b_r, g_r = d/total, th/total, a/total, b/total, g/total

    scores = {
        "Normal":         max(0, 1.0 - risk * 1.5) * (1.0 if eeg_energy < 0.15 else 0.3),
        "Absence":        th_r * 2.0 * (1 - b_r)   * (1 if risk > 0.20 else 0.1),
        "Focal Temporal": (th_r + a_r) * 1.5        * (1 if risk > 0.30 else 0.1),
        "Focal Frontal":  b_r * 2.2                 * (1 if risk > 0.30 else 0.1),
        "Myoclonic":      g_r * 2.5                 * (1 if risk > 0.40 else 0.05),
        "Tonic":          (b_r + g_r) * 1.8         * (1 if eeg_energy > 0.30 else 0.2),
        "Tonic-Clonic":   (d_r * 0.8 + g_r * 0.2) * 2.0 * (1 if eeg_energy > 0.50 else 0.1),
    }
    return max(scores, key=lambda k: scores[k])


# ============================================================================
# Endpoints
# ============================================================================

@router.post(
    "/inference",
    response_model=InferenceResponse,
    summary="EEG → Seizure detection → Brain region → Twin update → Alert",
)
def twin_inference(req: InferenceRequest):
    """
    **Full pipeline** (Phase A — academic fast version):

    1. Process raw EEG signal **or** use pre-computed features
    2. Extract EEG energy + band powers (delta/theta/alpha/beta/gamma)
    3. Run ExplainableRiskScorer → seizure_risk ∈ [0, 1]
    4. Classify seizure type (rule-based band-power classifier)
    5. Resolve **hypothesized** brain region:
       - Priority 1: channel_scores (weighted vote across 10-20 system)
       - Priority 2: dominant_channels (equal-weight)
       - Priority 3: seizure_type default (ILAE literature)
       - Fallback: Frontal Midline
    6. Update BrainTwinState (Markov state machine + region activation)
    7. Generate emergency alert if risk >= 0.40
    8. Return unified JSON response

    **DISCLAIMER**: Brain region is HYPOTHESIZED for academic demo only.
    """
    proc = EEGProcessor(fs=req.fs)
    ctrl = get_or_create_twin(req.patient_id)

    # ── Mode 1: Raw EEG signal ────────────────────────────────────────────
    if req.signal and len(req.signal) >= 32:
        raw         = np.array(req.signal, dtype=np.float32)
        processed   = proc.process(raw)
        eeg_energy  = proc.spectral_energy(processed)
        band_powers = proc.band_powers(processed)
        features    = {
            "eeg_energy": eeg_energy,
            "hr":  req.hr  or 72.0,
            "eda": req.eda or 0.35,
        }
        explanation  = _scorer.explain(features)
        seizure_risk = explanation.seizure_risk

    # ── Mode 2: Pre-computed features ────────────────────────────────────
    elif req.eeg_energy is not None:
        eeg_energy  = float(req.eeg_energy)
        band_powers = {
            "delta": 0.20, "theta": 0.15, "alpha": 0.30,
            "beta": 0.25, "gamma": 0.10,
        }
        features    = {
            "eeg_energy": eeg_energy,
            "hr":  req.hr  or 72.0,
            "eda": req.eda or 0.35,
        }
        explanation  = _scorer.explain(features)
        seizure_risk = explanation.seizure_risk

    else:
        raise HTTPException(
            422,
            "Provide either 'signal' (list of EEG samples) or 'eeg_energy' (float)"
        )

    seizure_type = _classify_seizure_type(band_powers, eeg_energy, seizure_risk)

    result = ctrl.process_inference(
        seizure_risk      = seizure_risk,
        seizure_type      = seizure_type,
        channel_scores    = req.channel_scores,
        dominant_channels = req.dominant_channels,
        lat               = req.lat,
        lon               = req.lon,
        fall_detected     = req.fall_detected,
        band_powers       = band_powers,
        eeg_energy        = eeg_energy,
    )

    return result


@router.get(
    "/state/{patient_id}",
    response_model=TwinStateResponse,
    summary="Get current brain twin state",
)
def get_twin_state(patient_id: str):
    """Return the current twin snapshot for a patient without running new inference."""
    ctrl = get_or_create_twin(patient_id)
    return ctrl.get_state()


@router.post("/reset/{patient_id}", summary="Reset brain twin to stable baseline")
def reset_twin(patient_id: str):
    """Reset a patient's brain twin to stable state and clear risk history."""
    ctrl = get_or_create_twin(patient_id)
    ctrl.reset()
    return {"patient_id": patient_id, "status": "reset", "timestamp": time.time()}


@router.get("/patients", summary="List all tracked patients")
def list_all_patients():
    """Return all patient IDs currently tracked in memory."""
    return {"patients": list_patients(), "count": len(list_patients())}


@router.get("/schema", summary="Return example input/output payloads")
def get_schema():
    """
    Return documented example input and output payloads for the twin inference endpoint.
    Useful for frontend developers and API consumers.
    """
    return {
        "description": (
            "NeurologiqueTWIN Brain Digital Twin API — example payloads. "
            "DISCLAIMER: All brain region outputs are HYPOTHESIZED AFFECTED ZONES "
            "for academic digital twin visualization. NOT clinical localization."
        ),
        "mapping_strategy": {
            "priority_1": "channel_scores — weighted vote across 10-20 EEG channels",
            "priority_2": "dominant_channels — equal-weight channel list vote",
            "priority_3": "seizure_type — ILAE-based default region (demo)",
            "fallback":   "Frontal Midline — if all other strategies fail",
        },
        "thresholds": {
            "stable":   "risk < 0.40 → no alert",
            "elevated": "risk ≥ 0.40 → yellow alert",
            "preictal": "risk ≥ 0.60 → orange alert",
            "ictal":    "risk ≥ 0.80 → red alert (EMERGENCY)",
        },
        "example_input":  EXAMPLE_INPUT,
        "example_output": EXAMPLE_OUTPUT,
    }


@router.post("/edf", summary="Upload CHB-MIT EDF → per-window analysis")
async def analyse_edf(
    file:       UploadFile = File(..., description="CHB-MIT .edf file"),
    patient_id: str        = Query("chbmit-demo"),
    window_sec: float      = Query(10.0, ge=4.0, le=60.0),
    channel:    str        = Query("auto"),
):
    """
    Upload a CHB-MIT .edf file. Analyses in `window_sec`-second windows.

    Pipeline per window:
    1. MNE read → channel selection (auto or named)
    2. Bandpass 0.5–50Hz + wavelet denoise + robust normalize
    3. EEG energy + band powers
    4. ExplainableRiskScorer → seizure_risk
    5. Seizure type classification
    6. Brain twin update → hypothesized region
    7. Return per-window results + summary

    If MNE is not installed, returns synthetic demo analysis.
    """
    if not file.filename or not file.filename.lower().endswith(".edf"):
        raise HTTPException(400, "Only .edf files are accepted")

    content = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".edf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        try:
            import mne  # type: ignore
            windows = _analyse_real_edf(tmp_path, patient_id, window_sec, channel)
            mne_available = True
        except ImportError:
            windows = _synthetic_windows(patient_id, window_sec, n=12)
            mne_available = False
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    risks = [w["seizure_risk"] for w in windows]
    return {
        "patient_id":  patient_id,
        "filename":    file.filename,
        "n_windows":   len(windows),
        "window_sec":  window_sec,
        "windows":     windows,
        "summary": {
            "max_risk":            round(max(risks, default=0), 4),
            "mean_risk":           round(sum(risks) / max(len(risks), 1), 4),
            "n_seizure_windows":   sum(1 for r in risks if r >= 0.60),
            "mne_available":       mne_available,
        },
    }


# ============================================================================
# EDF analysis helpers
# ============================================================================

def _analyse_real_edf(
    edf_path: str, patient_id: str, window_sec: float, sel_channel: str
) -> list:
    import mne  # type: ignore
    raw      = mne.io.read_raw_edf(edf_path, preload=True, verbose=False)
    fs       = raw.info["sfreq"]
    data     = raw.get_data()
    ch_names = raw.ch_names

    if sel_channel == "auto" or sel_channel not in ch_names:
        # Prefer EEG channels
        eeg_tags = ("EEG","FP","F3","F4","C3","C4","T","P","O","FZ","CZ","PZ")
        eeg_chs  = [c for c in ch_names if any(t in c.upper() for t in eeg_tags)]
        ch_idx   = ch_names.index(eeg_chs[0]) if eeg_chs else 0
        ch_name  = ch_names[ch_idx]
    else:
        ch_idx  = ch_names.index(sel_channel)
        ch_name = sel_channel

    sig  = data[ch_idx].astype(np.float32)
    w    = int(window_sec * fs)
    ctrl = get_or_create_twin(patient_id)
    proc = EEGProcessor(fs=fs)
    out  = []

    for i, start in enumerate(range(0, len(sig) - w + 1, w)):
        seg        = sig[start:start + w]
        processed  = proc.process(seg)
        eeg_energy = proc.spectral_energy(processed)
        band_pows  = proc.band_powers(processed)
        features   = {"eeg_energy": eeg_energy, "hr": 72.0, "eda": 0.35}
        exp        = _scorer.explain(features)
        risk       = exp.seizure_risk
        stype      = _classify_seizure_type(band_pows, eeg_energy, risk)
        tr         = ctrl.process_inference(
            seizure_risk = risk,
            seizure_type = stype,
            band_powers  = band_pows,
            eeg_energy   = eeg_energy,
        )
        out.append({
            "window_index": i,
            "start_sec":    round(start / fs, 2),
            "end_sec":      round((start + w) / fs, 2),
            "channel":      ch_name,
            "seizure_risk": round(float(risk), 4),
            "seizure_type": stype,
            "region_name":  tr["region"].get("region_name"),
            "lobe":         tr["region"].get("lobe"),
            "highlight_intensity": tr["region"].get("highlight_intensity", 0.0),
            "alert_level":  tr["twin"]["alert_level"],
            "band_powers":  {k: round(float(v), 4) for k, v in band_pows.items()},
        })
    return out


def _synthetic_windows(patient_id: str, window_sec: float, n: int = 12) -> list:
    """Synthetic demo when MNE is unavailable."""
    fs   = 256.0
    ctrl = get_or_create_twin(patient_id)
    proc = EEGProcessor(fs=fs)
    out  = []
    np.random.seed(42)

    for i in range(n):
        phase = i / n
        t     = np.linspace(0, window_sec, int(window_sec * fs))
        if phase < 0.30:
            sig = 8*np.sin(2*np.pi*10*t) + 3*np.sin(2*np.pi*22*t) + np.random.normal(0, 1.5, len(t))
        elif phase < 0.65:
            amp = 20 + 35 * (phase - 0.30) / 0.35
            sig = amp*np.sin(2*np.pi*14*t) + 20*np.sin(2*np.pi*3*t) + np.random.normal(0, 6, len(t))
        else:
            amp = max(5, 55 - 50 * (phase - 0.65) / 0.35)
            sig = amp*np.sin(2*np.pi*10*t) + 5*np.sin(2*np.pi*6*t) + np.random.normal(0, 2, len(t))

        processed  = proc.process(sig.astype(np.float32))
        eeg_energy = proc.spectral_energy(processed)
        band_pows  = proc.band_powers(processed)
        features   = {"eeg_energy": eeg_energy, "hr": 72.0, "eda": 0.35}
        exp        = _scorer.explain(features)
        risk       = exp.seizure_risk
        stype      = _classify_seizure_type(band_pows, eeg_energy, risk)
        tr         = ctrl.process_inference(
            seizure_risk = risk,
            seizure_type = stype,
            band_powers  = band_pows,
            eeg_energy   = eeg_energy,
        )
        out.append({
            "window_index": i,
            "start_sec":    round(i * window_sec, 2),
            "end_sec":      round((i + 1) * window_sec, 2),
            "channel":      "Synthetic-EEG",
            "seizure_risk": round(float(risk), 4),
            "seizure_type": stype,
            "region_name":  tr["region"].get("region_name"),
            "lobe":         tr["region"].get("lobe"),
            "highlight_intensity": tr["region"].get("highlight_intensity", 0.0),
            "alert_level":  tr["twin"]["alert_level"],
            "band_powers":  {k: round(float(v), 4) for k, v in band_pows.items()},
        })
    return out
