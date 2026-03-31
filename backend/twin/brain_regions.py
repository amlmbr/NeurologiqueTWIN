"""
brain_regions.py
================
Static definitions for brain lobes and regions used in the digital twin.

IMPORTANT SCIENTIFIC DISCLAIMER:
All region coordinates and mappings are academic approximations based on the
10-20 international EEG electrode placement system. They are used solely for
visual demonstration purposes in the NeurologiqueTWIN digital twin.
They do NOT constitute validated clinical localization.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Brain Region Dataclass
# ---------------------------------------------------------------------------

@dataclass
class BrainRegion:
    """
    Represents a named brain region used in the 3D digital twin visualization.

    Attributes
    ----------
    name : str
        Human-readable region name (e.g., "Left Temporal").
    lobe : str
        Parent lobe ("frontal", "temporal", "parietal", "occipital", "central").
    side : str
        Lateralization: "left" | "right" | "midline".
    x, y, z : float
        Normalized 3D coordinates in the unit sphere brain model
        (x = left-right, y = front-back, z = bottom-top).
    color_normal : str
        CSS hex color when region is in normal state.
    color_alert : str
        CSS hex color when region is in seizure alert state.
    function : str
        Brief description of the region's neurological function.
    """
    name:          str
    lobe:          str
    side:          str
    x:             float = 0.0
    y:             float = 0.0
    z:             float = 0.0
    color_normal:  str = "#3b82f6"
    color_alert:   str = "#ef4444"
    function:      str = ""
    is_active:     bool = False   # True when seizure suspected in this region
    activation:    float = 0.0    # 0.0 = no activity, 1.0 = maximum alert

    def activate(self, intensity: float = 1.0) -> None:
        """Mark region as active with given intensity [0, 1]."""
        self.is_active = True
        self.activation = max(0.0, min(1.0, intensity))

    def deactivate(self) -> None:
        self.is_active = False
        self.activation = 0.0

    def current_color(self) -> str:
        """Interpolate between normal and alert color based on activation."""
        if not self.is_active or self.activation == 0.0:
            return self.color_normal
        if self.activation >= 0.8:
            return self.color_alert
        # Partial activation: orange intermediate
        return "#f97316"

    def to_dict(self) -> dict:
        return {
            "name":         self.name,
            "lobe":         self.lobe,
            "side":         self.side,
            "x":            self.x,
            "y":            self.y,
            "z":            self.z,
            "color_normal": self.color_normal,
            "color_alert":  self.color_alert,
            "color_current":self.current_color(),
            "function":     self.function,
            "is_active":    self.is_active,
            "activation":   round(self.activation, 3),
        }


# ---------------------------------------------------------------------------
# Static Brain Region Registry
# ---------------------------------------------------------------------------

LOBE_COLORS = {
    "frontal":   ("#3b82f6", "#ef4444"),
    "temporal":  ("#8b5cf6", "#f97316"),
    "parietal":  ("#10b981", "#eab308"),
    "occipital": ("#06b6d4", "#ec4899"),
    "central":   ("#f59e0b", "#dc2626"),
}

LOBE_FUNCTIONS = {
    "frontal":   "Motor control, planning, executive function, decision-making",
    "temporal":  "Auditory processing, memory consolidation (hippocampus), language (Wernicke's area)",
    "parietal":  "Sensory integration, spatial awareness, attention",
    "occipital": "Visual processing, pattern recognition",
    "central":   "Primary motor cortex (M1) and primary somatosensory cortex (S1)",
}

# All canonical brain regions used in the digital twin
BRAIN_REGIONS: dict[str, BrainRegion] = {
    # ── Frontal ──────────────────────────────────────────────────────────────
    "Left Prefrontal": BrainRegion(
        name="Left Prefrontal", lobe="frontal", side="left",
        x=-0.30, y=0.85, z=0.20,
        color_normal=LOBE_COLORS["frontal"][0], color_alert=LOBE_COLORS["frontal"][1],
        function="Executive function, working memory, personality"
    ),
    "Right Prefrontal": BrainRegion(
        name="Right Prefrontal", lobe="frontal", side="right",
        x=0.30, y=0.85, z=0.20,
        color_normal=LOBE_COLORS["frontal"][0], color_alert=LOBE_COLORS["frontal"][1],
        function="Executive function, working memory, personality"
    ),
    "Left Frontal": BrainRegion(
        name="Left Frontal", lobe="frontal", side="left",
        x=-0.50, y=0.60, z=0.50,
        color_normal=LOBE_COLORS["frontal"][0], color_alert=LOBE_COLORS["frontal"][1],
        function="Voluntary movement (Broca's area), speech production"
    ),
    "Right Frontal": BrainRegion(
        name="Right Frontal", lobe="frontal", side="right",
        x=0.50, y=0.60, z=0.50,
        color_normal=LOBE_COLORS["frontal"][0], color_alert=LOBE_COLORS["frontal"][1],
        function="Voluntary movement, non-verbal communication"
    ),
    "Left Frontotemporal": BrainRegion(
        name="Left Frontotemporal", lobe="frontal", side="left",
        x=-0.80, y=0.40, z=0.15,
        color_normal=LOBE_COLORS["frontal"][0], color_alert=LOBE_COLORS["frontal"][1],
        function="Language, frontal-temporal integration"
    ),
    "Right Frontotemporal": BrainRegion(
        name="Right Frontotemporal", lobe="frontal", side="right",
        x=0.80, y=0.40, z=0.15,
        color_normal=LOBE_COLORS["frontal"][0], color_alert=LOBE_COLORS["frontal"][1],
        function="Prosody, emotional tone of language"
    ),
    "Frontal Midline": BrainRegion(
        name="Frontal Midline", lobe="frontal", side="midline",
        x=0.00, y=0.65, z=0.65,
        color_normal=LOBE_COLORS["frontal"][0], color_alert=LOBE_COLORS["frontal"][1],
        function="Supplementary motor area, anterior cingulate"
    ),
    # ── Temporal ─────────────────────────────────────────────────────────────
    "Left Temporal": BrainRegion(
        name="Left Temporal", lobe="temporal", side="left",
        x=-1.00, y=-0.05, z=0.10,
        color_normal=LOBE_COLORS["temporal"][0], color_alert=LOBE_COLORS["temporal"][1],
        function="Wernicke's area, verbal memory, auditory processing"
    ),
    "Right Temporal": BrainRegion(
        name="Right Temporal", lobe="temporal", side="right",
        x=1.00, y=-0.05, z=0.10,
        color_normal=LOBE_COLORS["temporal"][0], color_alert=LOBE_COLORS["temporal"][1],
        function="Non-verbal memory, music processing, face recognition"
    ),
    "Left Post-Temporal": BrainRegion(
        name="Left Post-Temporal", lobe="temporal", side="left",
        x=-0.85, y=-0.45, z=0.20,
        color_normal=LOBE_COLORS["temporal"][0], color_alert=LOBE_COLORS["temporal"][1],
        function="Visual-verbal integration, reading"
    ),
    "Right Post-Temporal": BrainRegion(
        name="Right Post-Temporal", lobe="temporal", side="right",
        x=0.85, y=-0.45, z=0.20,
        color_normal=LOBE_COLORS["temporal"][0], color_alert=LOBE_COLORS["temporal"][1],
        function="Spatial memory, navigation"
    ),
    # ── Central (Motor/Sensory) ───────────────────────────────────────────────
    "Left Motor Cortex": BrainRegion(
        name="Left Motor Cortex", lobe="central", side="left",
        x=-0.70, y=0.00, z=0.80,
        color_normal=LOBE_COLORS["central"][0], color_alert=LOBE_COLORS["central"][1],
        function="Primary motor cortex — controls right body movement"
    ),
    "Right Motor Cortex": BrainRegion(
        name="Right Motor Cortex", lobe="central", side="right",
        x=0.70, y=0.00, z=0.80,
        color_normal=LOBE_COLORS["central"][0], color_alert=LOBE_COLORS["central"][1],
        function="Primary motor cortex — controls left body movement"
    ),
    "Vertex (Motor)": BrainRegion(
        name="Vertex (Motor)", lobe="central", side="midline",
        x=0.00, y=0.00, z=1.00,
        color_normal=LOBE_COLORS["central"][0], color_alert=LOBE_COLORS["central"][1],
        function="Supplementary motor area, bilateral motor coordination"
    ),
    # ── Parietal ─────────────────────────────────────────────────────────────
    "Left Parietal": BrainRegion(
        name="Left Parietal", lobe="parietal", side="left",
        x=-0.55, y=-0.55, z=0.65,
        color_normal=LOBE_COLORS["parietal"][0], color_alert=LOBE_COLORS["parietal"][1],
        function="Sensory integration, number processing, language"
    ),
    "Right Parietal": BrainRegion(
        name="Right Parietal", lobe="parietal", side="right",
        x=0.55, y=-0.55, z=0.65,
        color_normal=LOBE_COLORS["parietal"][0], color_alert=LOBE_COLORS["parietal"][1],
        function="Spatial awareness, attention, visuospatial processing"
    ),
    "Parietal Midline": BrainRegion(
        name="Parietal Midline", lobe="parietal", side="midline",
        x=0.00, y=-0.50, z=0.85,
        color_normal=LOBE_COLORS["parietal"][0], color_alert=LOBE_COLORS["parietal"][1],
        function="Bilateral sensory integration, default mode network node"
    ),
    # ── Occipital ─────────────────────────────────────────────────────────────
    "Left Occipital": BrainRegion(
        name="Left Occipital", lobe="occipital", side="left",
        x=-0.35, y=-0.95, z=0.25,
        color_normal=LOBE_COLORS["occipital"][0], color_alert=LOBE_COLORS["occipital"][1],
        function="Right visual field processing"
    ),
    "Right Occipital": BrainRegion(
        name="Right Occipital", lobe="occipital", side="right",
        x=0.35, y=-0.95, z=0.25,
        color_normal=LOBE_COLORS["occipital"][0], color_alert=LOBE_COLORS["occipital"][1],
        function="Left visual field processing"
    ),
    "Occipital Midline": BrainRegion(
        name="Occipital Midline", lobe="occipital", side="midline",
        x=0.00, y=-1.00, z=0.15,
        color_normal=LOBE_COLORS["occipital"][0], color_alert=LOBE_COLORS["occipital"][1],
        function="Primary visual cortex (V1), bilateral visual integration"
    ),
}

# Fallback region for seizure types (DEMO mapping — not clinical)
SEIZURE_TYPE_DEFAULT_REGION: dict[str, Optional[str]] = {
    "Normal":         None,
    "Absence":        "Frontal Midline",
    "Focal Temporal": "Left Temporal",
    "Focal Frontal":  "Left Frontal",
    "Myoclonic":      "Vertex (Motor)",
    "Tonic":          "Left Motor Cortex",
    "Tonic-Clonic":   "Frontal Midline",
}
