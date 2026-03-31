"""
Time-Series → Image Transformations for NeurologiqueTWIN.

Converts 1-D EEG epochs into 2-D image representations that are fed to the
ResNet-CBAM classifier. Three encodings are supported:

  GASF  — Gramian Angular Summation Field
  MTF   — Markov Transition Field
  RP    — Recurrence Plot

These transforms are the core novelty of the signal encoding pipeline.
The resulting 64×64 images capture temporal structure in a format amenable
to standard convolutional architectures.

Original notebook: SeizeIT2_CWGAN_RESNET_EEG/notebooks/time_series_image.ipynb
Refactored as a production module with pure NumPy fallbacks (no pyts required).
"""

from __future__ import annotations

from typing import Dict, Literal, Optional

import numpy as np

# Optional: use pyts for reference-quality implementations
try:
    from pyts.image import GramianAngularField, MarkovTransitionField, RecurrencePlot
    _PYTS_AVAILABLE = True
except ImportError:
    _PYTS_AVAILABLE = False

IMAGE_SIZE = 64   # Default output resolution


# ---------------------------------------------------------------------------
# Individual transforms (pure NumPy fallbacks)
# ---------------------------------------------------------------------------

def gasf(signal: np.ndarray, image_size: int = IMAGE_SIZE) -> np.ndarray:
    """
    Gramian Angular Summation Field.

    1. Normalise signal to [-1, 1].
    2. Compute φ = arccos(normalised_signal).
    3. GASF[i, j] = cos(φ[i] + φ[j]).

    Captures temporal correlations while preserving ordering information.

    Parameters
    ----------
    signal : np.ndarray, shape (n,)
    image_size : int — output image resolution (default 64)

    Returns
    -------
    np.ndarray, shape (image_size, image_size), dtype float32, range [-1, 1]
    """
    if _PYTS_AVAILABLE:
        gaf = GramianAngularField(image_size=image_size, method="summation")
        return gaf.fit_transform(signal.reshape(1, -1))[0].astype(np.float32)

    # Pure NumPy implementation
    x = _resize_1d(signal, image_size)
    x = _minmax_scale(x, -1.0, 1.0)
    x = np.clip(x, -1.0, 1.0)
    phi = np.arccos(x)
    # GASF[i, j] = cos(phi_i + phi_j)
    result = np.cos(phi[:, None] + phi[None, :])
    return result.astype(np.float32)


def mtf(
    signal: np.ndarray,
    image_size: int = IMAGE_SIZE,
    n_bins: int = 8,
) -> np.ndarray:
    """
    Markov Transition Field.

    1. Quantise signal into n_bins bins.
    2. Compute transition frequency matrix W (n_bins × n_bins).
    3. Build MTF[i, j] = W[q_i, q_j].
    4. Down-sample to image_size × image_size.

    Captures probabilistic state transitions over time.

    Parameters
    ----------
    signal : np.ndarray, shape (n,)
    image_size : int
    n_bins : int — number of quantisation bins (default 8)

    Returns
    -------
    np.ndarray, shape (image_size, image_size), dtype float32, range [0, 1]
    """
    if _PYTS_AVAILABLE:
        mtf_ = MarkovTransitionField(image_size=image_size, n_bins=n_bins)
        return mtf_.fit_transform(signal.reshape(1, -1))[0].astype(np.float32)

    n = len(signal)
    bins = np.linspace(signal.min(), signal.max() + 1e-8, n_bins + 1)
    q = np.digitize(signal, bins) - 1
    q = np.clip(q, 0, n_bins - 1)

    # Transition frequency matrix
    W = np.zeros((n_bins, n_bins), dtype=np.float64)
    for a, b in zip(q[:-1], q[1:]):
        W[a, b] += 1.0
    row_sums = W.sum(axis=1, keepdims=True)
    W /= np.where(row_sums == 0, 1.0, row_sums)

    # MTF[i, j] = W[q_i, q_j] for all i, j
    full_mtf = W[q[:, None], q[None, :]]

    # Down-sample to image_size
    result = _resize_2d(full_mtf, image_size)
    return result.astype(np.float32)


def recurrence_plot(
    signal: np.ndarray,
    image_size: int = IMAGE_SIZE,
    threshold: Optional[float] = None,
    percentage: float = 0.1,
) -> np.ndarray:
    """
    Recurrence Plot (binary or continuous).

    RP[i, j] = ||X[i] - X[j]||  (continuous)
    or
    RP[i, j] = 1 if ||X[i] - X[j]|| ≤ ε  (binary, when threshold is set)

    Reveals recurrent patterns and periodicities in the EEG signal.

    Parameters
    ----------
    signal : np.ndarray, shape (n,)
    image_size : int
    threshold : float, optional — if set, return binary plot
    percentage : float — fraction of maximum distance used as threshold
                          when threshold is None but binary output wanted

    Returns
    -------
    np.ndarray, shape (image_size, image_size), dtype float32, range [0, 1]
    """
    if _PYTS_AVAILABLE:
        rp = RecurrencePlot(threshold=threshold, percentage=percentage * 100)
        raw = rp.fit_transform(signal.reshape(1, -1))[0].astype(np.float32)
        # pyts RP output size == len(signal); always resize to image_size
        if raw.shape[0] != image_size:
            raw = _resize_2d(raw, image_size).astype(np.float32)
        return raw

    x = _resize_1d(signal, image_size)
    x = _minmax_scale(x, 0.0, 1.0)

    # Pairwise L2 distance matrix
    dist = np.abs(x[:, None] - x[None, :])

    if threshold is not None:
        result = (dist <= threshold).astype(np.float32)
    else:
        # Normalise to [0, 1] — continuous recurrence
        dmax = dist.max()
        result = 1.0 - dist / (dmax + 1e-8)

    return result.astype(np.float32)


# ---------------------------------------------------------------------------
# RGB fusion
# ---------------------------------------------------------------------------

def to_rgb(
    signal: np.ndarray,
    image_size: int = IMAGE_SIZE,
    n_bins: int = 8,
) -> np.ndarray:
    """
    Compute all three transforms and stack as RGB channels.

    Channel R = GASF  (scaled to [0, 255])
    Channel G = MTF   (scaled to [0, 255])
    Channel B = RP    (scaled to [0, 255])

    This is the exact representation used to train the ResNet-CBAM models.

    Parameters
    ----------
    signal : np.ndarray, shape (n,)
    image_size : int

    Returns
    -------
    np.ndarray, shape (image_size, image_size, 3), dtype float32, range [0, 1]
    """
    g = gasf(signal, image_size)
    m = mtf(signal, image_size, n_bins=n_bins)
    r = recurrence_plot(signal, image_size)

    # Normalise each channel to [0, 1]
    def norm01(x):
        lo, hi = x.min(), x.max()
        return (x - lo) / (hi - lo + 1e-8)

    rgb = np.stack([norm01(g), norm01(m), norm01(r)], axis=-1)
    return rgb.astype(np.float32)


# ---------------------------------------------------------------------------
# Convenience class
# ---------------------------------------------------------------------------

class TimeSeriesTransformer:
    """
    High-level wrapper for time-series image transforms.

    Parameters
    ----------
    image_size : int — output image resolution (default 64)
    n_bins : int — MTF quantisation bins (default 8)
    """

    def __init__(self, image_size: int = IMAGE_SIZE, n_bins: int = 8) -> None:
        self.image_size = image_size
        self.n_bins = n_bins

    def transform(
        self,
        signal: np.ndarray,
        method: Literal["gasf", "mtf", "rp", "rgb"] = "rgb",
    ) -> np.ndarray:
        """
        Transform a 1-D EEG epoch into a 2-D image.

        Parameters
        ----------
        signal : np.ndarray, shape (n,)
        method : "gasf" | "mtf" | "rp" | "rgb" (default: RGB fusion)

        Returns
        -------
        np.ndarray — 2-D (H, W) or 3-D (H, W, 3) float32 image in [0, 1]
        """
        if method == "gasf":
            return gasf(signal, self.image_size)
        if method == "mtf":
            return mtf(signal, self.image_size, n_bins=self.n_bins)
        if method == "rp":
            return recurrence_plot(signal, self.image_size)
        return to_rgb(signal, self.image_size, n_bins=self.n_bins)

    def transform_all(self, signal: np.ndarray) -> Dict[str, np.ndarray]:
        """Return all four representations as a dict."""
        return {
            "gasf": gasf(signal, self.image_size),
            "mtf":  mtf(signal, self.image_size, self.n_bins),
            "rp":   recurrence_plot(signal, self.image_size),
            "rgb":  to_rgb(signal, self.image_size, self.n_bins),
        }


# ---------------------------------------------------------------------------
# Internal utilities
# ---------------------------------------------------------------------------

def _minmax_scale(x: np.ndarray, lo: float = 0.0, hi: float = 1.0) -> np.ndarray:
    x_min, x_max = x.min(), x.max()
    denom = x_max - x_min if x_max != x_min else 1.0
    return (x - x_min) / denom * (hi - lo) + lo


def _resize_1d(x: np.ndarray, n: int) -> np.ndarray:
    """Down/up-sample a 1-D array to length n using linear interpolation."""
    if len(x) == n:
        return x
    idx = np.linspace(0, len(x) - 1, n)
    return np.interp(idx, np.arange(len(x)), x)


def _resize_2d(x: np.ndarray, n: int) -> np.ndarray:
    """Bilinear resize of a 2-D array to (n, n)."""
    h, w = x.shape
    row_idx = np.linspace(0, h - 1, n)
    col_idx = np.linspace(0, w - 1, n)
    ri = np.floor(row_idx).astype(int).clip(0, h - 2)
    ci = np.floor(col_idx).astype(int).clip(0, w - 2)
    dr = row_idx - ri
    dc = col_idx - ci
    result = (
        x[ri[:, None], ci[None, :]] * (1 - dr[:, None]) * (1 - dc[None, :])
        + x[ri[:, None] + 1, ci[None, :]] * dr[:, None] * (1 - dc[None, :])
        + x[ri[:, None], ci[None, :] + 1] * (1 - dr[:, None]) * dc[None, :]
        + x[ri[:, None] + 1, ci[None, :] + 1] * dr[:, None] * dc[None, :]
    )
    return result
