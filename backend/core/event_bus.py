"""
Event bus for the NeurologiqueTWIN digital twin system.
Implements a lightweight pub/sub mechanism for decoupling inference,
alerting, and emergency dispatch components.

Original source: SeizeIT2_CWGAN_RESNET_EEG/digital_twin_core.py
Refactored into production module with subscriber support.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


@dataclass
class Event:
    """Immutable event record published on the bus."""
    id: str
    t: float          # Unix timestamp of publication
    type: str         # Event type: "inference" | "alert" | "dispatch" | "arrived_patient" | ...
    payload: Dict[str, Any]


class EventBus:
    """
    Thread-local, in-memory pub/sub event bus.

    Usage::

        bus = EventBus()
        bus.subscribe("alert", lambda e: print("ALERT:", e.payload))
        bus.publish("inference", {"risk": 0.91})
        events = bus.drain()   # returns and clears the buffer
    """

    def __init__(self) -> None:
        self._events: List[Event] = []
        self._subscribers: Dict[str, List[Callable[[Event], None]]] = {}

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    def publish(self, type_: str, payload: Dict[str, Any]) -> Event:
        """Create an Event, store it, and notify synchronous subscribers."""
        ev = Event(
            id=str(uuid.uuid4()),
            t=time.time(),
            type=type_,
            payload=payload,
        )
        self._events.append(ev)
        for cb in self._subscribers.get(type_, []):
            try:
                cb(ev)
            except Exception:
                pass  # subscribers must not crash the inference loop
        return ev

    # ------------------------------------------------------------------
    # Subscribing
    # ------------------------------------------------------------------

    def subscribe(self, type_: str, callback: Callable[[Event], None]) -> None:
        """Register a synchronous callback for a given event type."""
        self._subscribers.setdefault(type_, []).append(callback)

    # ------------------------------------------------------------------
    # Draining
    # ------------------------------------------------------------------

    def drain(self) -> List[Event]:
        """Return all queued events and clear the internal buffer."""
        events = self._events[:]
        self._events.clear()
        return events

    def peek(self) -> List[Event]:
        """Return all queued events without clearing the buffer."""
        return list(self._events)

    def filter(self, type_: str) -> List[Event]:
        """Return buffered events of a given type (non-destructive)."""
        return [e for e in self._events if e.type == type_]
