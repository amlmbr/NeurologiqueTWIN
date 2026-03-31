"use client"

import { useState, useEffect } from "react"
import { AppNav } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Play, RotateCcw, Network, MapPin, Ambulance, AlertTriangle,
  Clock, TrendingUp, Users, Activity, ChevronDown, ChevronUp
} from "lucide-react"
import apiClient, { type SimulationResult, type ScenarioMeta } from "@/lib/api-client"

const STATE_COLOR: Record<string, string> = {
  stable:    "bg-green-500/20 text-green-400",
  preictal:  "bg-yellow-500/20 text-yellow-400",
  ictal:     "bg-red-500/20 text-red-400",
  postictal: "bg-blue-500/20 text-blue-400",
}

function RiskBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const color =
    value < 0.3 ? "bg-green-500"
    : value < 0.6 ? "bg-yellow-500"
    : value < 0.8 ? "bg-orange-500"
    : "bg-red-500"
  return (
    <div className={`w-full bg-muted rounded-full overflow-hidden ${size === "sm" ? "h-1.5" : "h-2"}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value * 100}%` }} />
    </div>
  )
}

export default function SimulationPage() {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([])
  const [selectedScenario, setSelectedScenario] = useState<string>("paris_single")
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null)

  useEffect(() => {
    apiClient.simulation.listScenarios()
      .then(r => {
        setScenarios(r.scenarios)
        if (r.scenarios.length > 0) setSelectedScenario(r.scenarios[0].id)
      })
      .catch(() => {/* backend not up yet */})
  }, [])

  const runSimulation = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const r = await apiClient.simulation.run({
        scenario_id: selectedScenario,
        use_ensemble: false,
      })
      setResult(r)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const scenario = scenarios.find(s => s.id === selectedScenario)

  // Extract per-patient risk timeline from snapshots
  const patientTimelines: Record<string, Array<{ t: number; risk: number }>> = {}
  if (result) {
    result.snapshots.forEach(snap => {
      Object.entries(snap.twin_risks ?? {}).forEach(([name, risk]) => {
        if (!patientTimelines[name]) patientTimelines[name] = []
        patientTimelines[name].push({ t: snap.time_min, risk: Number(risk) })
      })
    })
  }

  const alerts = result?.events.filter(e => e.type === "alert") ?? []
  const dispatches = result?.events.filter(e => e.type === "dispatch") ?? []
  const arrivals = result?.events.filter(e => e.type === "arrival") ?? []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <div className="pt-16 p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            Digital Twin — <span className="text-primary">Mesa Simulation</span>
          </h1>
          <p className="text-muted-foreground">
            Multi-agent EMS dispatch · Patient state machines · Real-time seizure risk via DigitalTwin
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error} — make sure <code>docker compose up</code> is running.
          </div>
        )}

        {/* Scenario selector */}
        <Card className="p-5 bg-card border-border mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" /> Select Scenario
          </h3>
          {scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading scenarios… (start the backend first)</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {scenarios.map(s => (
                <button key={s.id} onClick={() => setSelectedScenario(s.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${selectedScenario === s.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/40"}`}>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span><Users className="w-3 h-3 inline mr-0.5" />{s.n_patients} patients</span>
                    <span><Clock className="w-3 h-3 inline mr-0.5" />{s.n_steps} ticks</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {scenario && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Patients: <strong className="text-foreground">{scenario.n_patients}</strong></span>
                <span>Hospitals: <strong className="text-foreground">{scenario.n_hospitals}</strong></span>
                <span>Steps: <strong className="text-foreground">{scenario.n_steps}</strong></span>
                <span>Risk threshold: <strong className="text-foreground">{scenario.risk_threshold}</strong></span>
              </div>
              <Button onClick={runSimulation} disabled={running} size="sm">
                <Play className="w-4 h-4 mr-2" />
                {running ? "Running simulation…" : "Run Simulation"}
              </Button>
            </div>
          )}
        </Card>

        {running && (
          <div className="mb-6 text-center py-12">
            <Activity className="w-10 h-10 text-primary animate-pulse mx-auto mb-3" />
            <p className="text-muted-foreground">Running Mesa multi-agent simulation…</p>
          </div>
        )}

        {result && !running && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Alerts raised", value: result.summary.n_alerts, icon: AlertTriangle, color: "text-yellow-400" },
                { label: "EMS dispatched", value: result.summary.n_dispatches, icon: Ambulance, color: "text-blue-400" },
                { label: "Arrivals", value: result.summary.n_arrivals, icon: MapPin, color: "text-green-400" },
                { label: "Avg ETA", value: `${result.summary.avg_eta_min.toFixed(1)} min`, icon: Clock, color: "text-primary" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="p-4 bg-card border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <div className="text-2xl font-bold">{value}</div>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Patient risk timeline */}
              <Card className="p-5 bg-card border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Patient Risk Timeline
                </h3>
                {Object.entries(patientTimelines).map(([name, timeline]) => {
                  const isExpanded = expandedPatient === name
                  const maxRisk = Math.max(...timeline.map(p => p.risk))
                  return (
                    <div key={name} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-1 cursor-pointer"
                        onClick={() => setExpandedPatient(isExpanded ? null : name)}>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            maxRisk < 0.3 ? "text-green-400" : maxRisk < 0.6 ? "text-yellow-400"
                            : maxRisk < 0.8 ? "text-orange-400" : "text-red-400"}`}>
                            peak {(maxRisk * 100).toFixed(0)}%
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Mini risk chart */}
                      <div className="flex items-end gap-px h-10 bg-muted/30 rounded p-1">
                        {timeline.map((pt, i) => (
                          <div key={i} className="flex-1 rounded-sm transition-all"
                            style={{
                              height: `${Math.max(4, pt.risk * 100)}%`,
                              backgroundColor: pt.risk < 0.3 ? "#22c55e" : pt.risk < 0.6 ? "#eab308"
                                : pt.risk < 0.8 ? "#f97316" : "#ef4444",
                            }}
                            title={`t=${pt.t.toFixed(1)}min risk=${(pt.risk * 100).toFixed(0)}%`}
                          />
                        ))}
                      </div>

                      {isExpanded && (
                        <div className="mt-2 max-h-28 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left pb-1">Time (min)</th>
                                <th className="text-left pb-1">Risk</th>
                                <th className="text-left pb-1">Bar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {timeline.map((pt, i) => (
                                <tr key={i} className="border-b border-border/30">
                                  <td className="py-0.5">{pt.t.toFixed(1)}</td>
                                  <td className={`py-0.5 font-semibold ${
                                    pt.risk < 0.3 ? "text-green-400" : pt.risk < 0.6 ? "text-yellow-400"
                                    : pt.risk < 0.8 ? "text-orange-400" : "text-red-400"}`}>
                                    {(pt.risk * 100).toFixed(1)}%
                                  </td>
                                  <td className="py-0.5 w-24">
                                    <RiskBar value={pt.risk} size="sm" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </Card>

              {/* Last snapshot — patient states */}
              <Card className="p-5 bg-card border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Final Patient States
                </h3>
                {result.snapshots.length > 0 && (() => {
                  const last = result.snapshots[result.snapshots.length - 1]
                  return (
                    <div className="space-y-3">
                      {Object.entries(last.patients ?? {}).map(([name, p]) => (
                        <div key={name} className="p-3 bg-background rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATE_COLOR[p.state] ?? "bg-muted text-muted-foreground"}`}>
                              {p.state}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <span>HR: <strong className="text-foreground">{p.HR?.toFixed(0)}</strong></span>
                            <span>EDA: <strong className="text-foreground">{p.EDA?.toFixed(2)}</strong></span>
                            <span>EEG: <strong className="text-foreground">{p.EEG_EN?.toFixed(3)}</strong></span>
                          </div>
                          <div className="mt-2">
                            <RiskBar value={last.twin_risks?.[name] ?? 0} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </Card>
            </div>

            {/* Events table */}
            <Card className="p-5 bg-card border-border mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  Event Log ({result.events.length} events)
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAllEvents(!showAllEvents)}>
                  {showAllEvents ? "Show less" : "Show all"}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 pr-4">Tick</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Patient</th>
                      <th className="pb-2 pr-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllEvents ? result.events : result.events.slice(0, 15)).map((ev, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-1.5 pr-4 text-muted-foreground">{ev.clock}</td>
                        <td className="py-1.5 pr-4">
                          <Badge variant="outline" className={`text-xs ${
                            ev.type === "alert" ? "border-yellow-500/50 text-yellow-400"
                            : ev.type === "dispatch" ? "border-blue-500/50 text-blue-400"
                            : ev.type === "arrival" ? "border-green-500/50 text-green-400"
                            : "border-border"}`}>
                            {ev.type}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-4 font-medium">
                          {String((ev.data as any)?.patient ?? (ev.data as any)?.twin ?? "—")}
                        </td>
                        <td className="py-1.5 text-muted-foreground text-xs">
                          {Object.entries(ev.data as object)
                            .filter(([k]) => k !== "patient" && k !== "twin")
                            .slice(0, 3)
                            .map(([k, v]) => `${k}=${typeof v === "number" ? Number(v).toFixed(2) : v}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Scenario summary */}
            <Card className="p-5 bg-card border-border">
              <h3 className="font-semibold mb-3">Simulation Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Scenario: </span><strong>{result.scenario.name}</strong></div>
                <div><span className="text-muted-foreground">Total ticks: </span><strong>{result.summary.total_ticks}</strong></div>
                <div><span className="text-muted-foreground">Max risk: </span>
                  <strong className={result.summary.max_risk > 0.7 ? "text-red-400" : "text-green-400"}>
                    {(result.summary.max_risk * 100).toFixed(1)}%
                  </strong>
                </div>
                <div><span className="text-muted-foreground">Alerts: </span><strong>{result.summary.n_alerts}</strong></div>
                <div><span className="text-muted-foreground">Dispatches: </span><strong>{result.summary.n_dispatches}</strong></div>
                <div><span className="text-muted-foreground">Avg ETA: </span><strong>{result.summary.avg_eta_min.toFixed(1)} min</strong></div>
              </div>
            </Card>
          </>
        )}

        {!result && !running && (
          <div className="text-center py-20 text-muted-foreground">
            <Network className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg mb-2">Select a scenario and click <strong>Run Simulation</strong></p>
            <p className="text-sm">Results include patient risk timeline, EMS dispatch events, and arrival tables</p>
          </div>
        )}
      </div>
    </div>
  )
}
