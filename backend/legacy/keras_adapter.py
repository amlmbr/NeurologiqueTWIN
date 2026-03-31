
import os, numpy as np, tensorflow as tf
from tensorflow.keras import layers

# Quelques objets custom minimaux pour charger CBAM/ResNet custom
class SpatialAvgPool(layers.Layer):
    def call(self, inputs): return tf.reduce_mean(inputs, axis=3, keepdims=True)
class SpatialMaxPool(layers.Layer):
    def call(self, inputs): return tf.reduce_max(inputs, axis=3, keepdims=True)

def cbam_block(x, ratio=8, name_prefix="cbam"): return x
def residual_block(x, filters, stride=1, conv_shortcut=True, name_prefix="res_block"): return x

CUSTOM_OBJECTS = {
    'SpatialAvgPool': SpatialAvgPool,
    'SpatialMaxPool': SpatialMaxPool,
    'cbam_block': cbam_block,
    'residual_block': residual_block,
    'spatial_avg_pool': lambda t: tf.reduce_mean(t, axis=3, keepdims=True),
    'spatial_max_pool': lambda t: tf.reduce_max(t, axis=3, keepdims=True)
}

class KerasSeizurePredictor:
    """Wrap Keras .h5 qui sort softmax [normal, seizure] (ou inverse). Retourne P(seizure) in [0,1]."""
    def __init__(self, model_path: str, class_order: str="auto"):
        if not os.path.exists(model_path):
            raise FileNotFoundError(model_path)
        self.model = tf.keras.models.load_model(model_path, custom_objects=CUSTOM_OBJECTS, compile=False)
        self.class_order = class_order  # "auto" | "normal_first" | "seizure_first"

    def _auto_order(self, img: np.ndarray) -> str:
        x = img[None, ...]
        p = self.model.predict(x, verbose=0)[0]
        # Heuristique: on suppose que l'ordre majoritaire est [normal, seizure]
        if p[0] < p[1]:
            return "normal_first"
        return "seizure_first"

    def __call__(self, features: dict) -> float:
        # Si on ne fournit pas d'image, fallback sur features scalaires (eeg_energy/hr/eda).
        if 'rgb' not in features:
            e = float(features.get('eeg_energy', 0.0))
            hr = float(features.get('hr', 70.0))
            eda = float(features.get('eda', 0.3))
            z = max(0.0, (hr-75.0)/30.0)*0.4 + max(0.0,(eda-0.35)/0.5)*0.4 + float(e)*0.2
            return max(0.0, min(1.0, z))
        img = features['rgb'].astype('float32')
        if img.ndim == 2:
            img = np.repeat(img[...,None], 3, axis=-1)
        x = img[None, ...]
        p = self.model.predict(x, verbose=0)[0]
        order = self.class_order
        if order == "auto":
            order = self._auto_order(img)
        # On retourne P(seizure)
        if order == "seizure_first":
            p = p[::-1]
        prob = float(p[1] / (p.sum() + 1e-8))
        return max(0.0, min(1.0, prob))
