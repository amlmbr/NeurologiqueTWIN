"""
NLP Endpoints — POST /api/v1/nlp/analyze
"""
from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from ...ml.nlp_analyzer import ClinicalNLPAnalyzer

router = APIRouter(prefix="/nlp", tags=["Clinical NLP"])

_nlp = ClinicalNLPAnalyzer(use_transformer=False)


class NLPRequest(BaseModel):
    text: str = Field(..., description="Clinical note, EEG report, or patient diary")
    use_transformer: bool = Field(False, description="Use HuggingFace model (requires internet)")


class BatchNLPRequest(BaseModel):
    texts: List[str]


@router.post("/analyze", summary="Analyze clinical text for seizure risk")
def analyze(req: NLPRequest):
    """
    Processes free-text clinical notes to extract seizure risk signals.

    Uses TF-IDF keyword analysis (fast, offline) with optional DistilBERT
    zero-shot classification when use_transformer=true.

    Example input:
        "Patient reports visual aura, tonic-clonic episode lasting 2 min,
         post-ictal confusion for 30 min. Medication compliance poor."

    Example output:
        { "label": "high_seizure_risk", "confidence": 0.87, "keywords": ["aura", "tonic-clonic"] }
    """
    return _nlp.analyze(req.text)


@router.post("/batch", summary="Analyze multiple clinical notes")
def batch_analyze(req: BatchNLPRequest):
    results = _nlp.batch_analyze(req.texts)
    return {"count": len(results), "results": results}


@router.get("/fine-tuning-guide", summary="Fine-tuning pipeline documentation")
def fine_tuning_guide():
    """
    Returns documentation on how to fine-tune the NLP model on real
    clinical data for production deployment.
    """
    return ClinicalNLPAnalyzer.fine_tuning_guide()


@router.get("/example-notes", summary="Example clinical notes for testing")
def example_notes():
    """Return labelled example clinical notes for API testing."""
    return {
        "high_risk_examples": [
            "Patient had a breakthrough seizure this morning. Tonic-clonic episode, 3 minutes.",
            "EEG shows spike-wave discharges at 3 Hz. Increased seizure frequency this week.",
            "Patient reports visual aura and déjà vu episodes. Post-ictal confusion noted.",
            "Status epilepticus episode last week. Medication non-compliance confirmed.",
        ],
        "low_risk_examples": [
            "Patient stable on current medication. Seizure-free for 8 months.",
            "Follow-up visit: normal EEG, good medication compliance, no complaints.",
            "Routine check: neurological exam normal, no seizure activity reported.",
            "Patient doing well, returned to work, driving restriction lifted.",
        ],
    }
