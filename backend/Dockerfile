# ============================================================
# NeurologiqueTWIN — Backend Dockerfile
# Build context: repo root  (docker-compose sets context: .)
# ============================================================

# ---- Stage 1: Builder ----
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir \
        numpy pandas scikit-learn scipy matplotlib plotly \
        fastapi "uvicorn[standard]" pydantic PyWavelets \
        mesa xgboost requests pyyaml python-dotenv Pillow \
        seaborn geopy python-multipart scikit-image && \
    (pip install --no-cache-dir pyts || true) && \
    (pip install --no-cache-dir mne pyedflib || true) && \
    (pip install --no-cache-dir tensorflow-cpu || pip install --no-cache-dir tensorflow || true)

# ---- Stage 2: Runtime ----
FROM python:3.11-slim AS runtime

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend source (includes models/ and legacy/)
COPY backend/ ./backend/
COPY .env.example .env

# Non-root user
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
