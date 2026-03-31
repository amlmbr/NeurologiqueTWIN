"""
EEG Signal Processor for NeurologiqueTWIN.

Implements the preprocessing pipeline used in the SeizeIT2 dataset preparation:
  1. Band-pass filtering (0.5 – 50 Hz) to remove DC drift and high-frequency noise
  2. Notch filtering at 50/60 Hz to remove power-line interference
  3. Wavelet denoising (db4) to suppress muscle/ocular artifacts
  4. Robust normalisation to [-1, 1] range
  5. Epoch segmentation (sliding window)

The output of this module feeds directly into the TimeSeriesTransformer
which converts 1-D EEG segments into 64×64 images (GASF / MTF / RP).

Original pipeline from: SeizeIT2_CWGAN_RESNET_EEG/seizeit2_preparation.ipynb
"""

from __future__ import annotations

from typing import List, Optional, Tuple

import numpy as np


class EEGProcessor:
    """
    End-to-end EEG preprocessing pipeline.

    Parameters
    ----------
    fs : float
        Sampling frequency in Hz (default 256 Hz — SeizeIT2 standard).
    lowcut : float
        Low-frequency cutoff for band-pass filter (default 0.5 Hz).
    highcut : float
        High-frequency cutoff for band-pass filter (default 50 Hz).
    notch_freq : float
        Notch filter frequency to remove power-line noise (default 50 Hz).
    epoch_len_s : float
        Epoch length in seconds for segmentation (default 4 s).
    overlap : float
        Fractional overlap between consecutive epochs, ∈ [0, 1) (default 0.5).
    wavelet : str
        PyWavelets wavelet family for denoising (default "db4").
    wavelet_level : int
        Decomposition level for wavelet denoising (default 4).
    """

    def __init__(
        self,
        fs: float = 256.0,
        lowcut: float = 0.5,
        highcut: float = 50.0,
        notch_freq: float = 50.0,
        epoch_len_s: float = 4.0,
        overlap: float = 0.5,
        wavelet: str = "db4",
        wavelet_level: int = 4,
    ) -> None:
        self.fs = fs
        self.lowcut = lowcut
        self.highcut = highcut
        self.notch_freq = notch_freq
        self.epoch_len_s = epoch_len_s
        self.overlap = overlap
        self.wavelet = wavelet
        self.wavelet_level = wavelet_level

        self._epoch_samples = int(fs * epoch_len_s)
        self._step_samples = int(self._epoch_samples * (1 - overlap))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(self, raw: np.ndarray) -> np.ndarray:
        """
        Full preprocessing pipeline on a single-channel EEG signal.

        Parameters
        ----------
        raw : np.ndarray, shape (n_samples,)

        Returns
        -------
        np.ndarray, shape (n_samples,)
            Preprocessed, normalised signal.
        """
        x = raw.astype(np.float64).copy()
        x = self._bandpass(x)
        x = self._notch(x)
        x = self._wavelet_denoise(x)
        x = self._normalise(x)
        return x.astype(np.float32)

    def segment(self, signal: np.ndarray) -> np.ndarray:
        """
        Slice a preprocessed signal into overlapping epochs.

        Parameters
        ----------
        signal : np.ndarray, shape (n_samples,)

        Returns
        -------
        np.ndarray, shape (n_epochs, epoch_samples)
        """
        epochs: List[np.ndarray] = []
        start = 0
        while start + self._epoch_samples <= len(signal):
            epochs.append(signal[start: start + self._epoch_samples])
            start += self._step_samples
        return np.stack(epochs) if epochs else np.empty((0, self._epoch_samples), dtype=np.float32)

    def process_and_segment(self, raw: np.ndarray) -> np.ndarray:
        """Convenience: preprocess then segment."""
        return self.segment(self.process(raw))

    # ------------------------------------------------------------------
    # Spectral features
    # ------------------------------------------------------------------

    def spectral_energy(self, epoch: np.ndarray) -> float:
        """
        Normalised EEG spectral energy in the 1–30 Hz band.
        Used as the ``eeg_energy`` feature fed to the DigitalTwin.
        """
        fft = np.fft.rfft(epoch)
        freqs = np.fft.rfftfreq(len(epoch), d=1.0 / self.fs)
        mask = (freqs >= 1.0) & (freqs <= 30.0)
        power = np.abs(fft[mask]) ** 2
        total = np.abs(fft) ** 2
        return float(power.sum() / (total.sum() + 1e-12))

    def band_powers(self, epoch: np.ndarray) -> dict:
        """
        Return power in canonical EEG frequency bands.

        Returns
        -------
        dict with keys: delta, theta, alpha, beta, gamma
        """
        fft = np.fft.rfft(epoch)
        freqs = np.fft.rfftfreq(len(epoch), d=1.0 / self.fs)
        power = np.abs(fft) ** 2
        total = power.sum() + 1e-12

        def band(lo, hi):
            return float(power[(freqs >= lo) & (freqs < hi)].sum() / total)

        return {
            "delta": band(0.5, 4.0),
            "theta": band(4.0, 8.0),
            "alpha": band(8.0, 13.0),
            "beta":  band(13.0, 30.0),
            "gamma": band(30.0, 50.0),
        }

    # ------------------------------------------------------------------
    # Private DSP helpers (pure NumPy — no scipy dependency required)
    # ------------------------------------------------------------------

    def _bandpass(self, x: np.ndarray) -> np.ndarray:
        """FFT-based band-pass filter (zero-phase)."""
        fft = np.fft.rfft(x)
        freqs = np.fft.rfftfreq(len(x), d=1.0 / self.fs)
        fft[(freqs < self.lowcut) | (freqs > self.highcut)] = 0.0
        return np.fft.irfft(fft, n=len(x))

    def _notch(self, x: np.ndarray, bw: float = 1.0) -> np.ndarray:
        """FFT-based notch filter (zero-phase) at notch_freq ± bw Hz."""
        fft = np.fft.rfft(x)
        freqs = np.fft.rfftfreq(len(x), d=1.0 / self.fs)
        mask = np.abs(freqs - self.notch_freq) < bw
        fft[mask] = 0.0
        return np.fft.irfft(fft, n=len(x))

    def _wavelet_denoise(self, x: np.ndarray) -> np.ndarray:
        """
        Wavelet soft-thresholding denoising using PyWavelets (if available).
        Falls back to a simple moving-average smoother.
        """
        try:
            import pywt
            coeffs = pywt.wavedec(x, self.wavelet, level=self.wavelet_level)
            # Universal threshold (Donoho–Johnstone)
            sigma = np.median(np.abs(coeffs[-1])) / 0.6745
            thr = sigma * np.sqrt(2 * np.log(len(x)))
            coeffs_thr = [pywt.threshold(c, thr, mode="soft") for c in coeffs]
            return pywt.waverec(coeffs_thr, self.wavelet)[: len(x)]
        except ImportError:
            # Fallback: 5-point moving average
            kernel = np.ones(5) / 5.0
            return np.convolve(x, kernel, mode="same")

    @staticmethod
    def _normalise(x: np.ndarray) -> np.ndarray:
        """Robust normalisation to [-1, 1] using the 5th/95th percentile."""
        p5, p95 = np.percentile(x, [5, 95])
        denom = max(p95 - p5, 1e-8)
        return np.clip((x - p5) / denom * 2.0 - 1.0, -1.0, 1.0)
