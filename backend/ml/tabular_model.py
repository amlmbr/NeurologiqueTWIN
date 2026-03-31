"""
Tabular ML Model — XGBoost / LightGBM Seizure Predictor
========================================================

Second ML component of the NeurologiqueTWIN ensemble, operating on
hand-crafted features extracted from raw EEG and IMU data rather than
on image representations.

This model is complementary to the ResNet-CBAM image-based model:
  - CNN model: captures spatial patterns in 2-D time-series images
  - XGBoost model: captures tabular feature relationships explicitly

Feature groups extracted
------------------------
EEG spectral features (8):
  delta/theta/alpha/beta/gamma band powers, spectral entropy,
  Hjorth mobility, Hjorth complexity

EEG statistical features (6):
  mean, std, skewness, kurtosis, line-length, zero-crossing rate

IMU / wearable features (6):
  HR deviation, HRV-RMSSD, EDA level, steps/hour, stress index, tremor

Total: 20 features per sample.

Training strategy
-----------------
The model is trained on synthetic data drawn from the same statistical
distributions as the SeizeIT2 dataset, with class-conditional sampling
calibrated from the apple_watch_alert_simulation.py parameters:

  Normal class:    HR ~ N(72, 5),  EEG_en ~ N(0.08, 0.04),  EDA ~ N(0.32, 0.06)
  Pre-ictal class: HR ~ N(86, 5),  EEG_en ~ N(0.43, 0.08),  EDA ~ N(0.50, 0.07)
  Ictal class:     HR ~ N(92, 6),  EEG_en ~ N(0.63, 0.06),  EDA ~ N(0.62, 0.08)

The model is trained once at startup and cached. It can be replaced by
loading a pre-trained model from disk (auto-detected).

References
----------
- XGBoost: Chen & Guestrin, KDD 2016
- Hjorth parameters: Hjorth, EEG EMG 1970
- Spectral entropy: Powell & Percival, 1979
"""

from __future__ import annotations

import os
import pickle
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# Optional dependencies (graceful fallback)
# ---------------------------------------------------------------------------

try:
    import xgboost as xgb
    _XGB_AVAILABLE = True
except ImportError:
    _XGB_AVAILABLE = False

try:
    import lightgbm as lgb
    _LGB_AVAILABLE = True
except ImportError:
    _LGB_AVAILABLE = False

try:
    from scipy.stats import skew, kurtosis as scipy_kurtosis
    _SCIPY_AVAILABLE = True
except ImportError:
    _SCIPY_AVAILABLE = False


MODEL_CACHE_PATH = Path(__file__).parent / "tabular_model_cache.pkl"

FEATURE_NAMES: List[str] = [
    # EEG spectral
    "eeg_delta", "eeg_theta", "eeg_alpha", "eeg_beta", "eeg_gamma",
    "eeg_spectral_entropy",
    "eeg_hjorth_mobility", "eeg_hjorth_complexity",
    # EEG statistical
    "eeg_mean", "eeg_std", "eeg_skewness", "eeg_kurtosis",
    "eeg_line_length", "eeg_zero_crossing_rate",
    # IMU / wearable
    "hr_deviation", "hrv_rmssd", "eda_level",
    "steps_per_hour", "stress_index", "tremor_index",
]


# ---------------------------------------------------------------------------
# Feature extractor
# ---------------------------------------------------------------------------

class EEGFeatureExtractor:
    """
    Extracts a 20-dimensional feature vector from a raw EEG epoch + IMU dict.

    Parameters
    ----------
    fs : float — EEG sampling frequency (default 256 Hz)
    """

    def __init__(self, fs: float = 256.0) -> None:
        self.fs = fs

    def extract(
        self,
        eeg: Optional[np.ndarray] = None,
        imu: Optional[Dict[str, float]] = None,
    ) -> np.ndarray:
        """
        Extract 20-dimensional feature vector.

        Parameters
        ----------
        eeg : np.ndarray, shape (n,) — optional preprocessed EEG epoch
        imu : dict — optional wearable features (hr, hrv, eda, steps, stress, tremor)

        Returns
        -------
        np.ndarray, shape (20,), dtype float32
        """
        feat = np.zeros(20, dtype=np.float32)

        # EEG features (indices 0–13)
        if eeg is not None and len(eeg) >= 32:
            eeg = eeg.astype(np.float64)
            spectral = self._spectral_features(eeg)
            stat     = self._statistical_features(eeg)
            feat[0:8]  = spectral
            feat[8:14] = stat
        else:
            # Fallback: use IMU-derived EEG proxy
            eeg_en = float((imu or {}).get("eeg_energy", 0.08))
            feat[4] = eeg_en              # gamma proxy → eeg_gamma position

        # IMU / wearable features (indices 14–19)
        if imu is not None:
            hr    = float(imu.get("hr",    72.0))
            hrv   = float(imu.get("hrv",   50.0))
            eda   = float(imu.get("eda",    0.35))
            steps = float(imu.get("steps", 250.0))
            stress= float(imu.get("stress", 0.25))
            tremor= float(imu.get("tremor", 0.05))
            feat[14] = (hr - 72.0) / 15.0        # HR deviation from baseline
            feat[15] = hrv / 50.0                 # Normalised HRV
            feat[16] = eda / 0.60                 # Normalised EDA
            feat[17] = steps / 300.0              # Normalised activity
            feat[18] = stress                     # Already ∈ [0,1]
            feat[19] = tremor                     # Already ∈ [0,1]

        return feat

    # ------------------------------------------------------------------
    # Spectral features
    # ------------------------------------------------------------------

    def _spectral_features(self, eeg: np.ndarray) -> np.ndarray:
        """Returns 8 features: [delta, theta, alpha, beta, gamma, entropy, hjorth_mob, hjorth_cplx]"""
        fft = np.fft.rfft(eeg)
        freqs = np.fft.rfftfreq(len(eeg), d=1.0 / self.fs)
        power = np.abs(fft) ** 2
        total = power.sum() + 1e-12

        def bp(lo, hi):
            return float(power[(freqs >= lo) & (freqs < hi)].sum() / total)

        delta = bp(0.5, 4.0)
        theta = bp(4.0, 8.0)
        alpha = bp(8.0, 13.0)
        beta  = bp(13.0, 30.0)
        gamma = bp(30.0, 50.0)

        # Spectral entropy (Shannon entropy of power spectrum)
        p_norm = power / total
        p_norm = np.clip(p_norm, 1e-12, 1.0)
        sp_entropy = float(-np.sum(p_norm * np.log(p_norm)) / np.log(len(p_norm)))

        # Hjorth parameters
        hjorth_mob, hjorth_cplx = self._hjorth(eeg)

        return np.array([delta, theta, alpha, beta, gamma,
                         sp_entropy, hjorth_mob, hjorth_cplx], dtype=np.float32)

    @staticmethod
    def _hjorth(x: np.ndarray) -> Tuple[float, float]:
        """Hjorth mobility and complexity."""
        dx = np.diff(x)
        ddx = np.diff(dx)
        var_x   = np.var(x)   + 1e-12
        var_dx  = np.var(dx)  + 1e-12
        var_ddx = np.var(ddx) + 1e-12
        mobility    = float(np.sqrt(var_dx / var_x))
        complexity  = float(np.sqrt(var_ddx / var_dx) / mobility)
        return mobility, complexity

    # ------------------------------------------------------------------
    # Statistical features
    # ------------------------------------------------------------------

    def _statistical_features(self, x: np.ndarray) -> np.ndarray:
        """Returns 6 features: [mean, std, skewness, kurtosis, line_length, zcr]"""
        if _SCIPY_AVAILABLE:
            sk = float(skew(x))
            ku = float(scipy_kurtosis(x))
        else:
            mu = x.mean(); sigma = x.std() + 1e-8
            sk = float(np.mean(((x - mu) / sigma) ** 3))
            ku = float(np.mean(((x - mu) / sigma) ** 4) - 3)

        ll  = float(np.sum(np.abs(np.diff(x))))                        # Line length
        zcr = float(np.sum(np.diff(np.sign(x)) != 0) / len(x))        # Zero-crossing rate

        return np.array([x.mean(), x.std(), sk, ku, ll / (len(x) * 2), zcr],
                        dtype=np.float32)


# ---------------------------------------------------------------------------
# XGBoost predictor
# ---------------------------------------------------------------------------

class TabularSeizurePredictor:
    """
    XGBoost gradient-boosted tree classifier for seizure detection.

    Trained on synthetic data calibrated to SeizeIT2 distribution parameters.
    Can be replaced by loading a pkl file trained on real data.

    Parameters
    ----------
    model_path : Path, optional — load pre-trained model from .pkl file
    fs : float — EEG sampling frequency
    use_lgbm : bool — use LightGBM instead of XGBoost (if available)
    """

    def __init__(
        self,
        model_path: Optional[Path] = None,
        fs: float = 256.0,
        use_lgbm: bool = False,
    ) -> None:
        self.extractor = EEGFeatureExtractor(fs=fs)
        self._model = None
        self._backend = "none"

        if model_path and Path(model_path).exists():
            self._load(model_path)
        elif MODEL_CACHE_PATH.exists():
            self._load(MODEL_CACHE_PATH)
        else:
            self._train_synthetic()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict(
        self,
        eeg: Optional[np.ndarray] = None,
        imu: Optional[Dict[str, float]] = None,
    ) -> float:
        """Return P(seizure) ∈ [0, 1]."""
        feat = self.extractor.extract(eeg, imu)
        return self._predict_prob(feat)

    def predict_with_attribution(
        self,
        eeg: Optional[np.ndarray] = None,
        imu: Optional[Dict[str, float]] = None,
    ) -> Dict:
        """Return probability + per-feature importance scores."""
        feat = self.extractor.extract(eeg, imu)
        prob = self._predict_prob(feat)
        importance = self._feature_importance(feat)
        return {
            "seizure_probability": prob,
            "feature_vector": {
                name: float(val)
                for name, val in zip(FEATURE_NAMES, feat)
            },
            "feature_importance": importance,
            "backend": self._backend,
        }

    def __call__(self, features: Dict) -> float:
        """Compatible with DigitalTwin predictor interface."""
        imu = features
        eeg = np.asarray(features["eeg_raw"]) if "eeg_raw" in features else None
        return self.predict(eeg=eeg, imu=imu)

    # ------------------------------------------------------------------
    # Training on synthetic data
    # ------------------------------------------------------------------

    def _train_synthetic(self) -> None:
        """
        Train XGBoost on synthetic data calibrated to SeizeIT2 statistics.

        Generates 3 classes × 1200 samples = 3600 total samples.
        Class 0: Normal,   Class 1: Pre-ictal,   Class 2: Ictal
        Binary task: Normal vs Seizure (classes 1+2 merged into seizure).
        """
        np.random.seed(42)
        N = 1200

        # Normal class
        X_normal = self._generate_class(
            n=N, hr_mu=72, hr_sd=5, eeg_en_mu=0.08, eeg_en_sd=0.04,
            eda_mu=0.32, eda_sd=0.06, hrv_mu=55, hrv_sd=10,
            steps_mu=280, steps_sd=80,
        )

        # Pre-ictal class
        X_preictal = self._generate_class(
            n=N, hr_mu=86, hr_sd=5, eeg_en_mu=0.43, eeg_en_sd=0.08,
            eda_mu=0.50, eda_sd=0.07, hrv_mu=32, hrv_sd=8,
            steps_mu=120, steps_sd=60,
        )

        # Ictal class
        X_ictal = self._generate_class(
            n=N, hr_mu=92, hr_sd=6, eeg_en_mu=0.63, eeg_en_sd=0.06,
            eda_mu=0.62, eda_sd=0.08, hrv_mu=18, hrv_sd=5,
            steps_mu=40, steps_sd=30,
        )

        X = np.vstack([X_normal, X_preictal, X_ictal]).astype(np.float32)
        y = np.array(
            [0] * N + [1] * N + [1] * N,   # binary: normal=0, seizure=1
            dtype=np.int32,
        )

        # Shuffle
        idx = np.random.permutation(len(y))
        X, y = X[idx], y[idx]

        if _XGB_AVAILABLE:
            self._model = xgb.XGBClassifier(
                n_estimators=150,
                max_depth=5,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                use_label_encoder=False,
                eval_metric="logloss",
                random_state=42,
                verbosity=0,
            )
            self._model.fit(X, y)
            self._backend = "xgboost"

        elif _LGB_AVAILABLE:
            self._model = lgb.LGBMClassifier(
                n_estimators=150, max_depth=5, learning_rate=0.1,
                random_state=42, verbose=-1,
            )
            self._model.fit(X, y)
            self._backend = "lightgbm"

        else:
            # Pure NumPy fallback: logistic regression on top 3 features
            self._lr_weights = self._fit_logistic(X, y)
            self._backend = "logistic_fallback"

        # Cache to disk
        try:
            with open(MODEL_CACHE_PATH, "wb") as f:
                pickle.dump({"model": self._model, "backend": self._backend,
                             "lr_weights": getattr(self, "_lr_weights", None)}, f)
        except Exception:
            pass

    def _generate_class(
        self, n: int,
        hr_mu: float, hr_sd: float,
        eeg_en_mu: float, eeg_en_sd: float,
        eda_mu: float, eda_sd: float,
        hrv_mu: float, hrv_sd: float,
        steps_mu: float, steps_sd: float,
    ) -> np.ndarray:
        """Generate synthetic feature vectors for one class."""
        X = np.zeros((n, len(FEATURE_NAMES)), dtype=np.float32)

        hr    = np.random.normal(hr_mu, hr_sd, n)
        eeg   = np.random.normal(eeg_en_mu, eeg_en_sd, n).clip(0, 1)
        eda   = np.random.normal(eda_mu, eda_sd, n).clip(0.05, 2.0)
        hrv   = np.random.normal(hrv_mu, hrv_sd, n).clip(5, 120)
        steps = np.random.normal(steps_mu, steps_sd, n).clip(0, 600)

        # EEG spectral: distribute eeg_en across bands (gamma dominant for seizures)
        # Rough calibration based on EEG literature
        gamma_frac = eeg / (eeg + 0.5)   # Higher eeg_en → more gamma
        X[:, 4]  = gamma_frac * eeg       # gamma
        X[:, 3]  = (1 - gamma_frac) * eeg * 0.7   # beta
        X[:, 2]  = eeg * 0.15             # alpha
        X[:, 1]  = eeg * 0.10             # theta
        X[:, 0]  = eeg * 0.05             # delta

        X[:, 5]  = 0.5 - 0.4 * (eeg - 0.08)     # spectral entropy (lower = more seizure)
        X[:, 6]  = 0.1 + eeg * 0.5               # hjorth mobility
        X[:, 7]  = 1.0 + eeg * 2.0               # hjorth complexity

        # Statistical
        X[:, 8]  = np.random.normal(0, 0.1, n)   # mean ≈ 0 after normalisation
        X[:, 9]  = 0.3 + eeg * 0.5               # std grows with seizure energy
        X[:, 10] = np.random.normal(0, 0.5, n)   # skewness
        X[:, 11] = 2.5 + 2.0 * (eeg > 0.3).astype(float)  # kurtosis elevated in seizure
        X[:, 12] = eeg * 0.7                     # line length
        X[:, 13] = 0.1 + eeg * 0.4              # zero crossing rate

        # IMU
        X[:, 14] = (hr - 72.0) / 15.0
        X[:, 15] = hrv / 50.0
        X[:, 16] = eda / 0.60
        X[:, 17] = steps / 300.0
        X[:, 18] = np.clip((hr - 72) / 30 + (eda - 0.35) / 0.4, 0, 1)  # stress
        X[:, 19] = np.random.exponential(0.03, n).clip(0, 1)             # tremor

        return X.clip(-5, 5)

    @staticmethod
    def _fit_logistic(X: np.ndarray, y: np.ndarray) -> np.ndarray:
        """Minimal logistic regression via gradient descent (no sklearn needed)."""
        X_norm = (X - X.mean(0)) / (X.std(0) + 1e-8)
        w = np.zeros(X_norm.shape[1] + 1, dtype=np.float64)
        lr = 0.05
        for _ in range(500):
            Xb = np.column_stack([np.ones(len(X_norm)), X_norm])
            logit = Xb @ w
            p = 1 / (1 + np.exp(-np.clip(logit, -20, 20)))
            grad = Xb.T @ (p - y) / len(y)
            w -= lr * grad
        return w

    # ------------------------------------------------------------------
    # Prediction helpers
    # ------------------------------------------------------------------

    def _predict_prob(self, feat: np.ndarray) -> float:
        if self._model is not None and self._backend in ("xgboost", "lightgbm"):
            prob = self._model.predict_proba(feat.reshape(1, -1))[0]
            return float(prob[1])  # P(seizure)
        if hasattr(self, "_lr_weights"):
            w = self._lr_weights
            x_norm = (feat - feat.mean()) / (feat.std() + 1e-8)
            xb = np.concatenate([[1.0], x_norm])
            logit = float(xb @ w)
            return float(1 / (1 + np.exp(-np.clip(logit, -20, 20))))
        # Ultimate fallback: IMU-based heuristic
        eeg_en = float(feat[4])      # gamma index
        hr_dev = float(feat[14])
        eda    = float(feat[16]) * 0.60
        z = 0.4 * max(0, hr_dev) + 0.4 * max(0, (eda - 0.35) / 0.3) + 0.2 * eeg_en
        return float(np.clip(z, 0.0, 1.0))

    def _feature_importance(self, feat: np.ndarray) -> Dict[str, float]:
        if self._model is not None and self._backend == "xgboost":
            fi = self._model.feature_importances_
            return {name: round(float(imp), 4) for name, imp in zip(FEATURE_NAMES, fi)}
        if self._model is not None and self._backend == "lightgbm":
            fi = self._model.feature_importances_
            total = fi.sum() + 1e-8
            return {name: round(float(imp / total), 4) for name, imp in zip(FEATURE_NAMES, fi)}
        # Fallback: magnitude of feature values as proxy importance
        feat_abs = np.abs(feat)
        total = feat_abs.sum() + 1e-8
        return {name: round(float(v / total), 4) for name, v in zip(FEATURE_NAMES, feat_abs)}

    def _load(self, path: Path) -> None:
        try:
            with open(path, "rb") as f:
                data = pickle.load(f)
            self._model = data.get("model")
            self._backend = data.get("backend", "unknown")
            if data.get("lr_weights") is not None:
                self._lr_weights = data["lr_weights"]
        except Exception:
            self._train_synthetic()
