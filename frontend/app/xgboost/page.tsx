"use client"

import { useState } from "react"
import { AppNav } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Brain, Zap, Play, RefreshCw, Activity, Info } from "lucide-react"

// ─── Feature sliders config ────────────────────────────────────────────────

const FEATURES = [
  { key: "hr",         label: "Heart Rate",     unit: "bpm",  min: 40,   max: 180, step: 1,    default: 72,   desc: "Current heart rate" },
  { key: "eda",        label: "EDA",            unit: "µS",   min: 0.05, max: 5,   step: 0.05, default: 0.35, desc: "Skin conductance (electrodermal activity)" },
  { key: "eeg_energy", label: "EEG Energy",     unit: "",     min: 0,    max: 1,   step: 0.01, default: 0.08, desc: "Normalised EEG spectral energy [0–1]" },
  { key: "hrv",        label: "HRV (RMSSD)",    unit: "ms",   min: 5,    max: 120, step: 1,    default: 50,   desc: "Heart rate variability" },
  { key: "steps",      label: "Steps/hour",     unit: "",     min: 0,    max: 800, step: 10,   default: 250,  desc: "Physical activity level" },
  { key: "stress",     label: "Stress Index",   unit: "",     min: 0,    max: 1,   step: 0.01, default: 0.25, desc: "Derived stress index [0–1]" },
  { key: "tremor",     label: "Tremor Index",   unit: "",     min: 0,    max: 1,   step: 0.01, default: 0.05, desc: "Accelerometer tremor estimate [0–1]" },
] as const

// Pre-defined patient profiles
const PROFILES = [
  {
    label: "Normal",
    color: "text-green-400",
    values: { hr: 68, eda: 0.28, eeg_energy: 0.04, hrv: 65, steps: 400, stress: 0.15, tremor: 0.02 },
  },
  {
    label: "Pre-ictal",
    color: "text-yellow-400",
    values: { hr: 88, eda: 0.80, eeg_energy: 0.28, hrv: 38, steps: 150, stress: 0.55, tremor: 0.12 },
  },
  {
    label: "Ictal",
    color: "text-red-400",
    values: { hr: 125, eda: 2.50, eeg_energy: 0.72, hrv: 20, steps: 30, stress: 0.90, tremor: 0.60 },
  },
  {
    label: "Post-ictal",
    color: "text-blue-400",
    values: { hr: 85, eda: 0.70, eeg_energy: 0.18, hrv: 42, steps: 20, stress: 0.40, tremor: 0.08 },
  },
]

type FusionResult = {
  final_risk: number
  risk_level: string
  agreement: number
  confidence: number
  dominant_modality: string
  clinical_summary: string
  attribution: Record<string, number>
  modalities: any[]
  components: {
    xgboost: { probability: number; backend: string; top_features: [string, number][] }
    nlp: any
    imu_scorer: { risk: number; risk_level: string; dominant: string; attribution: Record<string, number> }
    cnn: { risk: any; available: boolean }
  }
}

function Slider({ feature, value, onChange }: {
  feature: typeof FEATURES[number]
  value: number
  onChange: (v: number) => void
}) {
  const pct = ((value - feature.min) / (feature.max - feature.min)) * 100
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium flex items-center gap-1.5">
          {feature.label}
          <span className="text-xs text-muted-foreground font-normal">{feature.unit}</span>
        </label>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <input
        type="range" min={feature.min} max={feature.max} step={feature.step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
        <span>{feature.min}</span>
        <span className="text-center opacity-60">{feature.desc}</span>
        <span>{feature.max}</span>
      </div>
    </div>
  )
}

export default function XGBoostPage() {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(FEATURES.map(f => [f.key, f.default]))
  )
  const [clinicalNote, setClinicalNote] = useState("")
  const [result, setResult] = useState<FusionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

  const predict = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/v1/predict/multimodal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          clinical_note: clinicalNote || undefined,
          cnn_risk: null,
          twin_state: null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const applyProfile = (profile: typeof PROFILES[number]) => {
    setValues(prev => ({ ...prev, ...profile.values }))
  }

  const riskColor = (r: number) =>
    r < 0.3 ? "text-green-400" : r < 0.6 ? "text-yellow-400" : r < 0.8 ? "text-orange-400" : "text-red-400"

  const levelBg = (l: string) =>
    l === "low" ? "bg-green-500/20 text-green-400"
    : l === "moderate" ? "bg-yellow-500/20 text-yellow-400"
    : l === "high" ? "bg-orange-500/20 text-orange-400"
    : "bg-red-500/20 text-red-400"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <div className="pt-16 p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            XGBoost + Multimodal <span className="text-primary">Fusion</span>
          </h1>
          <p className="text-muted-foreground">
            Tabular EEG/IMU features → XGBoost · + NLP · + IMU scorer → weighted fusion
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error} — make sure <code>docker compose up</code> is running.
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: controls */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quick profiles */}
            <Card className="p-4 bg-card border-border">
              <div className="text-xs text-muted-foreground font-medium mb-2">Quick profiles</div>
              <div className="flex flex-wrap gap-2">
                {PROFILES.map(p => (
                  <button key={p.label} onClick={() => applyProfile(p)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold transition-colors border-border hover:border-primary/50 ${p.color}`}>
                    {p.label}
                  </button>
                ))}
                <button onClick={() => setValues(Object.fromEntries(FEATURES.map(f => [f.key, f.default])))}
                  className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:border-primary/50 transition-colors">
                  Reset
                </button>
              </div>
            </Card>

            {/* Feature sliders */}
            <Card className="p-4 bg-card border-border space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Input Features
              </h3>
              {FEATURES.map(f => (
                <Slider key={f.key} feature={f} value={values[f.key]}
                  onChange={v => setValues(prev => ({ ...prev, [f.key]: v }))} />
              ))}
            </Card>

            {/* Optional clinical note */}
            <Card className="p-4 bg-card border-border">
              <div className="text-xs font-medium text-muted-foreground mb-2">Clinical note (optional — adds NLP)</div>
              <textarea
                className="w-full h-20 p-2 bg-background border border-border rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                placeholder="E.g.: Patient reports aura symptoms this morning…"
                value={clinicalNote}
                onChange={e => setClinicalNote(e.target.value)}
              />
            </Card>

            <Button onClick={predict} disabled={loading} className="w-full">
              <Play className="w-4 h-4 mr-2" />
              {loading ? "Running XGBoost + Fusion…" : "Run Prediction"}
            </Button>
          </div>

          {/* Right: results */}
          <div className="lg:col-span-3 space-y-4">
            {!result && !loading && (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Set features and click <strong>Run Prediction</strong></p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center h-64">
                <Activity className="w-8 h-8 text-primary animate-pulse" />
              </div>
            )}

            {result && !loading && (
              <>
                {/* Final fusion result */}
                <Card className="p-5 bg-card border-border">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> Fusion Result
                  </h3>
                  <div className="flex items-end gap-4 mb-3">
                    <div className={`text-5xl font-bold ${riskColor(result.final_risk)}`}>
                      {(result.final_risk * 100).toFixed(1)}%
                    </div>
                    <div className="space-y-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${levelBg(result.risk_level)}`}>
                        {result.risk_level.toUpperCase()}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        Dominant: <strong className="text-primary">{result.dominant_modality}</strong>
                      </div>
                    </div>
                  </div>
                  <Progress value={result.final_risk * 100} className="h-3 mb-3" />
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                    <span>Agreement: <strong className="text-foreground">{(result.agreement * 100).toFixed(0)}%</strong></span>
                    <span>Confidence: <strong className="text-foreground">{(result.confidence * 100).toFixed(0)}%</strong></span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">{result.clinical_summary}</p>
                </Card>

                {/* Modality attribution */}
                <Card className="p-5 bg-card border-border">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Modality Attribution
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(result.attribution).map(([mod, weight]) => (
                      <div key={mod}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium capitalize">{mod}</span>
                          <span className="text-muted-foreground">{(weight * 100).toFixed(1)}%</span>
                        </div>
                        <div className="bg-muted rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${weight * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* XGBoost detail */}
                <Card className="p-5 bg-card border-border">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" /> XGBoost Details
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`text-3xl font-bold ${riskColor(result.components.xgboost.probability)}`}>
                      {(result.components.xgboost.probability * 100).toFixed(1)}%
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {result.components.xgboost.backend}
                    </Badge>
                  </div>

                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Top Feature Importances
                  </h4>
                  <div className="space-y-2">
                    {result.components.xgboost.top_features.map(([feat, imp]) => (
                      <div key={feat} className="flex items-center gap-2">
                        <span className="text-xs w-28 truncate text-muted-foreground">{feat}</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full"
                            style={{ width: `${imp * 100}%` }} />
                        </div>
                        <span className="text-xs w-10 text-right">{(imp * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* IMU scorer + NLP */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="p-4 bg-card border-border">
                    <h4 className="font-semibold text-sm mb-3 text-muted-foreground">IMU Scorer</h4>
                    <div className={`text-2xl font-bold mb-1 ${riskColor(result.components.imu_scorer.risk)}`}>
                      {(result.components.imu_scorer.risk * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Dominant: <strong className="text-foreground">{result.components.imu_scorer.dominant}</strong>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(result.components.imu_scorer.attribution ?? {}).slice(0, 5).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1.5">
                          <span className="text-xs w-16 truncate text-muted-foreground">{k}</span>
                          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full"
                              style={{ width: `${Math.abs(Number(v)) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-4 bg-card border-border">
                    <h4 className="font-semibold text-sm mb-3 text-muted-foreground">NLP Score</h4>
                    {result.components.nlp ? (
                      <>
                        <div className={`text-2xl font-bold mb-1 ${riskColor(result.components.nlp.risk_score ?? 0)}`}>
                          {((result.components.nlp.risk_score ?? 0) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {result.components.nlp.label?.replace(/_/g, " ")}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.components.nlp.keywords?.slice(0, 6).map((kw: string) => (
                            <span key={kw} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Add a clinical note in the input panel to enable NLP scoring.
                      </p>
                    )}
                  </Card>
                </div>

                {/* Architecture info */}
                <Card className="p-4 bg-muted/30 border-border">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Fusion weights:</strong> CNN 35% · XGBoost 30% · NLP 15% · IMU 15% · State 5%.
                      Unavailable modalities are masked and weights are renormalised.
                      XGBoost operates on 20 features: 8 spectral + 6 statistical + 6 IMU.
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
