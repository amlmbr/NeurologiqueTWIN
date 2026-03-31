
from typing import Dict, Any, Optional
try:
    from mesa import Model, Agent
    from mesa.time import RandomActivation
except Exception:
    Model = object
    Agent = object
    RandomActivation = object

class PatientAgent(Agent):
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)
        self.state = 'stable'  # stable→preictal→ictal→postictal
        self.t = 0
    def step(self):
        self.t += 1

class TwinAgent(Agent):
    def __init__(self, unique_id, model, twin_core):
        super().__init__(unique_id, model)
        self.twin = twin_core
        self.last_risk = 0.0
    def step(self):
        if self.model.current_features is not None:
            out = self.twin.step(self.model.current_features, self.model.location)
            self.last_risk = float(out.get('seizure_risk', 0.0))

class EMSAgent(Agent):
    def step(self): pass
class HospitalAgent(Agent):
    def step(self): pass

class NeuroProcessModel(Model):
    def __init__(self, twin_core, location: Optional[Dict[str,float]]=None):
        super().__init__()
        self.location = location or {"lat": 33.238, "lon": -8.500}
        self.current_features: Optional[Dict[str,float]] = None
        try:
            self.schedule = RandomActivation(self)
            self.patient = PatientAgent(1, self)
            self.twin = TwinAgent(2, self, twin_core)
            self.ems = EMSAgent(3, self)
            self.hosp = HospitalAgent(4, self)
            for a in [self.patient, self.twin, self.ems, self.hosp]:
                self.schedule.add(a)
        except Exception:
            self.schedule = None
    def push_features(self, feats: Dict[str,float]):
        self.current_features = feats
    def step(self):
        if self.schedule is not None:
            self.schedule.step()
