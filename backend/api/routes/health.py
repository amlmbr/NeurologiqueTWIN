"""Health check endpoints."""
from fastapi import APIRouter
from pathlib import Path
import time

router = APIRouter(tags=["Health"])

_START = time.time()
_MODEL_DIR = Path(__file__).resolve().parents[2] / "models"


@router.get("/health", summary="Liveness probe")
def health():
    models = {
        "gasf": (_MODEL_DIR / "resnet_cbam_gasf_final.h5").exists(),
        "mtf":  (_MODEL_DIR / "resnet_cbam_mtf_final.h5").exists(),
        "rp":   (_MODEL_DIR / "resnet_cbam_rp_final.h5").exists(),
    }
    return {
        "status": "ok",
        "uptime_s": round(time.time() - _START, 1),
        "models_available": models,
        "version": "1.0.0",
    }


@router.get("/", include_in_schema=False)
def root():
    return {
        "project": "NeurologiqueTWIN",
        "description": "AI-powered Neurological Digital Twin for Seizure Risk Monitoring",
        "docs": "/docs",
    }
