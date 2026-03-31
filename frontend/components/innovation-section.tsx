"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Brain, Waves, Zap, Network, BarChart3, FileText,
  ArrowRight, ChevronRight, Activity, Cpu
} from "lucide-react"

// ─── Mini visuals ─────────────────────────────────────────────────────────

function EEGWave() {
  const pts = Array.from({ length: 60 }, (_, i) =>
    20 + 12 * Math.sin(i * 0.4) + 5 * Math.sin(i * 1.2) + 2 * ((i * 7 % 5) - 2.5) / 5
  )
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i / 59) * 130},${v}`).join(" ")
  return (
    <svg viewBox="0 0 130 40" className="w-full h-10">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400" />
    </svg>
  )
}

function FilterWave() {
  const raw = Array.from({ length: 60 }, (_, i) =>
    20 + 10 * Math.sin(i * 0.35) + 8 * Math.sin(i * 3) + ((i * 13 % 7) - 3.5)
  )
  const clean = Array.from({ length: 60 }, (_, i) =>
    20 + 10 * Math.sin(i * 0.35) + Math.sin(i * 0.9)
  )
  const rp = raw.map((v, i) => `${i === 0 ? "M" : "L"}${(i / 59) * 130},${v}`).join(" ")
  const cp = clean.map((v, i) => `${i === 0 ? "M" : "L"}${(i / 59) * 130},${v}`).join(" ")
  return (
    <svg viewBox="0 0 130 40" className="w-full h-10">
      <path d={rp} fill="none" stroke="#67e8f9" strokeWidth="0.8" opacity={0.35} />
      <path d={cp} fill="none" stroke="#67e8f9" strokeWidth="2" />
    </svg>
  )
}

function TransformGrid() {
  const grids = [
    { label: "GASF", cols: ["#1e3a5f", "#1a6b9a", "#3498db", "#74b9ff"] },
    { label: "MTF",  cols: ["#1a1a2e", "#16213e", "#0f3460", "#533483"] },
    { label: "RP",   cols: ["#1a0a0a", "#4a1a1a", "#8b0000", "#c0392b"] },
  ]
  return (
    <div className="flex gap-3 w-full h-10 items-center justify-center">
      {grids.map(({ label, cols }) => (
        <div key={label} className="flex flex-col items-center gap-0.5">
          <div className="grid grid-cols-2 gap-0.5">
            {cols.map((c, i) => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
        </div>
      ))}
    </div>
  )
}

function CNNDiagram() {
  const nodes = ["64×64", "Conv×4", "CBAM", "FC", "P(sz)"]
  return (
    <div className="flex flex-wrap items-center gap-1 w-full h-10 justify-center text-[9px]">
      {nodes.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 rounded font-mono">{s}</span>
          {i < nodes.length - 1 && <span className="text-muted-foreground">→</span>}
        </span>
      ))}
    </div>
  )
}

function XGBBars() {
  const feats: Array<[string, number]> = [["δ", 70], ["θ", 55], ["β", 85], ["HRV", 45], ["EDA", 90], ["HR", 60]]
  return (
    <div className="flex gap-1 items-end w-full h-10">
      {feats.map(([f, h]) => (
        <div key={f} className="flex-1 flex flex-col items-center justify-end gap-0.5">
          <div className="w-full rounded-t bg-orange-500/70" style={{ height: `${h}%` }} />
          <span className="text-[9px] text-muted-foreground">{f}</span>
        </div>
      ))}
    </div>
  )
}

function NLPTokens() {
  const tokens = ["aura", "tonic", "ictal", "seizure", "EEG", "spike"]
  return (
    <div className="flex flex-wrap gap-1 w-full items-center h-10">
      {tokens.map((t, i) => (
        <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
          style={{ backgroundColor: `rgba(234,179,8,${0.12 + i * 0.05})`, color: "#eab308" }}>
          {t}
        </span>
      ))}
    </div>
  )
}

function FusionWeights() {
  const mods = [
    { n: "CNN", w: 35, c: "#ec4899" }, { n: "XGB", w: 30, c: "#f97316" },
    { n: "NLP", w: 15, c: "#eab308" }, { n: "IMU", w: 15, c: "#06b6d4" },
    { n: "St.", w: 5,  c: "#8b5cf6" },
  ]
  return (
    <div className="w-full h-10 flex flex-col justify-center gap-1.5">
      <div className="flex h-3 rounded overflow-hidden">
        {mods.map(m => (
          <div key={m.n} style={{ width: `${m.w}%`, backgroundColor: m.c }} title={`${m.n} ${m.w}%`} />
        ))}
      </div>
      <div className="flex gap-2">
        {mods.map(m => (
          <span key={m.n} className="text-[9px]" style={{ color: m.c }}>{m.n} {m.w}%</span>
        ))}
      </div>
    </div>
  )
}

function TwinAgents() {
  const agents: Array<[string, string]> = [["👤", "Patient"], ["🧠", "Twin"], ["📡", "Dispatcher"], ["🚑", "EMS"]]
  return (
    <div className="flex items-center gap-1 w-full h-10 justify-center">
      {agents.map(([e, l], i) => (
        <div key={l} className="flex items-center gap-0.5">
          <div className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium">{e} {l}</div>
          {i < agents.length - 1 && <span className="text-muted-foreground text-[9px]">→</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Steps data ───────────────────────────────────────────────────────────

const STEPS = [
  { id: "eeg",       label: "Raw EEG",        sub: "4s · 256Hz · 1024 pts",  icon: Activity, color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   Visual: EEGWave,
    detail: "4-second sliding windows at 256 Hz (1024 samples). Multi-channel EEG from wearable headset with synchronised Apple Watch IMU (HR, HRV, EDA, accelerometer)." },
  { id: "pre",       label: "Preprocessing",  sub: "Filter · Denoise",       icon: Waves,    color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   Visual: FilterWave,
    detail: "Butterworth band-pass 0.5–50 Hz → 50 Hz notch → Daubechies-4 wavelet denoise (level 4) → robust Z-score normalisation. All clinically relevant bands preserved." },
  { id: "transform", label: "1D → 2D Image",  sub: "GASF · MTF · RP",       icon: Cpu,      color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", Visual: TransformGrid,
    detail: "Three complementary transforms → 64×64 images fused as an RGB tensor. GASF: angular correlations. MTF: Markov transition probabilities. RP: recurrence geometry." },
  { id: "resnet",    label: "ResNet-CBAM",    sub: "90% accuracy · 3 models",icon: Brain,    color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/30",   Visual: CNNDiagram,
    detail: "Custom ResNet + CBAM attention (channel + spatial gates). 3 specialist models (~40 MB each) trained on GASF, MTF, and RP images. Probability-averaging ensemble." },
  { id: "xgboost",  label: "XGBoost",        sub: "20 tabular features",    icon: BarChart3,color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", Visual: XGBBars,
    detail: "20 features: 8 spectral (band powers δ/θ/α/β/γ, entropy, Hjorth mobility & complexity) + 6 statistical + 6 IMU wearable (HR/HRV/EDA/steps/stress/tremor)." },
  { id: "nlp",      label: "Clinical NLP",   sub: "TF-IDF · RoBERTa",      icon: FileText, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", Visual: NLPTokens,
    detail: "Clinical notes, EEG reports, patient diaries → TF-IDF baseline or fine-tuned RoBERTa/BioBERT. Bio_ClinicalBERT achieves ~90% F1. Captures auras, compliance, frequency." },
  { id: "fusion",   label: "Fusion Engine",  sub: "CNN+XGB+NLP+IMU",       icon: Zap,      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  Visual: FusionWeights,
    detail: "Weighted softmax: CNN 35% + XGBoost 30% + NLP 15% + IMU 15% + State 5%. Missing modalities masked and renormalised. Per-feature SHAP-style attribution output." },
  { id: "twin",     label: "Digital Twin",   sub: "Mesa multi-agent EMS",  icon: Network,  color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30",    Visual: TwinAgents,
    detail: "Markov state machine (stable → pre-ictal → ictal → post-ictal). Mesa agents: Patient, WatchTwin, Dispatcher, Ambulance. Geodesic Haversine routing for EMS dispatch." },
]

// ─── Seizure types ────────────────────────────────────────────────────────

const SEIZURE_TYPES = [
  { type: "Normal",          badge: "bg-green-500/15 text-green-400",   desc: "Alpha dominant baseline" },
  { type: "Absence",         badge: "bg-blue-500/15 text-blue-400",     desc: "3 Hz spike-wave (petit-mal)" },
  { type: "Focal Temporal",  badge: "bg-yellow-500/15 text-yellow-400", desc: "Theta/alpha focal onset" },
  { type: "Focal Frontal",   badge: "bg-orange-500/15 text-orange-400", desc: "Beta dominant discharge" },
  { type: "Myoclonic",       badge: "bg-purple-500/15 text-purple-400", desc: "Gamma burst pattern" },
  { type: "Tonic",           badge: "bg-orange-600/15 text-orange-500", desc: "Sustained beta/gamma" },
  { type: "Tonic-Clonic",    badge: "bg-red-500/15 text-red-400",       desc: "Delta + spike bursts" },
]

// ─── App cards ────────────────────────────────────────────────────────────

const APP_CARDS = [
  { title: "EEG / DL",       icon: Brain,    color: "text-pink-400",   bg: "bg-pink-500/10",
    stats: ["ResNet-CBAM 90%", "7 seizure types", "GASF · MTF · RP"],    href: "/models" },
  { title: "XGBoost",        icon: BarChart3, color: "text-orange-400", bg: "bg-orange-500/10",
    stats: ["20 features", "Spectral + IMU", "SHAP attribution"],        href: "/xgboost" },
  { title: "NLP / RoBERTa",  icon: FileText, color: "text-yellow-400", bg: "bg-yellow-500/10",
    stats: ["TF-IDF baseline", "RoBERTa fine-tuning", "~90% F1 BioBERT"],href: "/nlp" },
  { title: "Digital Twin",   icon: Network,  color: "text-primary",    bg: "bg-primary/10",
    stats: ["Mesa agents", "3 EMS scenarios", "Haversine routing"],      href: "/simulation" },
]

// ─── Component ────────────────────────────────────────────────────────────

export function InnovationSection() {
  const [activeStep, setActiveStep] = useState(0)
  const step = STEPS[activeStep]
  const StepIcon = step.icon
  const Visual = step.Visual

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Full ML Pipeline</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold">
            How <span className="text-primary">NeurologiqueTWIN</span> Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Raw EEG signal → Deep Learning → XGBoost → Clinical NLP → Digital Twin.
            A fully open multimodal AI pipeline for real-time seizure prediction.
          </p>
        </div>

        {/* ── Pipeline explorer ── */}
        <div className="mb-16">
          <div className="flex overflow-x-auto gap-2 pb-3 mb-5">
            {STEPS.map((s, i) => {
              const SI = s.icon
              return (
                <button key={s.id} onClick={() => setActiveStep(i)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                    ${activeStep === i ? `${s.bg} ${s.border} ${s.color}` : "border-border bg-background text-muted-foreground hover:border-primary/30"}`}>
                  <SI className="w-3.5 h-3.5" />
                  {s.label}
                  {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 opacity-30" />}
                </button>
              )
            })}
          </div>

          <Card className={`p-6 border ${step.border} ${step.bg}`}>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center`}>
                    <StepIcon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${step.color}`}>{step.label}</div>
                    <div className="text-sm text-muted-foreground">{step.sub}</div>
                  </div>
                  <span className="ml-auto text-sm text-muted-foreground">{activeStep + 1}/{STEPS.length}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.detail}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0}>← Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))} disabled={activeStep === STEPS.length - 1}>Next →</Button>
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${step.border} bg-background/60`}>
                <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">Preview</div>
                <Visual />
              </div>
            </div>
          </Card>

          <div className="flex gap-1 mt-3">
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => setActiveStep(i)}
                className={`flex-1 h-1 rounded-full cursor-pointer transition-all ${i <= activeStep ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* ── Seizure types ── */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-2xl font-bold mb-1">7 Seizure Types Classified</h3>
              <p className="text-sm text-muted-foreground">EEG band-power analysis → type identification</p>
            </div>
            <Link href="/models">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Brain className="w-3.5 h-3.5" />Test EEG Models
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SEIZURE_TYPES.map(s => (
              <div key={s.type} className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1.5 ${s.badge}`}>{s.type}</span>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── App module cards ── */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {APP_CARDS.map(card => {
            const CI = card.icon
            return (
              <Card key={card.title} className="p-5 bg-card border-border hover:border-primary/40 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <CI className={`w-5 h-5 ${card.color}`} />
                </div>
                <h4 className="font-bold mb-2">{card.title}</h4>
                <ul className="space-y-1 mb-4">
                  {card.stats.map(s => (
                    <li key={s} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
                <Link href={card.href}>
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                    Open <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </Card>
            )
          })}
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: "90%", l: "ResNet-CBAM Accuracy", s: "SeizeIT2 dataset",      c: "text-primary" },
            { v: "7",   l: "Seizure types",         s: "Normal → tonic-clonic", c: "text-pink-400" },
            { v: "4 s", l: "EEG Window",            s: "1024 pts @ 256 Hz",     c: "text-cyan-400" },
            { v: "4",   l: "ML models fused",       s: "CNN · XGB · NLP · IMU", c: "text-orange-400" },
          ].map(m => (
            <Card key={m.l} className="p-4 bg-card border-border text-center">
              <div className={`text-3xl font-bold mb-1 ${m.c}`}>{m.v}</div>
              <div className="text-sm font-semibold mb-0.5">{m.l}</div>
              <div className="text-xs text-muted-foreground">{m.s}</div>
            </Card>
          ))}
        </div>

      </div>
    </section>
  )
}
