"""
Digital Twin Core Engine — NeurologiqueTWIN
===========================================

Implements a **dynamic, stateful digital twin** of a neurological patient.

The twin maintains an internal probabilistic state machine with four clinical
states and updates it at each inference step using a risk-modulated Markov
transition function.  This makes it a *true dynamic system*: state at time t+1
is a function of both state at time t and the model input at time t.

State machine
-------------
  0 normal     — baseline physiology, no seizure precursors
  1 preictal   — measurable physiological changes precede seizure (~5–30 min)
  2 ictal      — active seizure (tonic, clonic, absence, etc.)
  3 postictal  — post-seizure recovery phase (fatigue, confusion)

Transition function
-------------------
  P(s_{t+1} | s_t, r_t)

where r_t ∈ [0,1] is the seizure risk score at time t.

Base transition matrix (from clinical literature):

          → normal  preictal  ictal  postictal
  normal      0.94    0.06     0.00    0.00
  preictal    0.08    0.62     0.30    0.00
  ictal       0.00    0.05     0.55    0.40
  postictal   0.20    0.00     0.00    0.80

Risk modulation:
  - High risk (r > 0.7) boosts transitions toward more severe states.
  - Low risk (r < 0.2) boosts recovery transitions.
  - Applied as: P_eff = softmax(log(P_base) + alpha * risk_bias)

Temporal memory
---------------
  - Rolling history window (configurable length, default 60 steps).
  - Exponential moving average of risk for smooth trend detection.
  - Linear regression slope over history = trend indicator.

Alert policy
------------
  - Alert fires when risk ≥ threshold AND consecutive_high_count ≥ min_consec.
  - Minimum cooldown between alerts (default 30 s) prevents alert storms.
  - Alert includes location, risk, state, trend, and Google Maps link.

Original source: SeizeIT2_CWGAN_RESNET_EEG/digital_twin_core.py
Upgraded: Markov state machine, EMA smoothing, trend analysis, alert cooldown.
"""

from __future__ import annotations

import math
import time
from collections import deque
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple

import numpy as np

from .event_bus import Event, EventBus


# ---------------------------------------------------------------------------
# Geographic helpers
# ---------------------------------------------------------------------------

def default_location() -> Dict[str, float]:
    """Default location: ENSA El Jadida — project origin."""
    return {"lat": 33.238, "lon": -8.500}


def maps_link(loc: Dict[str, float]) -> str:
    return f"https://www.google.com/maps?q={loc.get('lat', 0)},{loc.get('lon', 0)}"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# State definitions
# ---------------------------------------------------------------------------

STATES = ["normal", "preictal", "ictal", "postictal"]
STATE_IDX = {s: i for i, s in enumerate(STATES)}

# Base clinical transition matrix P[from, to]
# Rows: current state.  Columns: next state.
# Derived from published EEG seizure dynamics literature.
_BASE_TRANSITION = np.array([
    # normal  preictal  ictal  postictal
    [0.94,   0.06,    0.00,  0.00],   # from normal
    [0.08,   0.62,    0.30,  0.00],   # from preictal
    [0.00,   0.05,    0.55,  0.40],   # from ictal
    [0.20,   0.00,    0.00,  0.80],   # from postictal
], dtype=np.float64)

# Risk bias vectors: how much each state's log-probability increases with risk
# Shape (4,4): bias[from_state, to_state]
_RISK_BIAS = np.array([
    # normal  preictal  ictal  postictal
    [-0.5,   +0.5,    0.00,  0.00],   # from normal: high risk → preictal
    [-0.3,   -0.2,   +0.5,  0.00],   # from preictal: high risk → ictal
    [0.00,    0.00,  +0.2,  -0.2],   # from ictal: high risk → stays ictal
    [+0.3,   0.00,   0.00,  -0.3],   # from postictal: low risk → faster recovery
], dtype=np.float64)


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


def _compute_transition(from_state: int, risk: float) -> np.ndarray:
    """
    Compute the risk-modulated transition distribution from from_state.

    P_eff[to] = softmax(log(P_base[from, :]) + alpha * bias[from, :])

    where alpha = risk (∈ [0,1]) scales the risk bias.
    """
    base_row = _BASE_TRANSITION[from_state]
    # Replace zeros with small epsilon before log
    log_base = np.log(np.clip(base_row, 1e-9, 1.0))
    bias = _RISK_BIAS[from_state]
    log_eff = log_base + float(risk) * bias
    return _softmax(log_eff)


# ---------------------------------------------------------------------------
# Digital Twin
# ---------------------------------------------------------------------------

class DigitalTwin:
    """
    Dynamic neurological digital twin with Markov state transitions.

    Parameters
    ----------
    predictor : Callable
        f(features: dict) → float — returns P(seizure) ∈ [0, 1].
    bus : EventBus, optional
    risk_threshold : float
        Alert fires when risk ≥ threshold (default 0.75).
    history_len : int
        Rolling window size for trend computation (default 60).
    alert_cooldown_s : float
        Minimum seconds between two alerts (default 30).
    min_consecutive : int
        Number of consecutive high-risk steps before first alert (default 2).
    ema_alpha : float
        Exponential moving average smoothing factor ∈ (0,1] (default 0.3).
        Lower → more smoothing; higher → more reactive.
    deterministic : bool
        If True, state transitions use argmax instead of stochastic sampling.
        Use True for reproducibility / testing.
    """

    def __init__(
        self,
        predictor: Callable[[Dict[str, Any]], float],
        bus: Optional[EventBus] = None,
        risk_threshold: float = 0.75,
        history_len: int = 60,
        alert_cooldown_s: float = 30.0,
        min_consecutive: int = 2,
        ema_alpha: float = 0.30,
        deterministic: bool = False,
    ) -> None:
        self.predictor = predictor
        self.bus = bus or EventBus()
        self.risk_threshold = float(risk_threshold)
        self.history_len = history_len
        self.alert_cooldown_s = alert_cooldown_s
        self.min_consecutive = min_consecutive
        self.ema_alpha = ema_alpha
        self.deterministic = deterministic

        # Internal state
        self._state_idx: int = 0            # Start in "normal"
        self._history: Deque[Tuple[float, float]] = deque(maxlen=history_len)
        self._risk_ema: float = 0.0         # Exponential moving average of risk
        self._consecutive_high: int = 0     # Consecutive steps above threshold
        self._last_alert_t: float = 0.0
        self.last_pred: Optional[Dict[str, Any]] = None

    # ------------------------------------------------------------------
    # Main inference step
    # ------------------------------------------------------------------

    def step(
        self,
        features: Dict[str, Any],
        location: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        One inference step of the digital twin.

        1. Call predictor → raw_risk ∈ [0, 1]
        2. Apply EMA smoothing → smooth_risk
        3. Update Markov state: P(s_{t+1} | s_t, smooth_risk)
        4. Record history, compute trend
        5. Apply alert policy

        Returns
        -------
        dict
            seizure_risk, smooth_risk, raw_risk, state, trend,
            risk_trend_label, state_distribution, maps_link, timestamp
        """
        raw_risk = float(self.predictor(features))

        # EMA smoothing
        self._risk_ema = (
            self.ema_alpha * raw_risk
            + (1.0 - self.ema_alpha) * self._risk_ema
        )
        smooth_risk = self._risk_ema

        # Markov state transition
        probs = _compute_transition(self._state_idx, smooth_risk)
        if self.deterministic:
            next_idx = int(np.argmax(probs))
        else:
            next_idx = int(np.random.choice(len(STATES), p=probs))
        self._state_idx = next_idx
        state = STATES[self._state_idx]

        # History + trend
        now = time.time()
        self._history.append((now, smooth_risk))
        trend = self._compute_trend()
        risk_trend_label = self._trend_label(trend)

        # Alert policy
        if smooth_risk >= self.risk_threshold:
            self._consecutive_high += 1
        else:
            self._consecutive_high = 0

        loc = location or default_location()
        alert_fired = False

        if (
            self._consecutive_high >= self.min_consecutive
            and (now - self._last_alert_t) >= self.alert_cooldown_s
        ):
            self._last_alert_t = now
            alert_fired = True
            self.bus.publish("alert", {
                "raw_risk":    raw_risk,
                "smooth_risk": smooth_risk,
                "state":       state,
                "trend":       trend,
                "location":    loc,
                "maps_link":   maps_link(loc),
                "consecutive_high": self._consecutive_high,
            })

        result: Dict[str, Any] = {
            "seizure_risk":      smooth_risk,       # Use smoothed for display
            "raw_risk":          raw_risk,
            "smooth_risk":       smooth_risk,
            "state":             state,
            "state_distribution": {s: float(p) for s, p in zip(STATES, probs)},
            "trend":             trend,
            "risk_trend_label":  risk_trend_label,
            "alert_fired":       alert_fired,
            "consecutive_high":  self._consecutive_high,
            "maps_link":         maps_link(loc),
            "timestamp":         now,
            "features":          features,
        }
        self.last_pred = result

        self.bus.publish("inference", {
            "raw_risk": raw_risk,
            "smooth_risk": smooth_risk,
            "state": state,
            "trend": trend,
        })
        return result

    # ------------------------------------------------------------------
    # State introspection
    # ------------------------------------------------------------------

    @property
    def state(self) -> str:
        return STATES[self._state_idx]

    @property
    def risk_ema(self) -> float:
        return self._risk_ema

    def get_history(self) -> List[Dict[str, float]]:
        return [{"t": t, "risk": r} for t, r in self._history]

    def get_state_distribution(self) -> Dict[str, float]:
        """Return current state transition probabilities."""
        probs = _compute_transition(self._state_idx, self._risk_ema)
        return {s: float(p) for s, p in zip(STATES, probs)}

    def reset(self) -> None:
        self._state_idx = 0
        self._history.clear()
        self._risk_ema = 0.0
        self._consecutive_high = 0
        self._last_alert_t = 0.0
        self.last_pred = None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _compute_trend(self) -> float:
        """Linear regression slope of EMA risk over the history window (per second)."""
        if len(self._history) < 3:
            return 0.0
        ts = np.array([h[0] for h in self._history])
        vs = np.array([h[1] for h in self._history])
        t0 = ts[0]
        xs = ts - t0
        n = len(xs)
        sx = xs.sum(); sy = vs.sum()
        sxx = (xs ** 2).sum(); sxy = (xs * vs).sum()
        denom = n * sxx - sx * sx
        if abs(denom) < 1e-12:
            return 0.0
        return float((n * sxy - sx * sy) / denom)

    @staticmethod
    def _trend_label(slope: float) -> str:
        if slope > 0.005:
            return "rising"
        if slope < -0.005:
            return "falling"
        return "stable"
