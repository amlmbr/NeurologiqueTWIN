
from typing import List, Dict, Any, Optional, Tuple
import math, random

try:
    from mesa import Model, Agent
    from mesa.time import RandomActivation
except Exception:
    class Agent:
        def __init__(self, unique_id, model): self.unique_id, self.model = unique_id, model
        def step(self): pass
    class RandomActivation:
        def __init__(self, model): self.model, self.agents = model, []
        def add(self, a): self.agents.append(a)
        def step(self):
            for a in list(self.agents): a.step()
    class Model:
        def __init__(self): pass

from digital_twin_core import DigitalTwin, maps_link

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2-lat1); dlon = math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    c = 2*math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R*c

def interp_geo(lat1, lon1, lat2, lon2, t):
    return lat1 + (lat2-lat1)*t, lon1 + (lon2-lon1)*t

class Patient(Agent):
    def __init__(self, unique_id, model, name: str, lat: float, lon: float):
        super().__init__(unique_id, model)
        self.name = name; self.lat, self.lon = lat, lon
        self.state = "stable"; self.t = 0
        self.hr_base = random.gauss(72,3)
        self.eda_base = random.gauss(0.32,0.03)
        self.eeg_en = 0.08
    def step(self):
        self.t += 1
        pre_t = self.model.params.get("preictal_start", 6)
        ict_t = self.model.params.get("ictal_start", 12)
        if self.t >= ict_t: self.state = "ictal"
        elif self.t >= pre_t: self.state = "preictal"
        else: self.state = "stable"
        hr = self.hr_base; eda = self.eda_base; eeg = self.eeg_en
        if self.state in ("preictal","ictal"):
            hr += 14 + random.gauss(0,2); eda += 0.18 + random.gauss(0,0.03); eeg += 0.35
        self.model.live.setdefault("patients", {})[self.unique_id] = {
            "name": self.name, "lat": self.lat, "lon": self.lon, "state": self.state,
            "HR": float(hr), "EDA": float(eda), "EEG_EN": float(min(1.0, eeg))
        }

class WatchTwin(Agent):
    def __init__(self, unique_id, model, twin: DigitalTwin, patient_id: int):
        super().__init__(unique_id, model)
        self.twin = twin; self.pid = patient_id; self.last_risk = 0.0
    def step(self):
        p = self.model.live.get("patients", {}).get(self.pid)
        if not p: return
        feats = {"hr": p["HR"], "eda": p["EDA"], "steps": 0.25, "eeg_energy": p["EEG_EN"]}
        self.last_risk = float(self.twin.step(feats, {"lat": p["lat"], "lon": p["lon"]})["seizure_risk"])
        self.model.events.append((self.model.clock, "risk", {"pid": self.pid, "risk": self.last_risk}))
        if self.last_risk >= self.twin.risk_threshold:
            self.model.dispatcher.receive_alert(self.pid, p["lat"], p["lon"], self.last_risk)

class Dispatcher(Agent):
    def __init__(self, unique_id, model, hospitals: List[Tuple[str,float,float]]):
        super().__init__(unique_id, model)
        self.hospitals = hospitals; self.alert_buffer = []
    def receive_alert(self, pid: int, lat: float, lon: float, risk: float):
        self.alert_buffer.append({"pid":pid,"lat":lat,"lon":lon,"risk":risk})
        self.model.events.append((self.model.clock, "alert_recv", {"pid": pid, "risk": risk}))
    def step(self):
        while self.alert_buffer:
            a = self.alert_buffer.pop(0)
            best = None; best_d = 1e9
            for name, hlat, hlon in self.hospitals:
                d = haversine_km(a["lat"], a["lon"], hlat, hlon)
                if d < best_d: best, best_d = (name, hlat, hlon), d
            amb = self.model.create_ambulance(start=self.model.base_ems, dest=(a["lat"], a["lon"]), target_pid=a["pid"], hospital=best)
            self.model.events.append((self.model.clock, "dispatch", {"pid": a["pid"], "eta_min": amb.eta_min}))

class Ambulance(Agent):
    def __init__(self, unique_id, model, start:Tuple[float,float], dest:Tuple[float,float], target_pid:int, hospital:Tuple[str,float,float]):
        super().__init__(unique_id, model)
        self.slat, self.slon = start; self.dlat, self.dlon = dest
        self.hname, self.hlat, self.hlon = hospital
        self.target_pid = target_pid
        self.progress = 0.0; self.phase = "to_patient"
        self.speed_kmh = 40.0
        self.dist_km = haversine_km(self.slat,self.slon,self.dlat,self.dlon)
        self.eta_min = max(0.5, self.dist_km/self.speed_kmh*60.0)
        self.lat, self.lon = self.slat, self.slon
    def step(self):
        if self.phase == "done": return
        step_minutes = self.model.params.get("minutes_per_tick", 0.5)
        if self.phase == "to_patient":
            self.progress = min(1.0, self.progress + step_minutes / self.eta_min)
            self.lat, self.lon = interp_geo(self.slat,self.slon,self.dlat,self.dlon,self.progress)
            if self.progress >= 1.0:
                self.model.events.append((self.model.clock, "arrived_patient", {"pid": self.target_pid}))
                self.phase = "to_hospital"
                self.slat, self.slon = self.lat, self.lon
                self.dlat, self.dlon = self.hlat, self.hlon
                self.progress = 0.0
                self.dist_km = haversine_km(self.slat,self.slon,self.dlat,self.dlon)
                self.eta_min = max(2.0, self.dist_km/self.speed_kmh*60.0)
        else:
            self.progress = min(1.0, self.progress + step_minutes / self.eta_min)
            self.lat, self.lon = interp_geo(self.slat,self.slon,self.dlat,self.dlon,self.progress)
            if self.progress >= 1.0:
                self.phase = "done"
                self.model.events.append((self.model.clock, "arrived_hospital", {"pid": self.target_pid, "hospital": self.hname}))
        self.model.live.setdefault("ambulances", {})[self.unique_id] = {
            "lat": self.lat, "lon": self.lon, "phase": self.phase, "target": self.target_pid
        }

class NeuroCity(Model):
    def __init__(self, twin_factory, base_ems:Tuple[float,float], hospitals:List[Tuple[str,float,float]],
                 patients_cfg:List[Tuple[str,float,float]], risk_threshold:float=0.8,
                 params:Optional[Dict[str,Any]]=None):
        super().__init__()
        self.clock = 0
        self.params = {"minutes_per_tick": 0.5, "preictal_start": 6, "ictal_start": 12, "end": 24}
        if params: self.params.update(params)
        self.schedule = RandomActivation(self)
        self.live = {"patients": {}, "ambulances": {}}
        self.events = []
        self.base_ems = base_ems
        self.dispatcher = Dispatcher(1000, self, hospitals=hospitals); self.schedule.add(self.dispatcher)
        self.twins = []
        uid = 1
        for name,lat,lon in patients_cfg:
            p = Patient(uid, self, name, lat, lon); self.schedule.add(p); uid += 1
            twin = twin_factory(); twin.risk_threshold = risk_threshold
            wt = WatchTwin(uid, self, twin, patient_id=p.unique_id); self.schedule.add(wt); self.twins.append(wt); uid += 1
        self._amb_id = 5000
        self._ambulances = []
    def create_ambulance(self, start, dest, target_pid, hospital):
        self._amb_id += 1
        amb = Ambulance(self._amb_id, self, start, dest, target_pid, hospital)
        self._ambulances.append(amb); self.schedule.add(amb); return amb
    def step(self):
        self.clock += 1; self.schedule.step()
    def get_events(self):
        ev = self.events[:]; self.events.clear(); return ev
