# ============================================================
# NeurologiqueTWIN — Backend Dockerfile
# ============================================================
# Multi-stage build to keep the final image lean.
# Stage 1: build dependencies
# Stage 2: production runtime
# ============================================================

# ---- Stage 1: Builder ----
FROM python:3.11-slim AS builder

WORKDIR /app

# System deps for numpy/scipy/pywt and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install Python dependencies into a separate layer for cache efficiency
RUN (pip install --upgrade pip || true) && \
    pip install --no-cache-dir \
        numpy pandas scikit-learn scipy matplotlib plotly \
        fastapi "uvicorn[standard]" pydantic PyWavelets \
        mesa xgboost requests pyyaml python-dotenv Pillow \
        streamlit geopy seaborn && \
    (pip install --no-cache-dir pyts || true) && \
    (pip install --no-cache-dir tensorflow-cpu || pip install --no-cache-dir tensorflow || true)

# ---- Stage 2: Runtime ----
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

# Runtime system libs (libgomp for numpy/xgboost OpenMP)
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy project source
COPY backend/ ./backend/
COPY SeizeIT2_CWGAN_RESNET_EEG/*.h5 ./SeizeIT2_CWGAN_RESNET_EEG/
COPY .env.example .env

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Start FastAPI
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
