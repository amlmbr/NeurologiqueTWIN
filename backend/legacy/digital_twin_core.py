
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any, Optional, List
import time, uuid

@dataclass
class Event:
    id: str
    t: float
    type: str
    payload: Dict[str, Any]

class EventBus:
    def __init__(self):
        self._events: List[Event] = []
    def publish(self, type_: str, payload: Dict[str, Any]):
        self._events.append(Event(id=str(uuid.uuid4()), t=time.time(), type=type_, payload=payload))
    def drain(self) -> List[Event]:
        ev = self._events[:]
        self._events.clear()
        return ev

class DigitalTwin:
    """Agrège les features, appelle le prédicteur (ton modèle) et applique la politique d'alerte."""
    def __init__(self, predictor, bus: Optional[EventBus]=None, risk_threshold: float=0.8):
        self.predictor = predictor
        self.bus = bus or EventBus()
        self.risk_threshold = float(risk_threshold)
        self.last_pred: Optional[Dict[str, float]] = None
    def step(self, features: Dict[str, float], location: Optional[Dict[str, float]]=None):
        proba = float(self.predictor(features))
        self.last_pred = {"seizure_risk": proba}
        self.bus.publish("inference", {"risk": proba, "features": features})
        if proba >= self.risk_threshold:
            self.bus.publish("alert", {"risk": proba, "location": location or {}})
        return self.last_pred

def default_location():
    return {"lat": 33.238, "lon": -8.500}  # ENSA El Jadida approx

def maps_link(loc: Dict[str, float]) -> str:
    return f"https://www.google.com/maps?q={loc.get('lat')},{loc.get('lon')}"
