"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Network, PlayCircle, CheckCircle, Clock, AlertCircle } from "lucide-react"

export function BPMNDemo() {
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)

  const workflow = [
    {
      id: 1,
      title: "EEG Signal Detection",
      description: "Continuous monitoring of brain activity through wearable EEG sensors",
      duration: "Continuous",
      type: "sensor",
    },
    {
      id: 2,
      title: "Real-Time Processing",
      description: "Edge computing analyzes EEG data streams with sub-100ms latency",
      duration: "85ms",
      type: "process",
    },
    {
      id: 3,
      title: "AI Prediction Model",
      description: "Digital twin analyzes patterns and predicts seizure probability",
      duration: "120ms",
      type: "decision",
    },
    {
      id: 4,
      title: "Risk Assessment",
      description: "System evaluates seizure risk level and determines alert necessity",
      duration: "50ms",
      type: "gateway",
      branches: ["Low Risk", "High Risk"],
    },
    {
      id: 5,
      title: "Alert & Notification",
      description: "Multi-channel alerts sent to patient, caregivers, and healthcare providers",
      duration: "200ms",
      type: "alert",
      condition: "High Risk",
    },
    {
      id: 6,
      title: "Action Protocol",
      description: "Patient takes preventive medication, moves to safe location",
      duration: "2-5min",
      type: "action",
    },
    {
      id: 7,
      title: "Data Logging",
      description: "Event data recorded for model refinement and clinical review",
      duration: "Continuous",
      type: "data",
    },
  ]

  const playWorkflow = async () => {
    setIsPlaying(true)
    setActiveStep(null)
    setCompletedSteps([])

    for (let i = 0; i < workflow.length; i++) {
      setActiveStep(workflow[i].id)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setCompletedSteps((prev) => [...prev, workflow[i].id])
    }

    setActiveStep(null)
    setIsPlaying(false)
  }

  const resetWorkflow = () => {
    setActiveStep(null)
    setCompletedSteps([])
    setIsPlaying(false)
  }

  const getStepStatus = (id: number) => {
    if (completedSteps.includes(id)) return "completed"
    if (activeStep === id) return "active"
    return "pending"
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case "sensor":
        return "📡"
      case "process":
        return "⚙️"
      case "decision":
        return "🧠"
      case "gateway":
        return "◇"
      case "alert":
        return "🔔"
      case "action":
        return "⚡"
      case "data":
        return "💾"
      default:
        return "●"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Network className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">BPMN Workflow Automation</h3>
              <p className="text-sm text-muted-foreground">End-to-end seizure prediction and response process</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={playWorkflow} disabled={isPlaying} size="sm">
              <PlayCircle className="w-4 h-4 mr-2" />
              {isPlaying ? "Running..." : "Run Workflow"}
            </Button>
            <Button onClick={resetWorkflow} variant="outline" size="sm" disabled={isPlaying}>
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Workflow Diagram */}
      <div className="relative">
        {/* Connecting Lines */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 hidden md:block" />

        <div className="space-y-8">
          {workflow.map((step, index) => {
            const status = getStepStatus(step.id)
            const isLeft = index % 2 === 0

            return (
              <div key={step.id} className="relative">
                {/* Step Card */}
                <div className={`md:grid md:grid-cols-2 gap-8 items-center ${isLeft ? "" : "md:grid-flow-dense"}`}>
                  <div className={isLeft ? "md:col-start-1" : "md:col-start-2"}>
                    <Card
                      className={`p-6 border-2 transition-all ${
                        status === "active"
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                          : status === "completed"
                            ? "border-primary/50 bg-card"
                            : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-3xl flex-shrink-0">{getStepIcon(step.type)}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground">{step.title}</h4>
                            {status === "completed" && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                            {status === "active" && (
                              <Clock className="w-5 h-5 text-primary flex-shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-primary font-semibold">{step.duration}</span>
                            {step.condition && (
                              <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded">
                                {step.condition}
                              </span>
                            )}
                          </div>
                          {step.branches && (
                            <div className="flex gap-2 pt-2">
                              {step.branches.map((branch) => (
                                <span key={branch} className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
                                  → {branch}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Connection Node */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
                  <div
                    className={`w-6 h-6 rounded-full border-4 border-background ${
                      status === "completed"
                        ? "bg-primary"
                        : status === "active"
                          ? "bg-primary animate-pulse"
                          : "bg-border"
                    }`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Total Process Time</div>
              <div className="text-lg font-bold text-foreground">~500ms</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
              <div className="text-lg font-bold text-foreground">99.9%</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Daily Executions</div>
              <div className="text-lg font-bold text-foreground">~28,800</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
