"use client"

/**
 * Brain Twin Dashboard
 * ====================
 * Full digital twin interface:
 * - 3D brain viewer (SVG, axial + lateral)
 * - Real-time seizure risk gauge
 * - Alert panel
 * - Region information
 * - Risk timeline
 * - Patient status
 * - EEG channel importance (optional)
 *
 * DISCLAIMER: Brain region localization is hypothesized for academic digital
 * twin demonstration only — NOT validated clinical localization.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { AppNav } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import BrainTwinViewer from "@/components/brain-twin/BrainTwinViewer"
import {
  Brain, Activity, AlertTriangle, CheckCircle2, Radio, RefreshCw,
  MapPin, Zap, Heart, TrendingUp, TrendingDown, Info, Shield
} from "lucide-react"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000"
const POLL_MS  = 3500

// ── Types ────────────────────────────────────────────────────────────────────

interface TwinState {
  patient_id:    string
  status:        string
  status_label:  string
  status_color:  string
  seizure_risk:  number
  seizure_type:  string | null
  alert_level:   string
  active_region: RegionMeta | null
  regions:       BrainRegionData[]
  recent_events: TwinEvent[]
  maps_link:     string | null
}

interface RegionMeta {
  region_name:             string | null
  lobe:                    string | null
  side:                    string | null
  localization_confidence: string
  disclaimer:              string
  function:                string
  color_alert:             string
}

interface BrainRegionData {
  name:          string
  lobe:          string
  side:          string
  x:             number
  y:             number
  z:             number
  is_active:     boolean
  activation:    number
  color_normal:  string
  color_alert:   string
  color_current: string
  function:      string
}

interface TwinEvent {
  timestamp:    number
  brain_status: string
  seizure_risk: number
  seizure_type: string | null
  region_name:  string | null
  lobe:         string | null
  alert_level:  string
  maps_link:    string | null
  notes:        string
}

interface AlertData {
  alert_id:     string
  alert_level:  string
  brain_status: string
  seizure_risk: number
  seizure_type: string | null
  region_name:  string | null
  lobe:         string | null
  message:      string
  action:       string
  maps_link:    string | null
  fall_detected:boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function alertBg(level: string) {
  return {
    red:    "bg-red-500/10 border-red-500/40 text-red-300",
    orange: "bg-orange-500/10 border-orange-500/40 text-orange-300",
    yellow: "bg-yellow-500/10 border-yellow-500/40 text-yellow-300",
    purple: "bg-purple-500/10 border-purple-500/40 text-purple-300",
    info:   "bg-blue-500/10 border-blue-500/30 text-blue-300",
  }[level] ?? "bg-card border-border text-foreground"
}

function riskColor(r: number) {
  if (r >= 0.80) return "text-red-400"
  if (r >= 0.60) return "text-orange-400"
  if (r >= 0.40) return "text-yellow-400"
  return "text-green-400"
}

function lobeColor(lobe: string | null | undefined) {
  return {
    frontal:  "bg-blue-500/20 text-blue-300",
    temporal: "bg-purple-500/20 text-purple-300",
    parietal: "bg-emerald-500/20 text-emerald-300",
    occipital:"bg-cyan-500/20 text-cyan-300",
    central:  "bg-amber-500/20 text-amber-300",
  }[lobe ?? ""] ?? "bg-muted text-muted-foreground"
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BrainTwinPage() {
  const [twin,      setTwin]      = useState<TwinState | null>(null)
  const [alert,     setAlert]     = useState<AlertData | null>(null)
  const [riskHist,  setRiskHist]  = useState<number[]>([])
  const [isLive,    setIsLive]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [view,      setView]      = useState<"top" | "side">("top")
  const [patientId, setPatientId] = useState("patient-demo")
  const [alerts,    setAlerts]    = useState<AlertData[]>([])

  // Simulated vitals (drift over time)
  const [vitals, setVitals] = useState({ hr: 72, eda: 0.35, eeg_energy: 0.08, hrv: 50 })

  const runInference = useCallback(async () => {
    setLoading(true)
    try {
      const jitter = () => (Math.random() - 0.5) * 0.12
      const next = {
        hr:         Math.max(50, Math.min(130, vitals.hr + jitter() * 10)),
        eda:        Math.max(0.1, Math.min(3,  vitals.eda + jitter() * 0.4)),
        eeg_energy: Math.max(0,   Math.min(1,  vitals.eeg_energy + jitter() * 0.12)),
        hrv:        Math.max(20,  Math.min(100,vitals.hrv + jitter() * 8)),
      }
      setVitals(next)

      const res = await fetch(`${BASE_URL}/api/v1/twin/inference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id:  patientId,
          eeg_energy:  next.eeg_energy,
          hr:          next.hr,
          eda:         next.eda,
          lat:         33.9716,
          lon:         -6.8498,
        }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()

      setTwin(data.twin)
      setRiskHist(data.risk_history ?? [])
      if (data.alert) {
        setAlert(data.alert)
        setAlerts(prev => [data.alert, ...prev].slice(0, 20))
      }
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [vitals, patientId])

  useEffect(() => {
    if (!isLive) return
    runInference()
    const id = setInterval(runInference, POLL_MS)
    return () => clearInterval(id)
  }, [isLive, runInference])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="pt-16 p-4 md:p-6 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Brain Digital <span className="text-primary">Twin</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              ResNet-CBAM seizure detection → 3D region localization (academic demo)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Patient ID */}
            <select
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="text-xs bg-card border border-border rounded-md px-2 py-1 text-foreground"
            >
              {["patient-demo","patient-001","patient-002","patient-003"].map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            {/* View toggle */}
            <Button variant="outline" size="sm" onClick={() => setView(v => v === "top" ? "side" : "top")}>
              {view === "top" ? "Lateral View" : "Axial View"}
            </Button>
            <Button
              onClick={() => setIsLive(v => !v)}
              variant={isLive ? "destructive" : "default"}
              size="sm"
            >
              <Radio className={`w-4 h-4 mr-1.5 ${isLive ? "animate-pulse" : ""}`} />
              {isLive ? "Stop" : "Live Monitor"}
            </Button>
            <Button onClick={runInference} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error} — make sure docker compose is running
          </div>
        )}

        {/* Disclaimer banner */}
        <div className="mb-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Academic Demo:</strong> Brain region visualization is a hypothesized affected zone
            based on EEG channel mapping or seizure-type defaults. It does NOT constitute validated
            clinical localization. For research and educational purposes only.
          </span>
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── Brain Viewer ── */}
          <Card className="lg:col-span-1 p-4 bg-card border-border flex flex-col">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Brain Digital Twin
            </h3>
            <BrainTwinViewer
              regions={twin?.regions ?? []}
              activeRegion={twin?.active_region ?? null}
              seizureRisk={twin?.seizure_risk ?? 0}
              status={twin?.status ?? "stable"}
              statusColor={twin?.status_color ?? "#22c55e"}
              patientId={patientId}
              view={view}
            />

            {/* Active region info */}
            {twin?.active_region?.region_name ? (
              <div className={`mt-3 p-2.5 rounded-lg border text-xs ${alertBg(twin.alert_level)}`}>
                <div className="font-semibold mb-0.5">
                  ⚡ Hypothesized Zone: {twin.active_region.region_name}
                </div>
                <div className="opacity-80">{twin.active_region.function}</div>
                <div className="mt-1 opacity-60 text-[10px]">
                  Confidence: {twin.active_region.localization_confidence}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                No active seizure zone detected
              </div>
            )}
          </Card>

          {/* ── Risk Gauge + Status ── */}
          <Card className="p-4 bg-card border-border flex flex-col gap-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Seizure Risk Score
            </h3>

            {twin ? (
              <>
                {/* Big risk number */}
                <div className="text-center">
                  <div className={`text-5xl font-bold ${riskColor(twin.seizure_risk)}`}>
                    {(twin.seizure_risk * 100).toFixed(1)}%
                  </div>
                  <Progress value={twin.seizure_risk * 100} className="h-2.5 mt-3 mb-2" />
                  <div
                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{ color: twin.status_color, borderColor: twin.status_color + "60", backgroundColor: twin.status_color + "15" }}
                  >
                    {twin.status.toUpperCase()}
                  </div>
                </div>

                {/* Brain status */}
                <div className="text-xs text-muted-foreground text-center italic">
                  {twin.status_label}
                </div>

                {/* Vitals mini-grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Heart Rate", value: `${vitals.hr.toFixed(0)} bpm`,  icon: Heart,    color: "text-red-400" },
                    { label: "EDA",         value: `${vitals.eda.toFixed(2)} µS`, icon: Zap,      color: "text-yellow-400" },
                    { label: "EEG Energy",  value: vitals.eeg_energy.toFixed(3),  icon: Brain,    color: "text-primary" },
                    { label: "HRV",         value: `${vitals.hrv.toFixed(0)} ms`, icon: Activity, color: "text-blue-400" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-2 flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <div>
                        <div className="text-muted-foreground leading-none">{label}</div>
                        <div className="font-semibold leading-tight mt-0.5">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Seizure type */}
                {twin.seizure_type && twin.seizure_type !== "Normal" && (
                  <div className="text-xs bg-primary/10 border border-primary/30 rounded-lg p-2">
                    <span className="text-muted-foreground">Detected type: </span>
                    <span className="font-semibold text-primary">{twin.seizure_type}</span>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {twin.active_region?.lobe && (
                        <span className={`px-1.5 py-0.5 rounded ${lobeColor(twin.active_region.lobe)}`}>
                          {twin.active_region.lobe} lobe
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Brain className="w-10 h-10 opacity-20 mb-3" />
                <p className="text-sm text-center">Press <strong>Live Monitor</strong> to start</p>
              </div>
            )}
          </Card>

          {/* ── Alert Panel ── */}
          <Card className="p-4 bg-card border-border flex flex-col">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Emergency Alerts
            </h3>

            {/* Latest alert */}
            {alert ? (
              <div className={`p-3 rounded-lg border mb-3 ${alertBg(alert.alert_level)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs uppercase tracking-wide">{alert.alert_level} ALERT</span>
                  <span className="text-[10px] opacity-70">{new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs leading-snug mb-2">{alert.message}</p>
                <div className="text-[11px] font-semibold opacity-90">→ {alert.action}</div>
                {alert.maps_link && (
                  <a href={alert.maps_link} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] underline opacity-80 hover:opacity-100">
                    <MapPin className="w-3 h-3" /> Patient Location
                  </a>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs mb-3">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
                No active alerts — patient stable
              </div>
            )}

            {/* Alert history */}
            <div className="text-xs text-muted-foreground mb-2 font-medium">Recent Alerts</div>
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48">
              {alerts.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No alerts yet</div>
              ) : alerts.map((a, i) => (
                <div key={i} className={`px-2 py-1.5 rounded text-[11px] border ${alertBg(a.alert_level)}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold uppercase">{a.alert_level}</span>
                    <span className="opacity-60">{new Date(a.timestamp * 1000).toLocaleTimeString()}</span>
                  </div>
                  <div className="opacity-80 mt-0.5">
                    {(a.seizure_risk * 100).toFixed(1)}% — {a.seizure_type ?? "Unknown"} — {a.region_name ?? "No zone"}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Second row: Timeline + Region detail ── */}
        <div className="grid lg:grid-cols-3 gap-5 mt-5">

          {/* Risk Timeline */}
          <Card className="lg:col-span-2 p-4 bg-card border-border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Risk Timeline
            </h3>
            {riskHist.length > 0 ? (
              <div className="flex items-end gap-0.5 h-20">
                {riskHist.map((r, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${Math.max(4, r * 100)}%`,
                      backgroundColor: r >= 0.80 ? "#ef4444" : r >= 0.60 ? "#f97316" : r >= 0.40 ? "#eab308" : "#22c55e",
                    }}
                    title={`${(r * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">
                Timeline appears during live monitoring
              </div>
            )}
            {/* Threshold lines legend */}
            <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-green-500"/><span>Stable &lt;40%</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-yellow-500"/><span>Elevated 40-60%</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-orange-500"/><span>Pre-ictal 60-80%</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500"/><span>Ictal ≥80%</span></div>
            </div>
          </Card>

          {/* Recent Events */}
          <Card className="p-4 bg-card border-border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Event Log
            </h3>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {twin?.recent_events && twin.recent_events.length > 0 ? [...twin.recent_events].reverse().map((ev, i) => (
                <div key={i} className={`px-2 py-1.5 rounded text-[11px] border ${alertBg(ev.alert_level)}`}>
                  <div className="flex justify-between opacity-70">
                    <span className="uppercase font-semibold">{ev.brain_status}</span>
                    <span>{new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-0.5">
                    {(ev.seizure_risk * 100).toFixed(1)}%
                    {ev.seizure_type && <span className="ml-1 opacity-80">— {ev.seizure_type}</span>}
                    {ev.region_name && <span className="ml-1 opacity-70">({ev.region_name})</span>}
                  </div>
                </div>
              )) : (
                <div className="text-xs text-muted-foreground italic">No events yet</div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Brain regions table ── */}
        {twin?.regions && twin.regions.filter(r => r.is_active).length > 0 && (
          <Card className="mt-5 p-4 bg-card border-border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Active Regions — Hypothesized Zones
            </h3>
            <div className="text-[10px] text-amber-400 mb-3">
              ⚠ Demo localization only — not clinically validated. Regions highlighted based on seizure type or EEG channel mapping.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left pb-2 font-medium">Region</th>
                    <th className="text-left pb-2 font-medium">Lobe</th>
                    <th className="text-left pb-2 font-medium">Side</th>
                    <th className="text-left pb-2 font-medium">Activation</th>
                    <th className="text-left pb-2 font-medium">Function</th>
                  </tr>
                </thead>
                <tbody>
                  {twin.regions.filter(r => r.is_active).map(r => (
                    <tr key={r.name} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-1.5 font-semibold" style={{ color: r.color_alert }}>{r.name}</td>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${lobeColor(r.lobe)}`}>{r.lobe}</span>
                      </td>
                      <td className="py-1.5 capitalize text-muted-foreground">{r.side}</td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-muted rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${r.activation * 100}%`, backgroundColor: r.color_alert }} />
                          </div>
                          <span>{(r.activation * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-1.5 text-muted-foreground max-w-xs truncate">{r.function}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </main>
    </div>
  )
}
