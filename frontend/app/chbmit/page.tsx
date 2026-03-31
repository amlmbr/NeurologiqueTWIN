"use client"

/**
 * CHB-MIT EEG Dataset Import & Analysis Page
 * ============================================
 * - Upload a CHB-MIT .edf file
 * - Slice into 10-second windows
 * - GASF/MTF/RP transform → ResNet-CBAM seizure detection
 * - Display time-series per window + transform image preview
 * - Brain region localization per window
 * - Full result table + summary stats
 *
 * Reference: Shoeb (2009) CHB-MIT Scalp EEG Database
 * https://physionet.org/content/chbmit/1.0.0/
 */

import { useState, useRef, useCallback } from "react"
import { AppNav } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload, Brain, Activity, AlertTriangle, CheckCircle2,
  Info, Download, BarChart2, MapPin, ChevronDown, ChevronUp
} from "lucide-react"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000"

// ── Types ─────────────────────────────────────────────────────────────────

interface WindowResult {
  window_index:  number
  start_sec:     number
  end_sec:       number
  channel:       string
  seizure_risk:  number
  seizure_type:  string
  region_name:   string | null
  lobe:          string | null
  alert_level:   string
  band_powers:   Record<string, number>
}

interface EDFAnalysis {
  patient_id:  string
  filename:    string
  n_windows:   number
  window_sec:  number
  windows:     WindowResult[]
  summary: {
    max_risk:          number
    mean_risk:         number
    n_seizure_windows: number
    mne_available:     boolean
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function alertBg(level: string) {
  return {
    red:    "bg-red-500/10 border-red-500/30 text-red-300",
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-300",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    info:   "bg-green-500/10 border-green-500/30 text-green-400",
  }[level] ?? "bg-card border-border text-foreground"
}

function riskColor(r: number) {
  if (r >= 0.80) return "text-red-400"
  if (r >= 0.60) return "text-orange-400"
  if (r >= 0.40) return "text-yellow-400"
  return "text-green-400"
}

// Synthetic EEG sparkline
function EEGSparkline({ phase }: { phase: number }) {
  const pts: [number, number][] = []
  const W = 120, H = 30
  for (let i = 0; i < W; i++) {
    const t = i / W
    const baseFreq = phase < 0.35 ? 10 : phase < 0.65 ? 14 : 10
    const amp = phase < 0.35 ? 4 : phase < 0.65 ? 12 : 6
    const y = H / 2 - amp * Math.sin(2 * Math.PI * baseFreq * t)
      - (amp * 0.4) * Math.sin(2 * Math.PI * 3 * t)
      + (Math.random() - 0.5) * (phase < 0.35 ? 1.5 : 4)
    pts.push([i, Math.max(2, Math.min(H - 2, y))])
  }
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ")
  const color = phase < 0.35 ? "#22c55e" : phase < 0.65 ? "#ef4444" : "#eab308"
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8">
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

// Band power bar chart
function BandPowerChart({ bands }: { bands: Record<string, number> }) {
  const total = Object.values(bands).reduce((a, b) => a + b, 0) + 1e-9
  const colors = { delta: "#6366f1", theta: "#8b5cf6", alpha: "#06b6d4", beta: "#10b981", gamma: "#f59e0b" }
  return (
    <div className="flex items-end gap-0.5 h-10">
      {Object.entries(bands).map(([band, val]) => (
        <div key={band} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-t transition-all"
            style={{ height: `${(val / total) * 100}%`, minHeight: 2, backgroundColor: (colors as any)[band] ?? "#475569" }}
            title={`${band}: ${(val * 100).toFixed(1)}%`}
          />
          <span className="text-[7px] text-muted-foreground">{band[0].toUpperCase()}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function CHBMITPage() {
  const [file,       setFile]       = useState<File | null>(null)
  const [patientId,  setPatientId]  = useState("chbmit-demo")
  const [windowSec,  setWindowSec]  = useState(10)
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<EDFAnalysis | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [expandedWin,setExpandedWin]= useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const runDemo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Call the EDF endpoint without a file (synthetic fallback)
      const form = new FormData()
      // Create a minimal dummy EDF-like file for the POST (backend uses synthetic fallback)
      const dummy = new Blob(["DUMMY"], { type: "application/octet-stream" })
      form.append("file", new File([dummy], "demo.edf"))
      form.append("patient_id", patientId)
      form.append("window_sec", String(windowSec))

      const res = await fetch(`${BASE_URL}/api/v1/twin/edf?patient_id=${patientId}&window_sec=${windowSec}`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [patientId, windowSec])

  const runUpload = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`${BASE_URL}/api/v1/twin/edf?patient_id=${patientId}&window_sec=${windowSec}`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [file, patientId, windowSec])

  function exportCSV() {
    if (!result) return
    const header = "window,start_sec,end_sec,channel,seizure_risk,seizure_type,region,lobe,alert_level"
    const rows = result.windows.map(w =>
      `${w.window_index},${w.start_sec},${w.end_sec},${w.channel},${w.seizure_risk},${w.seizure_type},${w.region_name ?? ""},${w.lobe ?? ""},${w.alert_level}`
    )
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `chbmit_analysis_${result.patient_id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="pt-16 p-4 md:p-6 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            CHB-MIT EEG <span className="text-primary">Analysis</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a CHB-MIT .edf recording → 10-second windowed seizure detection via ResNet-CBAM
          </p>
        </div>

        {/* Info banner */}
        <div className="mb-5 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-xs flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>CHB-MIT Scalp EEG Database</strong> — Shoeb (2009). 916 hours of scalp EEG from 23 pediatric patients.
            Download .edf files from{" "}
            <a href="https://physionet.org/content/chbmit/1.0.0/" target="_blank" rel="noreferrer" className="underline">
              physionet.org/content/chbmit
            </a>
            . Pipeline: EEG 1D signal → 10s window → GASF/MTF/RP → ResNet-CBAM (256×256) → seizure type + brain region.
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">

          {/* Upload panel */}
          <Card className="p-5 bg-card border-border flex flex-col gap-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Data Source
            </h3>

            {/* Patient ID */}
            <div>
              <label className="text-xs text-muted-foreground">Patient ID</label>
              <input
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-md px-2 py-1.5 text-sm text-foreground"
              />
            </div>

            {/* Window size */}
            <div>
              <label className="text-xs text-muted-foreground">Window Size: {windowSec}s</label>
              <input
                type="range" min={4} max={30} step={2} value={windowSec}
                onChange={e => setWindowSec(Number(e.target.value))}
                className="w-full mt-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>4s</span><span>30s</span>
              </div>
            </div>

            {/* File upload */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {file ? file.name : "Click to upload .edf file"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".edf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {file && (
                <Button onClick={runUpload} disabled={loading} className="w-full">
                  {loading ? "Analysing…" : `Analyse ${file.name}`}
                </Button>
              )}
              <Button onClick={runDemo} variant="outline" disabled={loading} className="w-full">
                {loading ? "Loading…" : "Run Synthetic Demo"}
              </Button>
            </div>

            {loading && <Progress value={undefined} className="h-1.5 animate-pulse" />}

            {/* Pipeline description */}
            <div className="bg-muted/20 rounded-lg p-3 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground mb-1">Pipeline</div>
              {[
                "① EDF file → MNE reader",
                `② Slice into ${windowSec}s windows (256Hz)`,
                "③ Bandpass 0.5–50Hz + wavelet denoise",
                "④ GASF/MTF/RP → 64×64 RGB image",
                "⑤ ResNet-CBAM (3 models ensemble)",
                "⑥ Seizure type + brain region mapping",
              ].map(s => <div key={s}>{s}</div>)}
            </div>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {result && (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Windows",      value: result.n_windows,                     icon: BarChart2,      color: "text-primary" },
                    { label: "Max Risk",      value: `${(result.summary.max_risk*100).toFixed(1)}%`,  icon: AlertTriangle, color: riskColor(result.summary.max_risk) },
                    { label: "Mean Risk",     value: `${(result.summary.mean_risk*100).toFixed(1)}%`, icon: Activity,      color: "text-blue-400" },
                    { label: "Seizure Windows", value: result.summary.n_seizure_windows,   icon: Brain,         color: "text-orange-400" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-3 bg-card border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                        <span className="text-[11px] text-muted-foreground">{label}</span>
                      </div>
                      <div className={`text-lg font-bold ${color}`}>{value}</div>
                    </Card>
                  ))}
                </div>

                {/* Risk histogram */}
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Risk per Window</h3>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
                    </Button>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {result.windows.map(w => (
                      <div
                        key={w.window_index}
                        className="flex-1 rounded-t cursor-pointer transition-all hover:opacity-80"
                        style={{
                          height: `${Math.max(4, w.seizure_risk * 100)}%`,
                          backgroundColor: w.seizure_risk >= 0.80 ? "#ef4444"
                            : w.seizure_risk >= 0.60 ? "#f97316"
                            : w.seizure_risk >= 0.40 ? "#eab308" : "#22c55e",
                        }}
                        title={`${w.start_sec}–${w.end_sec}s: ${(w.seizure_risk*100).toFixed(1)}% (${w.seizure_type})`}
                        onClick={() => setExpandedWin(expandedWin === w.window_index ? null : w.window_index)}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>0s</span>
                    <span>{result.windows[result.windows.length - 1]?.end_sec}s</span>
                  </div>
                  {!result.summary.mne_available && (
                    <div className="mt-2 text-[11px] text-amber-400">
                      ⚠ MNE not available in container — showing synthetic demo signal analysis
                    </div>
                  )}
                </Card>

                {/* Per-window table */}
                <Card className="p-4 bg-card border-border">
                  <h3 className="text-sm font-semibold mb-3">Window Analysis</h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {result.windows.map(w => (
                      <div key={w.window_index} className={`rounded-lg border transition-all ${alertBg(w.alert_level)}`}>
                        {/* Row header */}
                        <div
                          className="flex items-center justify-between px-3 py-2 cursor-pointer"
                          onClick={() => setExpandedWin(expandedWin === w.window_index ? null : w.window_index)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs font-mono font-semibold shrink-0">
                              W{w.window_index} · {w.start_sec}–{w.end_sec}s
                            </span>
                            <span className={`text-sm font-bold ${riskColor(w.seizure_risk)}`}>
                              {(w.seizure_risk * 100).toFixed(1)}%
                            </span>
                            <span className="text-[11px] truncate">{w.seizure_type}</span>
                            {w.region_name && (
                              <span className="text-[10px] opacity-70 truncate">{w.region_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] uppercase opacity-60">{w.alert_level}</span>
                            {expandedWin === w.window_index
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {expandedWin === w.window_index && (
                          <div className="px-3 pb-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
                            {/* EEG sparkline */}
                            <div>
                              <div className="text-[10px] text-muted-foreground mb-1">EEG Signal (synthetic preview)</div>
                              <EEGSparkline phase={w.seizure_risk} />
                            </div>
                            {/* Band powers */}
                            <div>
                              <div className="text-[10px] text-muted-foreground mb-1">Band Powers</div>
                              <BandPowerChart bands={w.band_powers} />
                            </div>
                            {/* Region info */}
                            <div className="col-span-2 text-[11px] flex flex-wrap gap-3">
                              <div>
                                <span className="text-muted-foreground">Channel: </span>
                                <span className="font-mono">{w.channel}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Lobe: </span>
                                <span className="capitalize">{w.lobe ?? "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Region: </span>
                                <span>{w.region_name ?? "No zone"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Type: </span>
                                <span className="font-semibold">{w.seizure_type}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {!result && !loading && (
              <Card className="p-10 bg-card border-border text-center text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Upload a CHB-MIT .edf file or run the synthetic demo to see window-by-window seizure analysis</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
