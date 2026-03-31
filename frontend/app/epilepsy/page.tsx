"use client"

/**
 * Epilepsy — Educational Reference Page
 * =======================================
 * Academic resource covering:
 * 1. What is epilepsy? (definition, prevalence)
 * 2. EEG frequency bands and their clinical significance
 * 3. Brain zones involved in different seizure types
 * 4. Seizure classification (ILAE 2017)
 * 5. EEG signatures per seizure type
 * 6. How the NeurologiqueTWIN pipeline relates to each
 */

import { useState } from "react"
import { AppNav } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Brain, Zap, Activity, BookOpen, AlertTriangle, Eye, Map } from "lucide-react"

// ── Data ─────────────────────────────────────────────────────────────────────

const FREQ_BANDS = [
  {
    name: "Delta", range: "0.5 – 4 Hz", color: "#6366f1",
    normal: "Deep sleep (N3), very young children",
    pathological: "Focal or diffuse slowing, deep brain lesions, encephalopathy",
    seizure_link: "Dominant in tonic-clonic post-ictal, deep hemispheric tumors",
    tw_feature: "High delta ratio → increased Tonic-Clonic probability in NeurologiqueTWIN",
  },
  {
    name: "Theta", range: "4 – 8 Hz", color: "#8b5cf6",
    normal: "Drowsiness, light sleep, childhood EEG",
    pathological: "Temporal lobe dysfunction, hippocampal involvement",
    seizure_link: "3 Hz spike-wave in absence seizures; temporal lobe seizures",
    tw_feature: "High theta ratio → Absence or Focal Temporal classification",
  },
  {
    name: "Alpha", range: "8 – 13 Hz", color: "#06b6d4",
    normal: "Relaxed wakefulness, eyes closed, occipital dominant",
    pathological: "Alpha coma (poor prognosis), posterior slowing",
    seizure_link: "Attenuated or replaced during ictal onset; focal alpha activity in some focal seizures",
    tw_feature: "Alpha + theta combined → Focal Temporal scoring",
  },
  {
    name: "Beta", range: "13 – 30 Hz", color: "#10b981",
    normal: "Active cognition, motor planning, benzodiazepine effect",
    pathological: "Abnormal fast activity, epileptiform spindles",
    seizure_link: "Beta onset in frontal seizures; hypermotor seizures",
    tw_feature: "High beta ratio → Focal Frontal classification in pipeline",
  },
  {
    name: "Gamma", range: "30 – 80+ Hz", color: "#f59e0b",
    normal: "High-level cognitive binding, attention, perception",
    pathological: "Very fast oscillations (HFO) near seizure foci",
    seizure_link: "High gamma → myoclonic jerks; seizure focus ripples (>80Hz)",
    tw_feature: "High gamma ratio → Myoclonic / Tonic probability boost",
  },
]

const SEIZURE_TYPES = [
  {
    type: "Absence (Petit-Mal)",
    ilae: "Generalized — Non-motor (absence)",
    icon: "🔵",
    color: "#8b5cf6",
    freq_signature: "3 Hz generalized spike-and-slow-wave complex",
    brain_zones: ["Thalamocortical circuit", "Frontal midline", "Bifrontal"],
    duration: "5–30 seconds",
    eeg_pattern: "Sudden onset/offset bilateral symmetric 3Hz spike-wave",
    clinical: "Brief staring, eye fluttering, no postictal confusion",
    tw_region: "Frontal Midline (demo)",
  },
  {
    type: "Focal Temporal",
    ilae: "Focal — Aware or impaired awareness",
    icon: "🟣",
    color: "#6d28d9",
    freq_signature: "Theta/alpha focal slowing, temporal sharp waves",
    brain_zones: ["Mesial temporal lobe", "Hippocampus", "Amygdala", "Temporal neocortex"],
    duration: "1–2 minutes",
    eeg_pattern: "Rhythmic theta/alpha activity at T3/T7, T4/T8 or F7/F8",
    clinical: "Aura, automatisms (lip-smacking, hand movements), amnesia",
    tw_region: "Left/Right Temporal (demo)",
  },
  {
    type: "Focal Frontal",
    ilae: "Focal — Motor (hyperkinetic, tonic, clonic)",
    icon: "🔴",
    color: "#dc2626",
    freq_signature: "Fast beta/gamma onset, often nocturnal",
    brain_zones: ["Supplementary motor area (SMA)", "Premotor cortex", "Anterior cingulate"],
    duration: "< 30 seconds typically",
    eeg_pattern: "Low-voltage fast activity at F3/F4/Fz; may be obscured by EMG",
    clinical: "Brief, nocturnal, hypermotor, tonic posturing, vocalizations",
    tw_region: "Left/Right Frontal (demo)",
  },
  {
    type: "Myoclonic",
    ilae: "Generalized — Motor (myoclonic)",
    icon: "🟡",
    color: "#f59e0b",
    freq_signature: "Generalized polyspike or spike-wave 3–6 Hz",
    brain_zones: ["Motor cortex bilaterally", "Vertex (Cz)", "Corticospinal tracts"],
    duration: "Milliseconds (single jerk)",
    eeg_pattern: "Brief generalized polyspike, maximal at vertex (Cz)",
    clinical: "Sudden muscle jerks, usually bilateral proximal, morning onset",
    tw_region: "Vertex Motor (demo)",
  },
  {
    type: "Tonic",
    ilae: "Generalized — Motor (tonic)",
    icon: "🟠",
    color: "#f97316",
    freq_signature: "Fast beta (10–25 Hz) generalized",
    brain_zones: ["Diffuse cortex", "Motor cortex", "Brainstem"],
    duration: "2–30 seconds",
    eeg_pattern: "Generalized fast (beta) activity, often with muscle artifact",
    clinical: "Bilateral muscle stiffening, body rigid, arms raised, apnea",
    tw_region: "Left Motor Cortex (demo)",
  },
  {
    type: "Tonic-Clonic (Grand-Mal)",
    ilae: "Generalized — Motor (tonic-clonic)",
    icon: "🔴",
    color: "#ef4444",
    freq_signature: "Delta + gamma burst-suppression pattern ictal/postictal",
    brain_zones: ["Diffuse bihemispheric", "Frontal, parietal, temporal", "Subcortical structures"],
    duration: "1–3 minutes",
    eeg_pattern: "Tonic phase: recruiting rhythm; Clonic: spike-wave bursts; Postictal: delta slowing",
    clinical: "Tonic phase → clonic jerking → postictal stupor, incontinence",
    tw_region: "Frontal Midline (demo)",
  },
]

const BRAIN_ZONES = [
  {
    zone: "Frontal Lobe",
    eeg_channels: ["Fp1", "Fp2", "F3", "F4", "F7", "F8", "Fz"],
    functions: ["Voluntary movement (M1)", "Executive function", "Speech (Broca's area)", "Working memory"],
    seizure_types: ["Frontal lobe epilepsy", "Supplementary motor area seizures", "Absence (thalamofronal)"],
    frequency_markers: ["Beta onset (fast frontal)", "Theta/delta post-ictal"],
    color: "#1e40af",
  },
  {
    zone: "Temporal Lobe",
    eeg_channels: ["T3/T7", "T4/T8", "T5/P7", "T6/P8"],
    functions: ["Memory (hippocampus)", "Auditory processing", "Language (Wernicke's)", "Emotion (amygdala)"],
    seizure_types: ["Temporal lobe epilepsy (most common focal)", "Mesial TLE", "MTLE with HS"],
    frequency_markers: ["Theta 4–7 Hz focal slowing", "Sharp waves at temporal electrodes"],
    color: "#4c1d95",
  },
  {
    zone: "Parietal Lobe",
    eeg_channels: ["P3", "P4", "Pz"],
    functions: ["Sensory integration", "Spatial awareness", "Numerical cognition"],
    seizure_types: ["Parietal lobe epilepsy (rare)", "Somatosensory aura"],
    frequency_markers: ["Alpha attenuation", "Low-voltage fast onset"],
    color: "#065f46",
  },
  {
    zone: "Occipital Lobe",
    eeg_channels: ["O1", "O2", "Oz"],
    functions: ["Primary visual cortex (V1)", "Visual pattern recognition", "Motion detection"],
    seizure_types: ["Occipital epilepsy", "Visual aura (phosphenes, scotomas)"],
    frequency_markers: ["Alpha block", "Fast occipital discharge"],
    color: "#0e7490",
  },
  {
    zone: "Central Strip",
    eeg_channels: ["C3", "C4", "Cz"],
    functions: ["Primary motor cortex (M1)", "Primary sensory cortex (S1)", "Bilateral coordination"],
    seizure_types: ["Rolandic epilepsy (BCECTS)", "Focal motor seizures", "Myoclonic"],
    frequency_markers: ["Vertex slow waves", "Mu rhythm (8–12 Hz)"],
    color: "#78350f",
  },
]

const PIPELINE_STEPS = [
  { n: 1, title: "EEG Signal Input",      desc: "Raw 1D EEG signal at 256Hz (CHB-MIT, SeizeIT2, or wearable)", color: "#3b82f6" },
  { n: 2, title: "Preprocessing",          desc: "Bandpass 0.5–50Hz → Notch 50/60Hz → Wavelet denoising (db4) → Robust normalization", color: "#8b5cf6" },
  { n: 3, title: "Time-Series → Image",    desc: "10s window → GASF (Gramian Angular Summation Field) + MTF (Markov Transition Field) + RP (Recurrence Plot) → 3-channel RGB 64×64", color: "#06b6d4" },
  { n: 4, title: "ResNet-CBAM Inference",  desc: "3 model ensemble (GASF+MTF+RP) with Channel+Spatial Attention (CBAM) → P(seizure) probability averaging", color: "#10b981" },
  { n: 5, title: "Seizure Type Classification", desc: "Band power ratio rules → 7 types: Normal, Absence, Focal Temporal/Frontal, Myoclonic, Tonic, Tonic-Clonic", color: "#f59e0b" },
  { n: 6, title: "Brain Region Mapping",   desc: "EEG channel importance or seizure type → 10-20 system → hypothesized affected lobe/region (DEMO)", color: "#f97316" },
  { n: 7, title: "Digital Twin Update",    desc: "Markov state machine: stable → pre-ictal → ictal → post-ictal. Alert generation at risk thresholds.", color: "#ef4444" },
]

// ── Components ────────────────────────────────────────────────────────────────

function FreqBandCard({ band }: { band: typeof FREQ_BANDS[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <Card
      className="p-4 bg-card border-border cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-8 rounded" style={{ backgroundColor: band.color }} />
          <div>
            <div className="font-semibold text-sm">{band.name} Wave</div>
            <div className="text-xs text-muted-foreground font-mono">{band.range}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div className="mt-3 space-y-2 text-xs border-t border-border pt-3">
          <div><span className="text-muted-foreground">Normal context: </span>{band.normal}</div>
          <div><span className="text-muted-foreground">Pathological: </span>{band.pathological}</div>
          <div><span className="text-muted-foreground">Seizure link: </span><span className="text-orange-300">{band.seizure_link}</span></div>
          <div className="bg-primary/10 border border-primary/20 rounded p-2 text-primary">
            🤖 {band.tw_feature}
          </div>
        </div>
      )}
    </Card>
  )
}

function SeizureCard({ s }: { s: typeof SEIZURE_TYPES[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <Card
      className="p-4 bg-card border-border cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => setOpen(!open)}
      style={{ borderLeft: `3px solid ${s.color}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{s.icon}</span>
          <div>
            <div className="font-semibold text-sm">{s.type}</div>
            <div className="text-[10px] text-muted-foreground">{s.ilae}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs border-t border-border pt-3">
          <div><span className="text-muted-foreground">EEG signature: </span><span className="text-cyan-300 font-mono">{s.freq_signature}</span></div>
          <div><span className="text-muted-foreground">Duration: </span>{s.duration}</div>
          <div><span className="text-muted-foreground">Pattern: </span>{s.eeg_pattern}</div>
          <div>
            <span className="text-muted-foreground">Brain zones: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {s.brain_zones.map(z => (
                <span key={z} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{z}</span>
              ))}
            </div>
          </div>
          <div><span className="text-muted-foreground">Clinical: </span>{s.clinical}</div>
          <div className="bg-primary/10 border border-primary/20 rounded p-2 text-primary">
            🧠 Twin zone: {s.tw_region}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EpilepsyPage() {
  const [tab, setTab] = useState<"overview" | "freq" | "zones" | "types" | "pipeline">("overview")

  const tabs = [
    { id: "overview", label: "Overview",       icon: BookOpen },
    { id: "freq",     label: "EEG Frequencies",icon: Activity },
    { id: "zones",    label: "Brain Zones",    icon: Map },
    { id: "types",    label: "Seizure Types",  icon: AlertTriangle },
    { id: "pipeline", label: "Our Pipeline",   icon: Brain },
  ] as const

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="pt-16 p-4 md:p-6 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Epilepsy <span className="text-primary">Reference</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Academic reference: EEG frequency bands, brain zones, seizure types, and how NeurologiqueTWIN detects them
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${tab === id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/50"}`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="grid md:grid-cols-2 gap-5">
            <Card className="p-5 bg-card border-border">
              <h2 className="text-lg font-bold mb-3">What is Epilepsy?</h2>
              <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  Epilepsy is a neurological disorder characterized by recurrent, unprovoked seizures caused by
                  abnormal, excessive, or synchronous neuronal activity in the brain.
                </p>
                <p>
                  It affects approximately <strong className="text-foreground">50 million people worldwide</strong> (WHO 2023),
                  making it one of the most common neurological diseases globally.
                </p>
                <p>
                  A seizure occurs when a burst of electrical activity disrupts the normal function of one or more
                  brain regions, temporarily altering movement, sensation, behavior, or consciousness.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { value: "50M", label: "People affected" },
                  { value: "70%", label: "Seizure-free with treatment" },
                  { value: "40+", label: "Seizure types (ILAE)" },
                ].map(({ value, label }) => (
                  <div key={label} className="text-center bg-muted/30 rounded-lg p-3">
                    <div className="text-xl font-bold text-primary">{value}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-card border-border">
              <h2 className="text-lg font-bold mb-3">The EEG Signal</h2>
              <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  Electroencephalography (EEG) records electrical activity of the brain via scalp electrodes.
                  The 10-20 international system defines standardized electrode positions across the scalp.
                </p>
                <p>
                  During a seizure, EEG shows characteristic patterns: spike-wave complexes, high-amplitude
                  fast rhythms, or rhythmic slowing — depending on seizure type and onset zone.
                </p>
              </div>
              {/* Simple EEG illustration */}
              <div className="mt-4 bg-muted/20 rounded-lg p-3">
                <div className="text-[11px] text-muted-foreground mb-2">Conceptual EEG: Normal → Ictal → Post-ictal</div>
                <svg viewBox="0 0 300 40" className="w-full">
                  {/* Normal */}
                  {Array.from({ length: 50 }, (_, i) => {
                    const x = i * 2
                    const y = 20 + 4 * Math.sin(i * 0.8) + (Math.random() - 0.5) * 2
                    return i === 0 ? null : (
                      <line key={i} x1={(i-1)*2} y1={20 + 4*Math.sin((i-1)*0.8)} x2={x} y2={y}
                        stroke="#22c55e" strokeWidth="0.8"/>
                    )
                  })}
                  {/* Ictal */}
                  {Array.from({ length: 60 }, (_, i) => {
                    const x = 100 + i * 2
                    const y = 20 + 15 * Math.sin(i * 1.5) + 8 * Math.sin(i * 0.5)
                    const prev = 20 + 15 * Math.sin((i-1) * 1.5) + 8 * Math.sin((i-1) * 0.5)
                    return i === 0 ? null : (
                      <line key={i} x1={100+(i-1)*2} y1={prev} x2={x} y2={y}
                        stroke="#ef4444" strokeWidth="0.9"/>
                    )
                  })}
                  {/* Post-ictal */}
                  {Array.from({ length: 50 }, (_, i) => {
                    const x = 220 + i * 1.6
                    const amp = 8 - i * 0.1
                    const y = 20 + amp * Math.sin(i * 0.4)
                    const prev = 20 + Math.max(0, amp + 0.1) * Math.sin((i-1) * 0.4)
                    return i === 0 ? null : (
                      <line key={i} x1={220+(i-1)*1.6} y1={prev} x2={x} y2={y}
                        stroke="#eab308" strokeWidth="0.7"/>
                    )
                  })}
                  <text x="15" y="38" fontSize="6" fill="#22c55e">Normal</text>
                  <text x="120" y="38" fontSize="6" fill="#ef4444">Ictal</text>
                  <text x="232" y="38" fontSize="6" fill="#eab308">Post-ictal</text>
                </svg>
              </div>
            </Card>

            <Card className="p-5 bg-card border-border md:col-span-2">
              <h2 className="text-lg font-bold mb-3">ILAE 2017 Classification</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {[
                  {
                    title: "Focal Onset",
                    desc: "Originates in one hemisphere. May spread (bilateral tonic-clonic). Characterized by aura.",
                    types: ["Focal aware", "Focal impaired awareness", "Focal to bilateral tonic-clonic"],
                    color: "#8b5cf6",
                  },
                  {
                    title: "Generalized Onset",
                    desc: "Involves both hemispheres simultaneously. No aura. Often genetic etiology.",
                    types: ["Absence", "Tonic-clonic", "Myoclonic", "Tonic", "Atonic"],
                    color: "#ef4444",
                  },
                  {
                    title: "Unknown Onset",
                    desc: "Onset not observed or unclear. May be classified after further evaluation.",
                    types: ["Tonic-clonic (unknown)", "Epileptic spasms", "Behavior arrest"],
                    color: "#6b7280",
                  },
                ].map(({ title, desc, types, color }) => (
                  <div key={title} className="bg-muted/20 rounded-lg p-4" style={{ borderTop: `3px solid ${color}` }}>
                    <div className="font-semibold mb-2" style={{ color }}>{title}</div>
                    <p className="text-muted-foreground text-xs mb-3">{desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {types.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── EEG Frequencies ── */}
        {tab === "freq" && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-xs">
              Click on each frequency band to expand clinical details and NeurologiqueTWIN usage.
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {FREQ_BANDS.map(b => <FreqBandCard key={b.name} band={b} />)}
            </div>
            {/* Frequency chart reference */}
            <Card className="p-5 bg-card border-border">
              <h3 className="font-semibold mb-3">Frequency Band Overview</h3>
              <div className="flex items-end gap-2 h-24">
                {FREQ_BANDS.map((b, i) => (
                  <div key={b.name} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t" style={{
                      height: `${[45, 55, 65, 75, 85][i]}%`,
                      backgroundColor: b.color,
                      opacity: 0.7
                    }} />
                    <span className="text-[9px] text-muted-foreground text-center">{b.name}</span>
                    <span className="text-[8px] text-muted-foreground font-mono">{b.range.split(" ")[0]}Hz</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── Brain Zones ── */}
        {tab === "zones" && (
          <div className="grid md:grid-cols-2 gap-4">
            {BRAIN_ZONES.map(zone => (
              <Card key={zone.zone} className="p-4 bg-card border-border"
                style={{ borderLeft: `3px solid ${zone.color}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                  <h3 className="font-semibold">{zone.zone}</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">EEG channels: </span>
                    <span className="font-mono text-cyan-300">{zone.eeg_channels.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Functions: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {zone.functions.map(f => (
                        <span key={f} className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seizure types: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {zone.seizure_types.map(st => (
                        <span key={st} className="px-1.5 py-0.5 bg-orange-500/10 rounded text-orange-300 border border-orange-500/20">{st}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">EEG markers: </span>
                    <span className="text-yellow-300">{zone.frequency_markers.join(" · ")}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Seizure Types ── */}
        {tab === "types" && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-xs">
              Expand each card for EEG pattern, brain zones, clinical features, and NeurologiqueTWIN mapping. ILAE 2017 classification.
            </div>
            {SEIZURE_TYPES.map(s => <SeizureCard key={s.type} s={s} />)}
          </div>
        )}

        {/* ── Pipeline ── */}
        {tab === "pipeline" && (
          <div className="space-y-4">
            <Card className="p-5 bg-card border-border">
              <h2 className="text-lg font-bold mb-4">NeurologiqueTWIN Detection Pipeline</h2>
              <div className="space-y-3">
                {PIPELINE_STEPS.map(step => (
                  <div key={step.n} className="flex gap-4 items-start">
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: step.color }}
                    >
                      {step.n}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{step.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-card border-border">
              <h3 className="font-semibold mb-3">Model Architecture: ResNet-CBAM</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">CBAM (Convolutional Block Attention Module)</strong> — Woo et al. (2018).
                  Adds channel attention (which features to focus on) and spatial attention (where to focus)
                  on top of standard ResNet residual blocks.
                </p>
                <p>
                  <strong className="text-foreground">Three parallel models</strong>: GASF model, MTF model, RP model,
                  each trained on a different time-series image encoding. Final prediction = probability average
                  (ensemble voting).
                </p>
                <p>
                  <strong className="text-foreground">Image transforms</strong>:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li><strong className="text-foreground">GASF</strong>: Gramian Angular Summation Field — preserves temporal correlation structure as image</li>
                  <li><strong className="text-foreground">MTF</strong>: Markov Transition Field — captures transition probabilities between quantized amplitude states</li>
                  <li><strong className="text-foreground">RP</strong>: Recurrence Plot — reveals dynamical system patterns, periodicity, and complexity changes at seizure onset</li>
                </ul>
              </div>
            </Card>

            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold mb-3 text-sm">Academic References</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                {[
                  "Wang Z. et al. (2015) — Encoding Time Series as Images for Visual Inspection and Classification Using Tiled CNNs. AAAI Workshop",
                  "Eckmann J.P. et al. (1987) — Recurrence Plots of Dynamical Systems. Europhysics Letters",
                  "Woo S. et al. (2018) — CBAM: Convolutional Block Attention Module. ECCV 2018",
                  "Shoeb A.H. (2009) — Application of ML to Epileptic Seizure Onset Detection (CHB-MIT database). MIT PhD Thesis",
                  "He K. et al. (2016) — Deep Residual Learning for Image Recognition. CVPR 2016",
                  "Fisher R.S. et al. (2017) — Operational classification of seizure types by ILAE. Epilepsia",
                  "SeizeIT2 Dataset — De Cooman T. et al. (2025) Nature Scientific Data",
                ].map(r => (
                  <li key={r} className="pl-3 border-l border-primary/30">
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

      </main>
    </div>
  )
}
