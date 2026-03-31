"""
Multimodal Fusion Endpoints — POST /api/v1/predict/multimodal
"""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from ...ml.fusion import MultimodalFusionEngine
from ...ml.tabular_model import TabularSeizurePredictor
from ...ml.nlp_analyzer import ClinicalNLPAnalyzer
from ...core.risk_scorer import ExplainableRiskScorer

router = APIRouter(prefix="/predict/multimodal", tags=["Multimodal Fusion"])

_fusion  = MultimodalFusionEngine()
_xgb     = TabularSeizurePredictor()
_nlp     = ClinicalNLPAnalyzer(use_transformer=False)
_scorer  = ExplainableRiskScorer()


class MultimodalRequest(BaseModel):
    # Physiological features (always available)
    hr:         float = Field(72.0, description="Heart rate (bpm)")
    eda:        float = Field(0.35, description="Skin conductance (µS)")
    eeg_energy: float = Field(0.08, description="Normalised EEG spectral energy")
    hrv:        Optional[float] = Field(None)
    steps:      Optional[float] = Field(None)
    stress:     Optional[float] = Field(None)
    tremor:     Optional[float] = Field(None)

    # CNN risk (from ResNet-CBAM, if image was already processed)
    cnn_risk: Optional[float] = Field(None, description="Pre-computed CNN risk ∈ [0,1]")

    # Clinical note (NLP input)
    clinical_note: Optional[str] = Field(None, description="Free-text clinical note")

    # Digital twin state
    twin_state: Optional[str] = Field(None, description="Current digital twin state")

    # Location
    lat: Optional[float] = None
    lon: Optional[float] = None


@router.post("", summary="Full multimodal fusion: CNN + XGBoost + NLP + IMU + state")
def predict_multimodal(req: MultimodalRequest):
    """
    Runs all available prediction modalities and fuses them into a single
    explainable seizure risk score.

    Pipeline:
      1. XGBoost inference on extracted EEG/IMU features
      2. NLP analysis (if clinical_note provided)
      3. IMU composite risk from wearable features
      4. Fusion: weighted average (CNN 35% + XGBoost 30% + NLP 15% + IMU 15% + state 5%)

    Returns the final fused risk plus per-modality attribution.
    """
    imu = {
        "hr":  req.hr,  "eda": req.eda, "eeg_energy": req.eeg_energy,
        "hrv": req.hrv or 50.0, "steps": req.steps or 250.0,
        "stress": req.stress or 0.25, "tremor": req.tremor or 0.05,
    }

    # 1. XGBoost
    xgb_result = _xgb.predict_with_attribution(imu=imu)

    # 2. NLP
    nlp_result = None
    if req.clinical_note:
        nlp_result = _nlp.analyze(req.clinical_note)

    # 3. Explainable feature scorer (used as IMU proxy)
    explanation = _scorer.explain(imu)

    # 4. Fuse
    fusion_result = _fusion.fuse(
        cnn_risk     = req.cnn_risk,
        xgboost_risk = xgb_result["seizure_probability"],
        nlp_risk     = float(nlp_result["risk_score"]) if nlp_result else None,
        imu_risk     = explanation.seizure_risk,
        twin_state   = req.twin_state,
    )

    return {
        "final_risk":        fusion_result.final_risk,
        "risk_level":        fusion_result.risk_level,
        "agreement":         fusion_result.agreement,
        "confidence":        fusion_result.confidence,
        "dominant_modality": fusion_result.dominant_modality,
        "clinical_summary":  fusion_result.clinical_summary,
        "attribution":       fusion_result.attribution,
        "modalities": _fusion.to_dict(fusion_result)["modalities"],
        "components": {
            "xgboost": {
                "probability": xgb_result["seizure_probability"],
                "backend":     xgb_result["backend"],
                "top_features": sorted(
                    xgb_result["feature_importance"].items(),
                    key=lambda x: -x[1]
                )[:5],
            },
            "nlp": nlp_result,
            "imu_scorer": {
                "risk":          explanation.seizure_risk,
                "risk_level":    explanation.risk_level,
                "dominant":      explanation.dominant_driver,
                "attribution":   explanation.attribution_dict,
            },
            "cnn": {"risk": req.cnn_risk, "available": req.cnn_risk is not None},
        },
    }


@router.get("/weights", summary="Current fusion modality weights")
def get_weights():
    return {
        "weights": _fusion.weights,
        "description": "Weights sum to 1.0. Unavailable modalities are excluded and weights are renormalised.",
    }
