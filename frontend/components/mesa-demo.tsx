"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Play, Pause, RotateCcw, TrendingUp, Users } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface AgentState {
  id: number
  riskLevel: number
  seizuresPrevented: number
  falseAlerts: number
  satisfaction: number
}

export function MesaDemo() {
  const [isRunning, setIsRunning] = useState(false)
  const [iteration, setIteration] = useState(0)
  const [agents, setAgents] = useState<AgentState[]>([])
  const [aggregateStats, setAggregateStats] = useState({
    avgPrevention: 0,
    avgSatisfaction: 0,
    totalAlerts: 0,
    accuracy: 0,
  })

  // Initialize agents
  useEffect(() => {
    const initialAgents: AgentState[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      riskLevel: Math.random() * 100,
      seizuresPrevented: 0,
      falseAlerts: 0,
      satisfaction: 60 + Math.random() * 20,
    }))
    setAgents(initialAgents)
  }, [])

  // Simulation loop
  useEffect(() => {
    if (isRunning && agents.length > 0) {
      const interval = setInterval(() => {
        setIteration((prev) => prev + 1)

        setAgents((prevAgents) =>
          prevAgents.map((agent) => {
            const newRiskLevel = Math.max(0, Math.min(100, agent.riskLevel + (Math.random() - 0.5) * 20))

            // Simulate seizure detection and prevention
            let newSeizuresPrevented = agent.seizuresPrevented
            let newFalseAlerts = agent.falseAlerts
            let newSatisfaction = agent.satisfaction

            // High risk = potential seizure
            if (newRiskLevel > 70 && Math.random() > 0.3) {
              if (Math.random() > 0.04) {
                // 96% accuracy - correct prediction
                newSeizuresPrevented++
                newSatisfaction = Math.min(100, newSatisfaction + 2)
              } else {
                // False positive
                newFalseAlerts++
                newSatisfaction = Math.max(0, newSatisfaction - 1)
              }
            }

            return {
              ...agent,
              riskLevel: newRiskLevel,
              seizuresPrevented: newSeizuresPrevented,
              falseAlerts: newFalseAlerts,
              satisfaction: newSatisfaction,
            }
          }),
        )
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isRunning, agents.length])

  // Calculate aggregate statistics
  useEffect(() => {
    if (agents.length > 0) {
      const totalPrevented = agents.reduce((sum, agent) => sum + agent.seizuresPrevented, 0)
      const totalFalse = agents.reduce((sum, agent) => sum + agent.falseAlerts, 0)
      const totalAlerts = totalPrevented + totalFalse
      const accuracy = totalAlerts > 0 ? (totalPrevented / totalAlerts) * 100 : 96

      setAggregateStats({
        avgPrevention: totalPrevented / agents.length,
        avgSatisfaction: agents.reduce((sum, agent) => sum + agent.satisfaction, 0) / agents.length,
        totalAlerts,
        accuracy,
      })
    }
  }, [agents])

  const handleReset = () => {
    setIsRunning(false)
    setIteration(0)
    const resetAgents: AgentState[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      riskLevel: Math.random() * 100,
      seizuresPrevented: 0,
      falseAlerts: 0,
      satisfaction: 60 + Math.random() * 20,
    }))
    setAgents(resetAgents)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Mesa Agent-Based Simulation</h3>
              <p className="text-sm text-muted-foreground">Multi-patient population modeling and outcomes analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsRunning(!isRunning)} variant={isRunning ? "destructive" : "default"} size="sm">
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Simulation Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Iteration</div>
            <div className="text-2xl font-bold text-primary">{iteration}</div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Avg Prevention Rate</div>
            <div className="text-2xl font-bold text-primary">{aggregateStats.avgPrevention.toFixed(1)}</div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Prediction Accuracy</div>
            <div className="text-2xl font-bold text-primary">{aggregateStats.accuracy.toFixed(1)}%</div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Avg Satisfaction</div>
            <div className="text-2xl font-bold text-primary">{aggregateStats.avgSatisfaction.toFixed(0)}%</div>
          </div>
        </Card>
      </div>

      {/* Agent Grid */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Patient Agents (n={agents.length})</h4>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className={`p-4 border-2 transition-colors ${
                agent.riskLevel > 70
                  ? "border-destructive/50 bg-destructive/5"
                  : agent.riskLevel > 40
                    ? "border-yellow-500/50 bg-yellow-500/5"
                    : "border-primary/20 bg-card"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Patient #{agent.id}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      agent.riskLevel > 70
                        ? "bg-destructive/10 text-destructive"
                        : agent.riskLevel > 40
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {agent.riskLevel > 70 ? "High Risk" : agent.riskLevel > 40 ? "Moderate" : "Low Risk"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Seizure Risk</span>
                      <span className="text-foreground font-semibold">{agent.riskLevel.toFixed(0)}%</span>
                    </div>
                    <Progress value={agent.riskLevel} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-foreground font-semibold">{agent.seizuresPrevented}</div>
                      <div className="text-muted-foreground">Prevented</div>
                    </div>
                    <div className="text-center">
                      <div className="text-foreground font-semibold">{agent.falseAlerts}</div>
                      <div className="text-muted-foreground">False</div>
                    </div>
                    <div className="text-center">
                      <div className="text-foreground font-semibold">{agent.satisfaction.toFixed(0)}%</div>
                      <div className="text-muted-foreground">QALY</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Simulation Insights</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This agent-based model simulates a population of 10 epilepsy patients using digital twin technology. Each
              agent represents an individual with unique seizure patterns and risk profiles. The simulation demonstrates
              real-time risk assessment, seizure prevention, and patient satisfaction outcomes over time.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
