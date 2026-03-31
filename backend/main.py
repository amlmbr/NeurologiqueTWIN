"""
NeurologiqueTWIN — FastAPI Backend Entry Point
==============================================

AI-powered Neurological Digital Twin for Seizure Risk Monitoring
using EEG, IMU, and NLP signals.

Run with uvicorn:
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

Interactive API docs:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import health, inference, eeg, simulation, nlp, multimodal, twin

# ---------------------------------------------------------------------------
# Application metadata
# ---------------------------------------------------------------------------

app = FastAPI(
    title="NeurologiqueTWIN API",
    description="""
## AI-powered Neurological Digital Twin for Seizure Risk Monitoring

Multimodal pipeline: **EEG + IMU + NLP** → ResNet-CBAM + XGBoost + DistilBERT → Fusion

### Endpoints

| Module | Prefix | Description |
|--------|--------|-------------|
| **Inference** | `/api/v1/predict` | Seizure risk from physiological features + image |
| **Multimodal** | `/api/v1/predict/multimodal` | Full CNN + XGBoost + NLP + IMU fusion |
| **EEG** | `/api/v1/eeg` | Signal processing, transforms (GASF/MTF/RP) |
| **Simulation** | `/api/v1/simulation` | Mesa multi-agent digital twin simulation |
| **NLP** | `/api/v1/nlp` | Clinical note analysis |
| **Health** | `/health` | Liveness + model availability |

### Architecture

```
EEG Signal → EEGProcessor → GASF/MTF/RP → ResNet-CBAM (90% acc)  ─┐
IMU/Wearable → IMUProcessor → EEGFeatureExtractor → XGBoost        ─┤
Clinical Notes → TF-IDF / DistilBERT → NLP risk score             ─┤→ Fusion → Final Risk
Digital Twin → Markov state machine (normal/preictal/ictal)        ─┘
```
""",
    version="2.0.0",
    contact={"name": "NeurologiqueTWIN", "url": "https://github.com/"},
    license_info={"name": "MIT"},
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router)
app.include_router(inference.router,   prefix="/api/v1")
app.include_router(multimodal.router,  prefix="/api/v1")
app.include_router(eeg.router,         prefix="/api/v1")
app.include_router(simulation.router,  prefix="/api/v1")
app.include_router(nlp.router,         prefix="/api/v1")
app.include_router(twin.router,        prefix="/api/v1")

# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )
