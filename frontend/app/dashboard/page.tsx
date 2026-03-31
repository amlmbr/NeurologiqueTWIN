"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { AppNav } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Activity, AlertTriangle, CheckCircle2, Brain,
  Heart, Zap, TrendingUp, TrendingDown, ArrowLeft,
  RefreshCw, Radio
} from "lucide-react"
import apiClient, { type RiskResponse, type HealthResponse } from "@/lib/api-client"

const POLL_INTERVAL = 4000 // ms

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    low: "bg-green-500/15 text-green-400 border-green-500/30",
    moderate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${map[level] ?? map.low}`}>
      {level.toUpperCase()}
    </span>
  )
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [risk, setRisk] = useState<RiskResponse | null>(null)
  const [history, setHistory] = useState<RiskResponse[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simulated patient vitals (replace with real wearable feed)
  const [vitals, setVitals] = useState({ hr: 72, eda: 0.35, eeg_energy: 0.08, hrv: 50 })

  const fetchHealth = useCallback(async () => {
    try {
      const h = await apiClient.health.check()
      setHealth(h)
      setError(null)
    } catch {
      setError("Backend unreachable — make sure docker compose is running")
    }
  }, [])

  const runPrediction = useCallback(async () => {
    setLoading(true)
    try {
      // Drift vitals slightly to simulate live signal
      const jitter = () => (Math.random() - 0.5) * 0.1
      const next = {
        hr: Math.max(50, Math.min(130, vitals.hr + jitter() * 10)),
        eda: Math.max(0.1, Math.min(3, vitals.eda + jitter() * 0.5)),
        eeg_energy: Math.max(0, Math.min(1, vitals.eeg_energy + jitter() * 0.1)),
        hrv: Math.max(20, Math.min(100, vitals.hrv + jitter() * 8)),
      }
      setVitals(next)

      const result = await apiClient.inference.predict({
        hr: next.hr,
        eda: next.eda,
        eeg_energy: next.eeg_energy,
        hrv: next.hrv,
      })
      setRisk(result)
      setHistory(prev => [...prev.slice(-19), result])
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [vitals])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  useEffect(() => {
    if (!isLive) return
    runPrediction()
    const id = setInterval(runPrediction, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [isLive, runPrediction])

  const riskColor = (r: number) =>
    r < 0.3 ? "text-green-400" : r < 0.6 ? "text-yellow-400" : r < 0.8 ? "text-orange-400" : "text-red-400"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="pt-16 p-6">
      {/* Page title + controls */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Real-time <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground">Live seizure risk monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsLive(v => !v)}
            variant={isLive ? "destructive" : "default"}
            size="sm"
          >
            <Radio className={`w-4 h-4 mr-2 ${isLive ? "animate-pulse" : ""}`} />
            {isLive ? "Stop" : "Live Monitor"}
          </Button>
          <Button onClick={runPrediction} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Backend status */}
      {health && (
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${health.status === "ok" ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-muted-foreground">API {health.status.toUpperCase()}</span>
            <span className="text-muted-foreground">· v{health.version}</span>
          </div>
          {Object.entries(health.models_available).map(([k, v]) => (
            <Badge key={k} variant={v ? "default" : "destructive"} className="text-xs">
              {k.toUpperCase()} {v ? "✓" : "✗"}
            </Badge>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Heart Rate", value: `${vitals.hr.toFixed(0)} bpm`, icon: Heart, color: "text-red-400" },
          { label: "EDA", value: `${vitals.eda.toFixed(2)} µS`, icon: Zap, color: "text-yellow-400" },
          { label: "EEG Energy", value: vitals.eeg_energy.toFixed(3), icon: Brain, color: "text-primary" },
          { label: "HRV", value: `${vitals.hrv.toFixed(0)} ms`, icon: Activity, color: "text-blue-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{value}</div>
          </Card>
        ))}
      </div>

      {/* Risk gauge + digital twin state */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 p-6 bg-card border-border">
          <h3 className="text-lg font-semibold mb-4">Seizure Risk Score</h3>
          {risk ? (
            <>
              <div className="flex items-end gap-4 mb-4">
                <div className={`text-6xl font-bold ${riskColor(risk.seizure_risk)}`}>
                  {(risk.seizure_risk * 100).toFixed(1)}%
                </div>
                <RiskBadge level={risk.risk_level} />
              </div>
              <Progress value={risk.seizure_risk * 100} className="h-3 mb-4" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">State: </span>
                  <span className="font-semibold capitalize">{risk.state}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Trend: </span>
                  {risk.trend > 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-400" />
                  )}
                  <span className="font-semibold">{risk.trend > 0 ? "+" : ""}{(risk.trend * 100).toFixed(1)}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Driver: </span>
                  <span className="font-semibold text-primary">{risk.dominant_driver}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground italic">{risk.clinical_note}</p>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Click <strong>Live Monitor</strong> or the refresh button to run inference</p>
            </div>
          )}
        </Card>

        {/* Feature attribution */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold mb-4">Feature Attribution</h3>
          {risk?.explanation?.length ? (
            <div className="space-y-3">
              {risk.explanation.slice(0, 6).map((f) => (
                <div key={f.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{f.name}</span>
                    <span className={f.direction === "increases_risk" ? "text-red-400" : "text-green-400"}>
                      {f.direction === "increases_risk" ? "↑" : "↓"} {(f.contribution * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.abs(f.contribution) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">Run a prediction to see attribution</div>
          )}
        </Card>
      </div>

      {/* History chart */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4">Risk History (last 20 readings)</h3>
        {history.length > 0 ? (
          <div className="flex items-end gap-1 h-24">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t transition-all"
                style={{
                  height: `${Math.max(4, h.seizure_risk * 100)}%`,
                  backgroundColor:
                    h.seizure_risk < 0.3 ? "#22c55e"
                    : h.seizure_risk < 0.6 ? "#eab308"
                    : h.seizure_risk < 0.8 ? "#f97316"
                    : "#ef4444",
                }}
                title={`${(h.seizure_risk * 100).toFixed(1)}% — ${h.risk_level}`}
              />
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
            History appears here during live monitoring
          </div>
        )}
      </Card>
      </main>
    </div>
  )
}
