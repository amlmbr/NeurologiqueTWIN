
import argparse, time, numpy as np
from digital_twin_core import DigitalTwin, EventBus, default_location
from keras_adapter import KerasSeizurePredictor

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--minutes", type=int, default=2)
    ap.add_argument("--seizure_at", type=int, default=60)
    ap.add_argument("--risk_threshold", type=float, default=0.8)
    ap.add_argument("--model_path", type=str, required=True)
    args = ap.parse_args()

    predictor = KerasSeizurePredictor(args.model_path, class_order="auto")
    bus = EventBus()
    twin = DigitalTwin(lambda f: predictor(f), bus=bus, risk_threshold=args.risk_threshold)

    fs = 2  # pas de 0.5s simulé
    total = args.minutes*60//fs
    t = 0
    for i in range(int(total)):
        pre = (t>=args.seizure_at-30) and (t<args.seizure_at)
        ict = t>=args.seizure_at
        hr = float(np.random.normal(72,2))
        eda = float(np.random.normal(0.32,0.03))
        eeg_en = float(np.random.uniform(0.05,0.15))
        if pre or ict:
            hr += 14 + np.random.normal(0,2)
            eda += 0.18 + np.random.normal(0,0.03)
            eeg_en += 0.35
        feats = {"hr":hr, "eda":eda, "steps":0.2, "eeg_energy":min(1.0,eeg_en)}
        out = twin.step(feats, default_location())
        for ev in bus.drain():
            if ev.type=="alert":
                print(f"[ALERT] t={t}s risk={out['seizure_risk']:.2f}")
        print(f"t={t:4d}s risk={out['seizure_risk']:.3f}")
        time.sleep(0.1); t += fs

if __name__ == "__main__": main()
