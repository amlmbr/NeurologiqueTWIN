"use client"

import { useState } from "react"
import Link from "next/link"
import { AppNav } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Play, RotateCcw, Brain, Waves, Activity, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Zap, BarChart3
} from "lucide-react"

// ─── EEG signal generators (4 s @ 256 Hz = 1024 samples) ──────────────────

const FS = 256
const DURATION = 4 // seconds
const N = FS * DURATION // 1024 samples

function linspace(start: number, end: number, n: number) {
  return Array.from({ length: n }, (_, i) => start + (i / (n - 1)) * (end - start))
}
const t = linspace(0, DURATION, N)

function normal_eeg(): number[] {
  return t.map(ti =>
    0.3 * Math.sin(2 * Math.PI * 10 * ti) +   // alpha 10Hz
    0.2 * Math.sin(2 * Math.PI * 5  * ti) +   // theta 5Hz
    0.1 * (Math.random() - 0.5)                // noise
  )
}

function absence_eeg(): number[] {
  // 3 Hz spike-wave pattern
  return t.map(ti => {
    const phase = (ti * 3) % 1
    return (phase < 0.1 ? 2.5 * Math.sin(Math.PI * phase / 0.1) : 0.1 * Math.sin(2 * Math.PI * 3 * ti))
      + 0.08 * (Math.random() - 0.5)
  })
}

function focal_temporal_eeg(): number[] {
  // Elevated theta (4–8 Hz) + alpha (8–12 Hz)
  return t.map(ti =>
    0.8 * Math.sin(2 * Math.PI * 6  * ti) +
    0.6 * Math.sin(2 * Math.PI * 9  * ti) +
    0.3 * Math.sin(2 * Math.PI * 4  * ti) +
    0.15 * (Math.random() - 0.5)
  )
}

function focal_frontal_eeg(): number[] {
  // Elevated beta (15–30 Hz)
  return t.map(ti =>
    0.9 * Math.sin(2 * Math.PI * 20 * ti) +
    0.6 * Math.sin(2 * Math.PI * 25 * ti) +
    0.3 * Math.sin(2 * Math.PI * 15 * ti) +
    0.2 * (Math.random() - 0.5)
  )
}

function myoclonic_eeg(): number[] {
  // High-frequency gamma (>30 Hz) bursts
  return t.map(ti =>
    (1.2 * Math.sin(2 * Math.PI * 40 * ti) +
     0.8 * Math.sin(2 * Math.PI * 50 * ti)) *
    (0.5 + 0.5 * Math.abs(Math.sin(2 * Math.PI * 2 * ti))) + // burst envelope
    0.2 * (Math.random() - 0.5)
  )
}

function tonic_eeg(): number[] {
  // Beta + gamma sustained high energy
  return t.map(ti =>
    1.0 * Math.sin(2 * Math.PI * 18 * ti) +
    0.7 * Math.sin(2 * Math.PI * 35 * ti) +
    0.5 * Math.sin(2 * Math.PI * 25 * ti) +
    0.25 * (Math.random() - 0.5)
  )
}

function tonic_clonic_eeg(): number[] {
  // Delta dominant + very high energy + rhythmic spikes
  return t.map((ti, i) => {
    const spike = i % 64 < 8 ? 3.0 * Math.sign(Math.sin(2 * Math.PI * 3 * ti)) : 0
    return (
      1.5 * Math.sin(2 * Math.PI * 2.5 * ti) +
      0.8 * Math.sin(2 * Math.PI * 1.5 * ti) +
      spike + 0.3 * (Math.random() - 0.5)
    )
  })
}

// ─── Test case definitions ─────────────────────────────────────────────────

const SEIZURE_CASES = [
  { id: 1, label: "Normal",           category: "normal",    color: "text-green-400",  bg: "bg-green-500/10",  signal: normal_eeg,        hr: 68,  eda: 0.28, description: "Resting EEG — alpha dominant, low energy" },
  { id: 2, label: "Absence (3Hz SW)", category: "absence",   color: "text-blue-400",   bg: "bg-blue-500/10",   signal: absence_eeg,       hr: 72,  eda: 0.35, description: "Absence / petit-mal — 3Hz spike-wave discharge" },
  { id: 3, label: "Focal Temporal",   category: "focal",     color: "text-yellow-400", bg: "bg-yellow-500/10", signal: focal_temporal_eeg, hr: 88,  eda: 0.72, description: "Focal temporal lobe — theta/alpha elevation" },
  { id: 4, label: "Focal Frontal",    category: "focal",     color: "text-orange-400", bg: "bg-orange-500/10", signal: focal_frontal_eeg,  hr: 92,  eda: 0.85, description: "Focal frontal — beta band dominant discharge" },
  { id: 5, label: "Myoclonic",        category: "myoclonic", color: "text-purple-400", bg: "bg-purple-500/10", signal: myoclonic_eeg,     hr: 105, eda: 1.20, description: "Myoclonic jerks — gamma burst pattern" },
  { id: 6, label: "Tonic",            category: "tonic",     color: "text-orange-500", bg: "bg-orange-500/15", signal: tonic_eeg,         hr: 115, eda: 1.80, description: "Tonic phase — sustained beta/gamma activity" },
  { id: 7, label: "Tonic-Clonic",     category: "tonicclonic", color: "text-red-400",  bg: "bg-red-500/10",    signal: tonic_clonic_eeg,  hr: 128, eda: 2.80, description: "Grand-mal tonic-clonic — delta + spike-wave bursts" },
]

const TRANSFORM_METHODS = ["gasf", "mtf", "rp", "rgb"] as const
type Method = typeof TRANSFORM_METHODS[number]

type CaseResult = {
  id: number
  label: string
  risk: number
  risk_level: string
  seizure_type: { type: string; confidence: number; description: string; scores: Record<string, number> }
  band_powers: Record<string, number>
  eeg_energy: number
  transform_method: Method
  clinical_note: string
  dominant_driver: string
}

// ─── Mini EEG sparkline ────────────────────────────────────────────────────

function EEGSparkline({ signal }: { signal: number[] }) {
  const pts = signal.slice(0, 256) // display first 1s
  const min = Math.min(...pts), max = Math.max(...pts)
  const norm = (v: number) => ((v - min) / (max - min + 1e-9)) * 28 + 2
  const path = pts.map((v, i) => `${i % 256 === 0 ? "M" : "L"}${(i / 255) * 260},${30 - norm(v)}`).join(" ")
  return (
    <svg viewBox="0 0 260 32" className="w-full h-8 overflow-hidden">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="0.8" className="text-primary" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ModelsPage() {
  const [results, setResults] = useState<CaseResult[]>([])
  const [running, setRunning] = useState(false)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<Method>("rp")
  const [expanded, setExpanded] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runningCase, setRunningCase] = useState<number | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

  const runCase = async (tc: typeof SEIZURE_CASES[number], method: Method): Promise<CaseResult> => {
    const sig = tc.signal()
    const res = await fetch(`${API}/api/v1/eeg/full-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal: sig, fs: FS, method, hr: tc.hr, eda: tc.eda }),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return {
      id: tc.id,
      label: tc.label,
      risk: data.risk.seizure_risk,
      risk_level: data.risk.risk_level,
      seizure_type: data.seizure_type,
      band_powers: data.band_powers,
      eeg_energy: data.eeg_energy,
      transform_method: method,
      clinical_note: data.risk.clinical_note,
      dominant_driver: data.risk.dominant_driver,
    }
  }

  const runAll = async () => {
    setResults([])
    setRunning(true)
    setError(null)
    for (const tc of SEIZURE_CASES) {
      setCurrentId(tc.id)
      try {
        const r = await runCase(tc, selectedMethod)
        setResults(prev => [...prev, r])
        await new Promise(res => setTimeout(res, 300))
      } catch (e: any) {
        setError(`${tc.label}: ${e.message}`)
        break
      }
    }
    setCurrentId(null)
    setRunning(false)
  }

  const runSingle = async (tc: typeof SEIZURE_CASES[number]) => {
    setRunningCase(tc.id)
    setError(null)
    try {
      const r = await runCase(tc, selectedMethod)
      setResults(prev => {
        const others = prev.filter(x => x.id !== tc.id)
        return [...others, r].sort((a, b) => a.id - b.id)
      })
    } catch (e: any) {
      setError(`${tc.label}: ${e.message}`)
    } finally {
      setRunningCase(null)
    }
  }

  const riskColor = (r: number) =>
    r < 0.3 ? "text-green-400" : r < 0.6 ? "text-yellow-400" : r < 0.8 ? "text-orange-400" : "text-red-400"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <div className="pt-16 p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            EEG Deep Learning — <span className="text-primary">ResNet-CBAM</span>
          </h1>
          <p className="text-muted-foreground">
            4-second EEG windows (256 Hz · 1024 samples) → time-series image transforms → seizure type classification
          </p>
        </div>

        {/* Controls */}
        <Card className="p-4 bg-card border-border mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5 font-medium">Transform method</div>
              <div className="flex gap-2">
                {TRANSFORM_METHODS.map(m => (
                  <button key={m} onClick={() => setSelectedMethod(m)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors uppercase
                      ${selectedMethod === m ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <Button onClick={() => { setResults([]); setError(null) }} variant="outline" size="sm" disabled={running}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button onClick={runAll} disabled={running} size="sm">
                <Play className="w-4 h-4 mr-2" />
                {running ? `Testing ${currentId}/${SEIZURE_CASES.length}…` : "Run All (7 cases)"}
              </Button>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error} — make sure <code>docker compose up</code> is running.
          </div>
        )}

        {/* Summary table */}
        {results.length > 0 && (
          <Card className="p-5 bg-card border-border mb-6 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Results Summary
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">EEG Scenario</th>
                  <th className="pb-2 pr-4">Detected Type</th>
                  <th className="pb-2 pr-4">Confidence</th>
                  <th className="pb-2 pr-4">Risk Score</th>
                  <th className="pb-2 pr-4">Risk Level</th>
                  <th className="pb-2 pr-4">EEG Energy</th>
                  <th className="pb-2">Dominant Driver</th>
                </tr>
              </thead>
              <tbody>
                {results.sort((a, b) => a.id - b.id).map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2 pr-4 font-medium">{r.label}</td>
                    <td className="py-2 pr-4">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold">
                        {r.seizure_type.type}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{(r.seizure_type.confidence * 100).toFixed(0)}%</td>
                    <td className={`py-2 pr-4 font-bold ${riskColor(r.risk)}`}>{(r.risk * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        r.risk_level === "low" ? "bg-green-500/20 text-green-400"
                        : r.risk_level === "moderate" ? "bg-yellow-500/20 text-yellow-400"
                        : r.risk_level === "high" ? "bg-orange-500/20 text-orange-400"
                        : "bg-red-500/20 text-red-400"
                      }`}>{r.risk_level}</span>
                    </td>
                    <td className="py-2 pr-4">{r.eeg_energy.toFixed(4)}</td>
                    <td className="py-2 text-muted-foreground text-xs">{r.dominant_driver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Case cards */}
        <div className="space-y-3">
          {SEIZURE_CASES.map(tc => {
            const result = results.find(r => r.id === tc.id)
            const isExpanded = expanded === tc.id
            const isCurrent = currentId === tc.id
            const isRunningThis = runningCase === tc.id

            return (
              <Card key={tc.id} className="bg-card border-border overflow-hidden">
                <div className="p-4 grid md:grid-cols-[1fr_auto] gap-4">
                  {/* Left: signal info */}
                  <div className="flex items-start gap-4">
                    {/* Category badge */}
                    <div className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold ${tc.bg} ${tc.color}`}>
                      {tc.label}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-muted-foreground mb-1">{tc.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {N} samples · {FS} Hz · {DURATION}s window · HR {tc.hr} bpm · EDA {tc.eda} µS
                      </div>
                      {/* EEG mini waveform */}
                      <div className="mt-2 opacity-70">
                        <EEGSparkline signal={tc.signal()} />
                      </div>
                    </div>
                  </div>

                  {/* Right: result + actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {result ? (
                      <>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${riskColor(result.risk)}`}>
                            {(result.risk * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">{result.risk_level}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary">{result.seizure_type.type}</div>
                          <div className="text-xs text-muted-foreground">
                            {(result.seizure_type.confidence * 100).toFixed(0)}% conf.
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground w-20 text-right">
                        {isCurrent ? "Running…" : "Not tested"}
                      </div>
                    )}

                    <Button onClick={() => runSingle(tc)} variant="outline" size="sm"
                      disabled={running || isRunningThis}>
                      {isRunningThis || isCurrent
                        ? <Activity className="w-4 h-4 animate-pulse text-primary" />
                        : <Play className="w-4 h-4" />}
                    </Button>

                    {result && (
                      <Button variant="ghost" size="sm"
                        onClick={() => setExpanded(isExpanded ? null : tc.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {result && isExpanded && (
                  <div className="border-t border-border p-4 grid md:grid-cols-3 gap-6 text-sm">

                    {/* Band powers bar chart */}
                    <div>
                      <h4 className="font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Waves className="w-4 h-4" /> Band Powers
                      </h4>
                      {Object.entries(result.band_powers).map(([band, val]) => (
                        <div key={band} className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize font-medium">{band}</span>
                            <span className="text-muted-foreground">{val.toFixed(4)}</span>
                          </div>
                          <div className="bg-muted rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min(100, val * 300)}%` }} />
                          </div>
                        </div>
                      ))}
                      <div className="mt-3 pt-2 border-t border-border text-xs">
                        <span className="text-muted-foreground">EEG Energy: </span>
                        <span className="font-semibold">{result.eeg_energy.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* Seizure type classification */}
                    <div>
                      <h4 className="font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Brain className="w-4 h-4" /> Type Classification
                      </h4>
                      <div className="px-3 py-2 bg-primary/10 rounded-lg border border-primary/20 mb-3">
                        <div className="font-bold text-primary">{result.seizure_type.type}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{result.seizure_type.description}</div>
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(result.seizure_type.scores)
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, score]) => (
                            <div key={type} className="flex items-center gap-2">
                              <span className="text-xs w-28 truncate text-muted-foreground">{type}</span>
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${type === result.seizure_type.type ? "bg-primary" : "bg-muted-foreground/30"}`}
                                  style={{ width: `${score * 100}%` }} />
                              </div>
                              <span className="text-xs w-8 text-right">{(score * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Risk explanation */}
                    <div>
                      <h4 className="font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Zap className="w-4 h-4" /> Clinical Summary
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-3xl font-bold ${riskColor(result.risk)}`}>
                          {(result.risk * 100).toFixed(1)}%
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          result.risk_level === "low" ? "bg-green-500/20 text-green-400"
                          : result.risk_level === "moderate" ? "bg-yellow-500/20 text-yellow-400"
                          : result.risk_level === "high" ? "bg-orange-500/20 text-orange-400"
                          : "bg-red-500/20 text-red-400"
                        }`}>{result.risk_level}</span>
                      </div>
                      <Progress value={result.risk * 100} className="h-2 mb-3" />
                      <p className="text-xs text-muted-foreground italic leading-relaxed">{result.clinical_note}</p>
                      <div className="mt-3 text-xs">
                        <span className="text-muted-foreground">Transform: </span>
                        <Badge variant="outline" className="text-xs">{result.transform_method.toUpperCase()}</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Architecture note */}
        <Card className="mt-6 p-5 bg-card border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Pipeline Architecture
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              "4s EEG @ 256Hz", "→", "Band-pass 0.5–50Hz", "→", "Wavelet Denoise",
              "→", "GASF / MTF / RP", "→", "64×64 RGB image",
              "→", "ResNet-CBAM", "→", "Seizure type + Risk"
            ].map((s, i) => (
              s === "→"
                ? <span key={i} className="text-muted-foreground">→</span>
                : <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">{s}</span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div><span className="font-semibold text-foreground">GASF</span> — Gramian Angular Summation Field</div>
            <div><span className="font-semibold text-foreground">MTF</span> — Markov Transition Field</div>
            <div><span className="font-semibold text-foreground">RP</span> — Recurrence Plot</div>
            <div><span className="font-semibold text-foreground">RGB</span> — Fused (GASF+MTF+RP per channel)</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
