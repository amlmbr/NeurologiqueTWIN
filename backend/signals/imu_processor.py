"""
IMU / Wearable Signal Processor for NeurologiqueTWIN.

Handles data streams from wearable devices (Apple Watch, Empatica E4, etc.):
  - Photoplethysmography (PPG) → Heart Rate (HR) and HRV
  - Galvanic Skin Response / EDA (Electrodermal Activity)
  - Accelerometer (3-axis) → activity classification, step counting
  - Gyroscope (3-axis) → tremor / motor seizure detection

This module is a NEW addition to the original SeizeIT2 pipeline.
It bridges the gap between raw wearable sensor data and the physiological
feature dictionary expected by the DigitalTwin engine.

Scientific basis
----------------
- HR/HRV are established pre-ictal markers (Kolsal et al., 2018)
- EDA reflects sympathetic nervous system activation during seizures
- Accelerometry detects tonic-clonic movements (Beniczky et al., 2013)
- The 72-hour predictive window is inspired by the apple_watch_alert_simulation
  in the original codebase (apple_watch_alert_simulation.py)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class WearableFeatures:
    """Structured output from the IMU processor."""
    hr: float           # Heart rate (bpm)
    hrv_rmssd: float    # HRV — root mean square of successive differences (ms)
    eda: float          # Skin conductance (µS)
    steps_per_hour: float
    activity_level: str         # "rest" | "light" | "moderate" | "vigorous"
    tremor_index: float         # 0–1, elevated during tonic-clonic events
    stress_index: float         # 0–1 composite from HR, HRV, EDA
    raw: Dict[str, float]

    def to_twin_features(self) -> Dict[str, float]:
        """Return a feature dict compatible with DigitalTwin.step()."""
        return {
            "hr": self.hr,
            "hrv": self.hrv_rmssd,
            "eda": self.eda,
            "steps": self.steps_per_hour,
            "stress": self.stress_index,
            "tremor": self.tremor_index,
        }


# ---------------------------------------------------------------------------
# Processor
# ---------------------------------------------------------------------------

class IMUProcessor:
    """
    Processes raw wearable sensor streams into physiological features.

    Parameters
    ----------
    fs_ppg : float
        Sampling rate of the PPG signal in Hz (default 64 Hz — Apple Watch).
    fs_acc : float
        Sampling rate of the accelerometer in Hz (default 50 Hz).
    fs_eda : float
        Sampling rate of the EDA/GSR sensor in Hz (default 4 Hz).
    hr_baseline : float
        Patient-specific resting HR baseline (default 72 bpm).
    eda_baseline : float
        Patient-specific resting EDA baseline (default 0.35 µS).
    """

    def __init__(
        self,
        fs_ppg: float = 64.0,
        fs_acc: float = 50.0,
        fs_eda: float = 4.0,
        hr_baseline: float = 72.0,
        eda_baseline: float = 0.35,
    ) -> None:
        self.fs_ppg = fs_ppg
        self.fs_acc = fs_acc
        self.fs_eda = fs_eda
        self.hr_baseline = hr_baseline
        self.eda_baseline = eda_baseline

    # ------------------------------------------------------------------
    # Heart Rate / HRV from PPG
    # ------------------------------------------------------------------

    def ppg_to_hr_hrv(self, ppg: np.ndarray) -> Tuple[float, float]:
        """
        Estimate HR (bpm) and HRV-RMSSD (ms) from a raw PPG segment.

        Parameters
        ----------
        ppg : np.ndarray, shape (n_samples,)
            Raw PPG signal sampled at fs_ppg Hz.

        Returns
        -------
        hr : float — estimated heart rate in bpm
        hrv_rmssd : float — RMSSD in milliseconds
        """
        ppg = ppg - np.mean(ppg)

        # Peak detection: simple threshold-based (fast, no scipy dependency)
        peaks = self._detect_peaks(ppg, min_distance=int(self.fs_ppg * 0.4))

        if len(peaks) < 2:
            return self.hr_baseline, 50.0

        rr_samples = np.diff(peaks)
        rr_ms = rr_samples / self.fs_ppg * 1000.0

        hr = float(60_000.0 / np.mean(rr_ms))
        hrv_rmssd = float(np.sqrt(np.mean(np.diff(rr_ms) ** 2)))

        return np.clip(hr, 30.0, 220.0), np.clip(hrv_rmssd, 5.0, 150.0)

    # ------------------------------------------------------------------
    # EDA / GSR
    # ------------------------------------------------------------------

    def process_eda(self, eda: np.ndarray) -> float:
        """
        Compute tonic skin conductance level (SCL) from raw EDA.

        Parameters
        ----------
        eda : np.ndarray, shape (n_samples,)

        Returns
        -------
        float — mean skin conductance in µS
        """
        # Low-pass filter to extract tonic component (SCL)
        eda_smooth = self._moving_average(eda, window=max(1, int(self.fs_eda * 4)))
        return float(np.clip(np.mean(eda_smooth), 0.0, 20.0))

    # ------------------------------------------------------------------
    # Accelerometer
    # ------------------------------------------------------------------

    def process_accelerometer(self, acc: np.ndarray) -> Dict[str, float]:
        """
        Extract activity and tremor features from triaxial accelerometer.

        Parameters
        ----------
        acc : np.ndarray, shape (n_samples, 3) — [ax, ay, az] in m/s²

        Returns
        -------
        dict with keys: activity_level (str), steps_per_hour (float),
                        tremor_index (float), magnitude_rms (float)
        """
        mag = np.sqrt(np.sum(acc ** 2, axis=1))
        mag_ac = mag - np.mean(mag)       # Remove gravity component (DC)
        rms = float(np.sqrt(np.mean(mag_ac ** 2)))

        # Step estimation: count zero-crossings in vertical axis
        steps = self._count_steps(acc[:, 2], self.fs_acc)

        # Tremor index: power in 3–10 Hz band (pathological tremor range)
        tremor = self._tremor_index(mag_ac, self.fs_acc)

        # Activity classification by RMS magnitude
        if rms < 0.1:
            activity = "rest"
        elif rms < 0.5:
            activity = "light"
        elif rms < 1.5:
            activity = "moderate"
        else:
            activity = "vigorous"

        return {
            "activity_level": activity,
            "steps_per_hour": steps,
            "tremor_index": tremor,
            "magnitude_rms": rms,
        }

    # ------------------------------------------------------------------
    # Composite stress index
    # ------------------------------------------------------------------

    def compute_stress(
        self, hr: float, hrv_rmssd: float, eda: float
    ) -> float:
        """
        Compute a 0–1 stress index from HR, HRV, and EDA.

        Based on the scoring function in apple_watch_alert_simulation.py:
        risk_score = 30 + 15*HR_dev + 20*HRV_dev + 15*EDA_dev
        Adapted here as a weighted z-score mapped through a sigmoid.
        """
        hr_z  = (hr  - self.hr_baseline)  / 15.0
        hrv_z = (50.0 - hrv_rmssd)        / 15.0   # inverted: low HRV = stress
        eda_z = (eda - self.eda_baseline)  / 0.20

        raw = 0.40 * hr_z + 0.35 * hrv_z + 0.25 * eda_z
        return float(np.clip(1 / (1 + np.exp(-raw)), 0.0, 1.0))

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def process(
        self,
        ppg: Optional[np.ndarray] = None,
        acc: Optional[np.ndarray] = None,
        eda_raw: Optional[np.ndarray] = None,
        hr_override: Optional[float] = None,
        eda_override: Optional[float] = None,
    ) -> WearableFeatures:
        """
        Process all available sensor streams and return WearableFeatures.

        Accepts any combination of raw signals or scalar overrides.
        """
        # HR / HRV
        if ppg is not None and len(ppg) > 10:
            hr, hrv = self.ppg_to_hr_hrv(ppg)
        else:
            hr  = float(hr_override)  if hr_override  is not None else self.hr_baseline
            hrv = 50.0

        # EDA
        if eda_raw is not None and len(eda_raw) > 1:
            eda = self.process_eda(eda_raw)
        else:
            eda = float(eda_override) if eda_override is not None else self.eda_baseline

        # Accelerometer
        acc_feats: Dict[str, float] = {
            "activity_level": "rest",
            "steps_per_hour": 0.0,
            "tremor_index": 0.0,
            "magnitude_rms": 0.0,
        }
        if acc is not None and acc.ndim == 2 and acc.shape[1] == 3:
            acc_feats = self.process_accelerometer(acc)

        stress = self.compute_stress(hr, hrv, eda)

        return WearableFeatures(
            hr=hr,
            hrv_rmssd=hrv,
            eda=eda,
            steps_per_hour=float(acc_feats["steps_per_hour"]),
            activity_level=str(acc_feats["activity_level"]),
            tremor_index=float(acc_feats["tremor_index"]),
            stress_index=stress,
            raw={
                "hr": hr, "hrv": hrv, "eda": eda,
                "steps": acc_feats["steps_per_hour"],
                "tremor": acc_feats["tremor_index"],
                "activity": acc_feats["magnitude_rms"],
            },
        )

    # ------------------------------------------------------------------
    # Signal processing utilities
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_peaks(x: np.ndarray, min_distance: int = 25) -> np.ndarray:
        """Simple local-maximum peak detector."""
        peaks = []
        last = -min_distance
        for i in range(1, len(x) - 1):
            if x[i] > x[i - 1] and x[i] > x[i + 1] and x[i] > 0.3 * x.max():
                if i - last >= min_distance:
                    peaks.append(i)
                    last = i
        return np.array(peaks, dtype=int)

    @staticmethod
    def _moving_average(x: np.ndarray, window: int) -> np.ndarray:
        kernel = np.ones(window) / window
        return np.convolve(x, kernel, mode="same")

    @staticmethod
    def _count_steps(z_acc: np.ndarray, fs: float) -> float:
        """Estimate steps from vertical accelerometer axis (zero-crossing method)."""
        z = z_acc - np.mean(z_acc)
        crossings = np.where(np.diff(np.sign(z)))[0]
        steps_raw = len(crossings) / 2.0
        duration_hours = len(z_acc) / fs / 3600.0
        return float(steps_raw / (duration_hours + 1e-8))

    @staticmethod
    def _tremor_index(mag_ac: np.ndarray, fs: float) -> float:
        """
        Fraction of signal power in the 3–10 Hz tremor band.
        Elevated during tonic-clonic seizures.
        """
        fft = np.fft.rfft(mag_ac)
        freqs = np.fft.rfftfreq(len(mag_ac), d=1.0 / fs)
        power = np.abs(fft) ** 2
        total = power.sum() + 1e-12
        tremor_power = power[(freqs >= 3.0) & (freqs <= 10.0)].sum()
        return float(np.clip(tremor_power / total, 0.0, 1.0))
