# NeurologiqueTWIN

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.12-FF6F00?logo=tensorflow)](https://tensorflow.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)

> **AI-powered Neurological Digital Twin for Seizure Risk Monitoring**
> using EEG · IMU · Clinical NLP · Multi-agent Simulation

**Author:** Ahmed Moubarak Lahlyal
**Period:** June 2024 – March 2026

---

## 🏆 Award

> **2nd Prize — InnnovBoost Startup Competition** · ENSA · Forum ENSA-Entreprises
> Project name: **NEURO-TWIN**
>
> *Selected among all competing startups for innovation in AI-powered medical technology.*

---

## Table of Contents

1. [Overview](#-overview)
2. [Problem Statement](#-problem-statement)
3. [State of the Art](#-state-of-the-art)
4. [Architecture](#-architecture)
5. [Key Contributions](#-key-contributions)
6. [Models](#-models)
7. [EEG Signal Pipeline](#-eeg-signal-pipeline)
8. [Digital Twin — Brain State Machine](#-digital-twin--brain-state-machine)
9. [Multi-agent EMS Simulation](#-multi-agent-ems-simulation)
10. [Project Structure](#-project-structure)
11. [Installation](#-installation)
12. [Quickstart](#-quickstart)
13. [API Reference](#-api-reference)
14. [Results](#-results)
15. [Roadmap — NVIDIA Integration](#-roadmap--nvidia-integration)
16. [References](#-references)
17. [License](#-license)

---

## 🚀 Overview

**NeurologiqueTWIN** is an end-to-end research platform that builds a **real-time digital twin of the brain** for early seizure risk detection and neurological decision support.

The system fuses four complementary data sources — EEG signals, wearable physiological sensors (IMU), free-text clinical notes, and a Markov state machine — into a unified risk score with full explainability. It then simulates the complete emergency response chain through a multi-agent model.

```
EEG (256 Hz)  ──►  ResNet-CBAM (90% acc.)  ──►
IMU / Watch   ──►  XGBoost (20 features)   ──►   Fusion ──► Brain Digital Twin ──► Alert
Clinical note ──►  DistilBERT zero-shot    ──►
State history ──►  Markov transitions      ──►
```

---

## 🧩 Problem Statement

### Epilepsy — Scale and Urgency

Epilepsy affects **50 million people worldwide** (WHO, 2023), making it one of the most common neurological disorders. A seizure can occur without warning, causing physical injury, loss of consciousness, or sudden unexpected death in epilepsy (SUDEP).

**Key clinical challenges:**

| Challenge | Detail |
|---|---|
| **Unpredictability** | Most patients cannot anticipate seizures; no reliable pre-ictal biomarker in real time |
| **Delayed diagnosis** | Average time from first seizure to diagnosis: **2–3 years** |
| **EEG interpretation** | Visual EEG reading is time-consuming and requires specialist expertise |
| **Emergency response** | EMS dispatch is reactive, not predictive; response time averages 8–12 minutes |
| **Monitoring gaps** | Hospital EEG only; no continuous home monitoring for high-risk patients |

### Clinical Opportunity

Research shows that the **pre-ictal period** (5–30 minutes before a seizure) exhibits measurable changes in EEG spectral power, heart rate variability (HRV), and electrodermal activity (EDA). Detecting these changes in real time could enable:

- Advance warnings to patients and caregivers
- Pre-emptive medication delivery
- Proactive EMS mobilization before the seizure fully develops

**NeurologiqueTWIN addresses this gap** by combining continuous multimodal monitoring, deep learning inference, and a probabilistic state machine that tracks the patient's neurological trajectory — not just instantaneous snapshots.

---

## 📚 State of the Art

### EEG-based Seizure Detection

| Approach | Representative work | Limitation |
|---|---|---|
| **Hand-crafted features + SVM** | Shoeb & Guttag (2010), MIT dataset | Poor generalization across patients |
| **CNN on raw EEG** | Acharya et al. (2018) | Single modality; no temporal context |
| **LSTM / RNN** | Tsiouris et al. (2018) | Vanishing gradient on long sequences |
| **Time-series image encoding** | Wang & Oates (2015) — GASF/MTF | Enables CNN transfer learning |
| **Transformer (EEG)** | Kostas et al. (2020) — BENDR | Requires large pre-training data |
| **Attention CNNs** | Woo et al. (2018) — CBAM | Strong spatial+channel attention |

### Digital Twin in Healthcare

Digital twins in medicine are emerging (Corral-Acero et al., 2020; Björnsson et al., 2020) but most work focuses on cardiac or oncological models. **Neurological digital twins remain largely unexplored**, with existing approaches either:

- Static anatomical models (no real-time inference)
- Single-modality (EEG-only, no fusion)
- No emergency dispatch simulation

### How NeurologiqueTWIN Goes Further

| Standard classifier | NeurologiqueTWIN |
|---|---|
| Single EEG window → binary label | Continuous multimodal stream → probabilistic state |
| No memory | Markov state machine (memory of trajectory) |
| Black box | Full SHAP-style attribution per prediction |
| Passive detection | Active EMS simulation |
| Single modality | EEG + IMU + NLP + state (4 modalities) |
| Point-in-time | 5-state clinical trajectory |

---

## 🏗 Architecture

<p align="center">
  <img src="docs/architecture.png" alt="NeurologiqueTWIN Architecture" width="700"/>
</p>

> Full pipeline: EEG · IMU · Clinical NLP → ResNet-CBAM · XGBoost · DistilBERT → Multimodal Fusion → Brain Digital Twin → EMS Simulation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SENSING LAYER                                   │
│  EEG Headset (6ch · 256 Hz)        Apple Watch / Empatica E4                │
│  Raw EEG µV signal                 HR · HRV · EDA · Accelerometer           │
│  Clinical notes / EEG reports      (free text)                              │
└──────────┬──────────────────────────────┬──────────────┬────────────────────┘
           │                              │              │
┌──────────▼──────────┐       ┌──────────▼────────┐  ┌──▼─────────────────────┐
│   EEGProcessor       │       │   IMUProcessor     │  │   ClinicalNLP          │
│  Band-pass 0.5–50 Hz │       │  PPG → HR / HRV   │  │  TF-IDF keyword        │
│  Notch 50 Hz         │       │  EDA tonic SCL    │  │  + DistilBERT          │
│  Wavelet denoising   │       │  Steps / Tremor   │  │  zero-shot             │
│  Robust normalize    │       │  Stress index      │  │  classification        │
└──────────┬──────────┘       └──────────┬────────┘  └──────┬─────────────────┘
           │                              │                   │
┌──────────▼──────────┐       ┌──────────▼────────┐         │
│ TimeSeriesTransformer│       │EEGFeatureExtractor │         │
│  GASF · MTF · RP    │       │  20-dim vector:    │         │
│  → 64×64×3 RGB      │       │  δθαβγ · Hjorth   │         │
└──────────┬──────────┘       └──────────┬────────┘         │
           │                              │                   │
┌──────────▼──────────┐       ┌──────────▼────────┐         │
│   ResNet-CBAM        │       │    XGBoost         │         │
│  64×64×3 → Dense(2) │       │  n_est=150         │         │
│  ~90% accuracy       │       │  Trained on synth. │         │
│  SeizeIT2 dataset   │       │  SeizeIT2 distrib. │         │
└──────────┬──────────┘       └──────────┬────────┘         │
           │                              │                   │
           └──────────────┬───────────────┘                   │
                          │         ┌─────────────────────────┘
               ┌──────────▼─────────▼─────────┐
               │    MultimodalFusionEngine      │
               │                               │
               │  r = 0.35·r_cnn              │
               │    + 0.30·r_xgb              │
               │    + 0.15·r_nlp              │
               │    + 0.15·r_imu              │
               │    + 0.05·r_state            │
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼───────────────┐
               │    Brain Digital Twin         │
               │  BrainTwinState (5 states)   │
               │  RegionMapper (20 regions)   │
               │  AlertManager (4 levels)     │
               │  EventBus (pub/sub)          │
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼───────────────┐
               │  Mesa NeuroCity Simulation    │
               │  Patient → WatchTwin          │
               │  → Dispatcher → Ambulance     │
               │  Haversine geographic routing │
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼───────────────┐
               │  FastAPI Backend · :8000      │
               │  27 REST endpoints            │
               │  OpenAPI / Swagger UI         │
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼───────────────┐
               │  Next.js 15 Frontend · :3001  │
               │  Brain SVG viewer · Dashboards│
               │  EEG viz · NLP · Simulation   │
               └──────────────────────────────┘
```

---

## ✨ Key Contributions

| # | Contribution | Technical Depth |
|---|---|---|
| 1 | **Multimodal physiological fusion** (EEG + IMU + NLP) | Weighted ensemble · inter-modality agreement scoring · graceful degradation |
| 2 | **Time-series → image encoding** (GASF / MTF / RP) | Three encoding strategies · pure-NumPy fallback · pyts integration |
| 3 | **ResNet-CBAM seizure classifier** | 90% accuracy on SeizeIT2 · channel + spatial attention (CBAM) |
| 4 | **XGBoost tabular model** (20-dim features) | Hjorth · spectral entropy · band powers · IMU features |
| 5 | **Clinical NLP** (TF-IDF + DistilBERT zero-shot) | 50+ curated clinical keywords · confidence scoring · keyword extraction |
| 6 | **Explainable risk scoring** | SHAP-style z-score attribution · EMA smoothing · trend boost |
| 7 | **Brain Digital Twin** (5-state Markov machine) | Probabilistic transitions · risk-modulated · 20 anatomical regions |
| 8 | **Multi-agent EMS simulation** (Mesa) | Patient / WatchTwin / Dispatcher / Ambulance · Haversine routing |
| 9 | **Brain SVG viewer** (axial + lateral) | 20 regions · real-time activation · risk-coded glow |
| 10 | **CWGAN-GP synthetic data** | Conditional generation by seizure type · class imbalance mitigation |

---

## 🧠 Models

| Model | Type | Input | Accuracy | File |
|---|---|---|---|---|
| **ResNet-CBAM (GASF)** | CNN + Attention | 64×64 image | ~90% | `resnet_cbam_gasf_final.h5` · 39 MB |
| **ResNet-CBAM (MTF)** | CNN + Attention | 64×64 image | ~90% | `resnet_cbam_mtf_final.h5` · 39 MB |
| **ResNet-CBAM (RP)** | CNN + Attention | 64×64 image | ~90% | `resnet_cbam_rp_final.h5` · 39 MB |
| **Ensemble CNN** | Mean vote (3 models) | Any of above | >90% | Recommended for inference |
| **XGBoost** | Gradient boosting | 20-dim features | — | `tabular_model_cache.pkl` |
| **DistilBERT NLP** | Zero-shot transformer | Clinical text | — | Downloaded at runtime (HuggingFace) |

### ResNet-CBAM Architecture

```
Input (64×64×3)
  ↓  Stem: Conv(64, 7×7, s=2) → BatchNorm → ReLU → MaxPool
  ↓  Block 1: Bottleneck ×2 + CBAM attention (256 filters)
  ↓  Block 2: Bottleneck ×2 + CBAM attention (512 filters, stride 2)
  ↓  Block 3: Bottleneck ×2 + CBAM attention (1024 filters, stride 2)
  ↓  GlobalAveragePooling → Dropout(0.5)
  ↓  Dense(2, softmax) → [P(normal), P(seizure)]

CBAM:
  Channel attention: AvgPool + MaxPool → MLP → Sigmoid → scale channels
  Spatial attention: Channel-wise pool → Conv(7×7) → Sigmoid → scale spatial
```

---

## ⚡ EEG Signal Pipeline

```
Raw EEG (256 Hz · 6 channels)
  │
  ▼  Band-pass (0.5 – 50 Hz · FFT-based · zero-phase)
  ▼  Notch filter (50 Hz · ±1 Hz · power-line removal)
  ▼  Wavelet denoising (db4 · level 4 · Donoho-Johnstone universal threshold)
  ▼  Robust normalize (5th / 95th percentile → [-1, 1])
  │
  ├─► GASF:  φᵢ = arccos(xᵢ),  GASF[i,j] = cos(φᵢ + φⱼ)
  ├─► MTF:   Quantize(n=8) → transition matrix W,  MTF[i,j] = W[qᵢ, qⱼ]
  └─► RP:    RP[i,j] = ||X[i] − X[j]||   (recurrence structure)
              │
              └─► RGB fusion (R=GASF · G=MTF · B=RP) → 64×64×3
                              │
                              ▼
                    ResNet-CBAM Classifier
                    P(seizure) ∈ [0, 1]
```

### XGBoost Feature Extraction (20 features)

| Group | Features |
|---|---|
| **EEG spectral** | δ, θ, α, β, γ band powers · spectral entropy |
| **EEG nonlinear** | Hjorth mobility · Hjorth complexity |
| **EEG statistical** | mean · std · skewness · kurtosis · line-length · zero-crossing rate |
| **IMU / wearable** | HR deviation · HRV-RMSSD · EDA · steps/h · stress index · tremor index |

---

## 🧬 Digital Twin — Brain State Machine

### Explainable Risk Scoring

$$z_i = \frac{x_i - \mu_i}{\sigma_i}, \quad c_i = w_i \cdot \tanh(0.75 \cdot z_i)$$

$$r_{\text{raw}} = \sigma\!\left(\frac{\sum_i c_i}{0.5}\right), \quad r_{\text{ema},t} = \alpha \cdot r_{\text{raw}} + (1-\alpha) \cdot r_{\text{ema},t-1}$$

$$r_{\text{final}} = \text{clip}(r_{\text{ema}} + \lambda \cdot \max(0,\,\text{trend}),\; 0,\; 1)$$

*α = 0.35 · λ = 0.10 · trend estimated by linear regression over last 5 readings*

### Markov State Transitions

$$P(s_{t+1} \mid s_t,\, r_t) = \text{softmax}\!\left(\log P_{\text{base}}[s_t, :] + r_t \cdot \mathbf{b}[s_t]\right)$$

| State | Color | Threshold | Description |
|---|---|---|---|
| **STABLE** | 🟢 Green | risk < 0.40 | Normal baseline |
| **ELEVATED** | 🟡 Yellow | risk ≥ 0.40 | Measurable deviation |
| **PREICTAL** | 🟠 Orange | risk ≥ 0.60 | Pre-seizure window (5–30 min) |
| **ICTAL** | 🔴 Red | risk ≥ 0.80 | Active seizure — EMERGENCY |
| **POSTICTAL** | 🟣 Purple | post-ictal grace | Recovery phase |

### Brain Region Mapping (10-20 EEG System)

The system hypothesizes affected brain regions from EEG channel importance scores using a weighted voting algorithm across the standard 10-20 electrode system, mapped to 20 anatomical regions (frontal, temporal, parietal, occipital, central — left/right).

> ⚠️ **Disclaimer:** All brain region outputs are HYPOTHESIZED AFFECTED ZONES for academic digital twin visualization only. NOT validated clinical localization.

---

## 🚑 Multi-agent EMS Simulation

Built with **Mesa** (Python agent-based modeling framework):

| Agent | Role | Behavior |
|---|---|---|
| `Patient` | Simulates neurological episode | Vital dynamics: HR +14 (preictal), +20 (ictal) |
| `WatchTwin` | Monitors patient via digital twin | Publishes alerts when threshold crossed |
| `Dispatcher` | Routes alerts to nearest hospital | Haversine distance · hospital capacity |
| `Ambulance` | Two-phase EMS routing | Patient location → hospital routing |

### Scenarios

| ID | Name | Patients | Steps |
|---|---|---|---|
| `paris_single` | Single patient — Paris | 1 | 30 |
| `paris_multi` | Multi-patient — Paris network | 3 | 28 |
| `campus` | University Campus | 2 | 32 |
| `stress_test` | Rapid onset — 3-tick pre-ictal | 1 | 20 |

---

## 📁 Project Structure

```
projetneurologiquetwin/
│
├── LICENSE                            ← Apache License 2.0
├── NOTICE                             ← Copyright · Author · References
├── README.md                          ← This file
├── requirements.txt                   ← All Python dependencies
├── .env.example                       ← Environment variables template
├── docker-compose.yml                 ← One-command full stack
│
├── backend/                           ← FastAPI production backend
│   ├── Dockerfile                     ← Multi-stage build
│   ├── main.py                        ← App entry point · 27 endpoints
│   ├── core/
│   │   ├── risk_scorer.py             ← Explainable z-score attribution
│   │   ├── digital_twin.py            ← Markov digital twin engine
│   │   ├── seizure_predictor.py       ← ResNet-CBAM single + ensemble
│   │   └── event_bus.py               ← Pub/sub alert system
│   ├── signals/
│   │   ├── eeg_processor.py           ← Band-pass · notch · wavelet
│   │   ├── imu_processor.py           ← PPG → HR/HRV · EDA · steps
│   │   └── transforms.py              ← GASF / MTF / RP / RGB
│   ├── simulation/
│   │   ├── agents.py                  ← Patient · WatchTwin · Dispatcher · Ambulance
│   │   ├── city_model.py              ← NeuroCity Mesa model
│   │   └── scenarios.py               ← 4 named scenarios
│   ├── ml/
│   │   ├── tabular_model.py           ← XGBoost on 20-dim features
│   │   ├── nlp_analyzer.py            ← DistilBERT + TF-IDF fallback
│   │   └── fusion.py                  ← Multimodal weighted fusion
│   ├── twin/
│   │   ├── brain_regions.py           ← 20 anatomical regions · 3D coords
│   │   ├── region_mapper.py           ← EEG channels → brain zone
│   │   ├── brain_state.py             ← 5-state Markov machine
│   │   ├── twin_controller.py         ← Per-patient orchestrator
│   │   └── alert_manager.py           ← Emergency alert generation
│   ├── models/
│   │   ├── resnet_cbam_gasf_final.h5  ← 39 MB trained model
│   │   ├── resnet_cbam_mtf_final.h5   ← 39 MB trained model
│   │   └── resnet_cbam_rp_final.h5    ← 39 MB trained model (default)
│   └── api/routes/
│       ├── health.py                  ← GET /health
│       ├── inference.py               ← POST /api/v1/predict
│       ├── multimodal.py              ← POST /api/v1/predict/multimodal
│       ├── eeg.py                     ← POST /api/v1/eeg/*
│       ├── simulation.py              ← POST /api/v1/simulation/*
│       ├── nlp.py                     ← POST /api/v1/nlp/*
│       └── twin.py                    ← POST /api/v1/twin/*
│
└── frontend/                          ← Next.js 15 + React 19
    ├── Dockerfile
    ├── app/
    │   ├── page.tsx                   ← / Landing
    │   ├── brain-twin/page.tsx        ← /brain-twin  Brain digital twin
    │   ├── dashboard/page.tsx         ← /dashboard   Apple Watch timeline
    │   ├── models/page.tsx            ← /models      CNN model explorer
    │   ├── simulation/page.tsx        ← /simulation  Mesa sim UI
    │   ├── epilepsy/page.tsx          ← /epilepsy    Clinical reference
    │   ├── chbmit/page.tsx            ← /chbmit      CHB-MIT EDF viewer
    │   ├── nlp/page.tsx               ← /nlp         NLP analyzer
    │   └── xgboost/page.tsx           ← /xgboost     Feature importance
    └── components/
        ├── brain-twin/BrainTwinViewer.tsx   ← SVG brain · 20 regions
        ├── emergency-dashboard.tsx
        ├── digital-twin-demo.tsx
        ├── signal-processing-pipeline.tsx
        ├── mesa-demo.tsx
        └── [15 other components]
```

---

## ⚙️ Installation

```bash
git clone https://github.com/ahmed-moubarak/projetneurologiquetwin
cd projetneurologiquetwin
```

### Option 1 — Docker (recommended)

```bash
# Copy environment variables
cp .env.example .env

# Build and start all services
docker compose up --build -d

# Access
# Frontend  → http://localhost:3001
# API docs  → http://localhost:8000/docs
```

### Option 2 — Local Python + Node

```bash
# Backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install && npm run dev
# → http://localhost:3000
```

### Option 3 — Legacy Streamlit UI

```bash
cd SeizeIT2_CWGAN_RESNET_EEG
streamlit run app.py
python run_sim.py --model_path resnet_cbam_rp_final.h5 --minutes 2
python apple_watch_alert_simulation.py   # 72-hour wearable demo
```

---

## 🌐 API Reference

### Quick test (curl)

```bash
# Health check — verify models loaded
curl http://localhost:8000/health

# Brain twin inference — EEG features → risk → region → alert
curl -X POST http://localhost:8000/api/v1/twin/inference \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "patient-001",
    "eeg_energy": 0.72,
    "hr": 98,
    "eda": 1.5,
    "dominant_channels": ["T3", "F7", "T5"],
    "lat": 48.8566,
    "lon": 2.3522
  }'

# Full multimodal fusion
curl -X POST http://localhost:8000/api/v1/predict/multimodal \
  -d '{
    "hr": 90, "eda": 0.60, "eeg_energy": 0.50,
    "hrv": 25, "steps": 80,
    "clinical_note": "Patient reports visual aura, tonic-clonic episode this morning.",
    "twin_state": "preictal"
  }'

# Clinical NLP
curl -X POST http://localhost:8000/api/v1/nlp/analyze \
  -d '{"text": "Breakthrough seizure, post-ictal confusion 30 min, medication non-compliant."}'

# EEG full pipeline — raw signal → image → prediction
curl -X POST http://localhost:8000/api/v1/eeg/full-pipeline \
  -d '{"signal": [0.1, -0.3, 0.5, "..."], "fs": 256, "method": "rgb"}'
```

### All Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + model availability |
| POST | `/api/v1/predict` | Risk from physiological features |
| POST | `/api/v1/predict/image` | Risk from 64×64 image |
| GET | `/api/v1/predict/history` | Rolling inference history |
| POST | `/api/v1/predict/multimodal` | Full CNN + XGBoost + NLP + IMU |
| POST | `/api/v1/eeg/process` | Bandpass + denoise + normalize |
| POST | `/api/v1/eeg/transform` | EEG → GASF / MTF / RP |
| POST | `/api/v1/eeg/features` | Extract 20 spectral + Hjorth features |
| POST | `/api/v1/eeg/full-pipeline` | Process → transform → predict |
| POST | `/api/v1/nlp/analyze` | Clinical note → seizure risk |
| POST | `/api/v1/nlp/batch` | Batch clinical note analysis |
| POST | `/api/v1/simulation/run` | Run a full Mesa scenario |
| POST | `/api/v1/simulation/interactive/step` | Step interactive simulation |
| POST | `/api/v1/twin/inference` | EEG → risk → brain region → twin |
| GET | `/api/v1/twin/state/{id}` | Current twin snapshot |
| POST | `/api/v1/twin/edf` | Upload CHB-MIT EDF → per-window |
| GET | `/api/v1/twin/schema` | Example input/output payloads |

Full interactive docs: **http://localhost:8000/docs**

---

## 📊 Results

### Fusion Output Example

```json
{
  "final_risk": 0.821,
  "risk_level": "critical",
  "agreement": 0.91,
  "confidence": 0.91,
  "dominant_modality": "cnn",
  "clinical_summary": "Multimodal fusion: critical risk (82.1%). Dominant: CNN. High agreement (91%).",
  "attribution": {
    "cnn":      0.3647,
    "xgboost":  0.2973,
    "nlp":      0.1677,
    "imu":      0.1353,
    "state":    0.0349
  }
}
```

### Twin Inference Example

```json
{
  "twin": {
    "status": "ictal",
    "status_label": "Active Seizure — Emergency",
    "seizure_risk": 0.87,
    "alert_level": "red"
  },
  "region": {
    "region_name": "Left Temporal",
    "lobe": "temporal",
    "localization_confidence": "channel_weighted",
    "highlight_intensity": 0.87
  },
  "alert": {
    "alert_level": "red",
    "message": "EMERGENCY: Seizure detected — immediate EMS required",
    "maps_link": "https://maps.google.com/?q=48.8566,2.3522"
  }
}
```

### Model Performance

| Model | Input | Accuracy | Notes |
|---|---|---|---|
| ResNet-CBAM (GASF) | 64×64 image | ~90% | SeizeIT2 dataset |
| ResNet-CBAM (MTF) | 64×64 image | ~90% | SeizeIT2 dataset |
| ResNet-CBAM (RP) | 64×64 image | ~90% | SeizeIT2 dataset |
| Ensemble (3 models) | All three | >90% | Best overall |
| XGBoost | 20 features | — | Trained on synthetic |
| Fusion | 4 modalities | — | Agreement > 0.85 on test |

---

## 🔭 Roadmap — NVIDIA Integration

The next phase of NeurologiqueTWIN will integrate **NVIDIA technologies** to push toward clinical-grade real-time performance:

| Phase | Technology | Goal |
|---|---|---|
| **v3.0** | **NVIDIA cuDNN + TensorRT** | 10× inference acceleration — real-time EEG at 256 Hz without latency |
| **v3.1** | **NVIDIA CUDA** | GPU-accelerated GASF / MTF / RP transform batches |
| **v3.2** | **NVIDIA Triton Inference Server** | Production-grade multi-model serving (ResNet-CBAM + XGBoost + NLP) |
| **v3.3** | **NVIDIA Holoscan SDK** | Edge deployment on medical-grade streaming hardware |
| **v3.4** | **NVIDIA BioNeMo** | Fine-tune large clinical NLP model on EEG + epilepsy literature |
| **v4.0** | **NVIDIA Omniverse** | Photo-realistic 3D brain digital twin with real-time activation rendering |

The transition from research prototype to real-time clinical decision support system requires hardware-accelerated inference. NVIDIA's medical AI stack provides the most mature ecosystem for this use case.

---

## 📚 References

1. **SeizeIT2 Dataset** — EPILEPSIAE European multicentre EEG database
2. **CBAM** — Woo et al., *CBAM: Convolutional Block Attention Module*, ECCV 2018
3. **GASF/MTF** — Wang & Oates, *Encoding Time Series as Images*, AAAI 2015
4. **XGBoost** — Chen & Guestrin, *XGBoost: A Scalable Tree Boosting System*, KDD 2016
5. **CWGAN-GP** — Gulrajani et al., *Improved Training of Wasserstein GANs*, NeurIPS 2017
6. **DistilBERT** — Sanh et al., *DistilBERT, a distilled version of BERT*, NeurIPS 2019
7. **Hjorth Parameters** — Hjorth, *EEG analysis based on time domain properties*, EEG & EMG 1970
8. **Mesa** — Masad & Kazil, *Mesa: An Agent-Based Modeling Framework*, SciPy 2015
9. **HRV & Seizure** — Kolsal et al., *Heart Rate Variability as a Biomarker*, 2018
10. **Digital Twin in Medicine** — Corral-Acero et al., *The "Digital Twin" to enable the vision of precision cardiology*, Eur Heart J 2020
11. **EEG Transformer** — Kostas et al., *BENDR: using transformers and a contrastive self-supervised task to learn from physiological recordings*, 2021

---

## 📄 License

```
Copyright (c) 2024–2026  Ahmed Moubarak Lahlyal

Licensed under the Apache License, Version 2.0.
See LICENSE file for full terms.
```

---

## 🙏 Acknowledgements

- **ENSA / Forum ENSA-Entreprises** — InnnovBoost 2nd prize recognition
- **EPILEPSIAE consortium** — SeizeIT2 dataset
- **Hugging Face** — DistilBERT zero-shot pipeline
- **Project Mesa** — Agent-based modeling framework

---

> **Clinical Disclaimer:** This software is a research prototype.
> It is **NOT approved for clinical use**.
> All brain region localizations are hypothesized for digital twin visualization only.
> Always consult qualified medical professionals for clinical decisions.
