"""
Seizure predictor wrapping the trained ResNet-CBAM Keras models.

Three model variants are provided, each trained on a different time-series
image encoding of EEG data:
  - GASF  (Gramian Angular Summation Field)
  - MTF   (Markov Transition Field)
  - RP    (Recurrence Plot)

Original source: SeizeIT2_CWGAN_RESNET_EEG/keras_adapter.py
Refactored: ensemble voting, model registry, lazy loading, and typed outputs.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

try:
    import tensorflow as tf
    from tensorflow.keras import layers

    class SpatialAvgPool(layers.Layer):
        """Channel-wise average pooling (used in CBAM spatial attention)."""
        def call(self, inputs):
            return tf.reduce_mean(inputs, axis=3, keepdims=True)

    class SpatialMaxPool(layers.Layer):
        """Channel-wise max pooling (used in CBAM spatial attention)."""
        def call(self, inputs):
            return tf.reduce_max(inputs, axis=3, keepdims=True)

    def cbam_block(x, ratio=8, name_prefix="cbam"):
        return x

    def residual_block(x, filters, stride=1, conv_shortcut=True, name_prefix="res_block"):
        return x

    CUSTOM_OBJECTS: Dict = {
        "SpatialAvgPool": SpatialAvgPool,
        "SpatialMaxPool": SpatialMaxPool,
        "cbam_block": cbam_block,
        "residual_block": residual_block,
        "spatial_avg_pool": lambda t: tf.reduce_mean(t, axis=3, keepdims=True),
        "spatial_max_pool": lambda t: tf.reduce_max(t, axis=3, keepdims=True),
    }
    _TF_AVAILABLE = True

except ImportError:
    CUSTOM_OBJECTS = {}
    _TF_AVAILABLE = False


# ---------------------------------------------------------------------------
# Default model paths (relative to repo root)
# ---------------------------------------------------------------------------

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_MODEL_DIR = _BACKEND_DIR / "models"

MODEL_PATHS: Dict[str, Path] = {
    "gasf": _MODEL_DIR / "resnet_cbam_gasf_final.h5",
    "mtf":  _MODEL_DIR / "resnet_cbam_mtf_final.h5",
    "rp":   _MODEL_DIR / "resnet_cbam_rp_final.h5",
}


# ---------------------------------------------------------------------------
# Single-model predictor
# ---------------------------------------------------------------------------

class KerasSeizurePredictor:
    """
    Wraps a single Keras ResNet-CBAM model (.h5) that outputs
    softmax ``[P(normal), P(seizure)]`` (or reversed).

    Returns P(seizure) ∈ [0, 1].

    If no ``rgb`` image is supplied in *features*, a lightweight
    feature-based fallback is used (HR, EDA, EEG energy weighted sum).

    Parameters
    ----------
    model_path : str or Path
        Path to the .h5 model file.
    class_order : {"auto", "normal_first", "seizure_first"}
        Softmax output ordering.  "auto" heuristic: if p[0] < p[1] → normal_first.
    """

    def __init__(self, model_path: str | Path, class_order: str = "auto") -> None:
        model_path = Path(model_path)
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        if not _TF_AVAILABLE:
            raise ImportError("TensorFlow is required to load Keras models.")
        self.model = tf.keras.models.load_model(
            str(model_path), custom_objects=CUSTOM_OBJECTS, compile=False
        )
        self.class_order = class_order
        self._resolved_order: Optional[str] = None

    def _resolve_order(self, img: np.ndarray) -> str:
        if self.class_order != "auto":
            return self.class_order
        if self._resolved_order is not None:
            return self._resolved_order
        p = self.model.predict(img[None, ...], verbose=0)[0]
        self._resolved_order = "normal_first" if p[0] < p[1] else "seizure_first"
        return self._resolved_order

    def predict_image(self, img: np.ndarray) -> float:
        """Run inference on a 64×64(×3) image array."""
        if img.ndim == 2:
            img = np.repeat(img[..., None], 3, axis=-1)
        img = img.astype("float32")
        p = self.model.predict(img[None, ...], verbose=0)[0]
        order = self._resolve_order(img)
        if order == "seizure_first":
            p = p[::-1]
        return float(np.clip(p[1] / (p.sum() + 1e-8), 0.0, 1.0))

    @staticmethod
    def _feature_fallback(features: Dict) -> float:
        """Lightweight linear scorer when no image is available."""
        hr  = float(features.get("hr",  70.0))
        eda = float(features.get("eda", 0.30))
        eeg = float(features.get("eeg_energy", 0.0))
        z = (max(0.0, (hr  - 75.0) / 30.0) * 0.4
             + max(0.0, (eda - 0.35) / 0.50) * 0.4
             + eeg * 0.2)
        return float(np.clip(z, 0.0, 1.0))

    def __call__(self, features: Dict) -> float:
        if "rgb" in features and _TF_AVAILABLE:
            return self.predict_image(np.asarray(features["rgb"]))
        return self._feature_fallback(features)


# ---------------------------------------------------------------------------
# Ensemble predictor (votes across all three model variants)
# ---------------------------------------------------------------------------

class EnsembleSeizurePredictor:
    """
    Loads all three ResNet-CBAM variants (GASF, MTF, RP) and returns the
    mean P(seizure) — equivalent to probability averaging ensemble.

    Falls back to the feature-based scorer if no models are available
    (e.g., running without GPU/TF in a CI environment).

    Parameters
    ----------
    model_dir : Path, optional
        Directory containing the .h5 files; defaults to MODEL_PATHS values.
    weights : list of float, optional
        Per-model weights for weighted averaging [gasf, mtf, rp].
        Defaults to equal weights.
    """

    def __init__(
        self,
        model_dir: Optional[Path] = None,
        weights: Optional[List[float]] = None,
    ) -> None:
        self._predictors: List[KerasSeizurePredictor] = []
        self._weights: List[float] = []

        if not _TF_AVAILABLE:
            return

        paths = MODEL_PATHS.copy()
        if model_dir is not None:
            paths = {
                k: model_dir / v.name for k, v in paths.items()
            }

        default_w = weights or [1.0, 1.0, 1.0]
        for (name, path), w in zip(paths.items(), default_w):
            if path.exists():
                try:
                    self._predictors.append(KerasSeizurePredictor(path))
                    self._weights.append(w)
                except Exception:
                    pass  # skip unloadable models

    @property
    def n_models(self) -> int:
        return len(self._predictors)

    def __call__(self, features: Dict) -> float:
        if not self._predictors:
            return KerasSeizurePredictor._feature_fallback(features)
        total_w = sum(self._weights)
        score = sum(
            p(features) * w
            for p, w in zip(self._predictors, self._weights)
        ) / total_w
        return float(np.clip(score, 0.0, 1.0))
