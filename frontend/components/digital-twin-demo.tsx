"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Zap, AlertTriangle, Play, Pause, RotateCcw } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"

export function DigitalTwinDemo() {
  const [isRunning, setIsRunning] = useState(false)
  const [seizureRisk, setSeizureRisk] = useState(15)
  const [brainActivity, setBrainActivity] = useState<number[]>([])
  const [predictionStatus, setPredictionStatus] = useState<"normal" | "warning" | "critical">("normal")

  // Generate realistic EEG-like waveform data
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setBrainActivity((prev) => {
          const newData = [...prev]
          const baseValue = 50 + Math.sin(Date.now() / 1000) * 20
          const noise = (Math.random() - 0.5) * 30

          // Add spike if entering warning/critical zone
          let spike = 0
          if (seizureRisk > 60 && Math.random() > 0.7) {
            spike = Math.random() * 40
          }

          newData.push(baseValue + noise + spike)
          if (newData.length > 60) newData.shift()
          return newData
        })

        setSeizureRisk((prev) => {
          const change = (Math.random() - 0.4) * 5
          let newRisk = prev + change

          // Keep risk in realistic bounds with occasional spikes
          if (newRisk < 10) newRisk = 10 + Math.random() * 10
          if (newRisk > 95) newRisk = 90 + Math.random() * 5

          return newRisk
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [isRunning, seizureRisk])

  // Update prediction status based on risk level
  useEffect(() => {
    if (seizureRisk < 40) {
      setPredictionStatus("normal")
    } else if (seizureRisk < 70) {
      setPredictionStatus("warning")
    } else {
      setPredictionStatus("critical")
    }
  }, [seizureRisk])

  const handleReset = () => {
    setIsRunning(false)
    setSeizureRisk(15)
    setBrainActivity([])
    setPredictionStatus("normal")
  }

  const statusConfig = {
    normal: {
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      label: "Normal Activity",
    },
    warning: {
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      label: "Elevated Risk",
    },
    critical: {
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      label: "Critical - Seizure Likely",
    },
  }

  const config = statusConfig[predictionStatus]

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full aspect-square max-w-sm mx-auto mb-6">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-R5rHXJyLb8GNnIsqfcruueAgNPcopF.png"
                alt="Digital Twin Holographic Visualization"
                fill
                className="object-contain animate-pulse-glow"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Patient Digital Twin</h3>
              <p className="text-sm text-muted-foreground">Real-time neurological simulation</p>
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
                  Start Monitoring
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Display */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* EEG Waveform */}
        <Card className="lg:col-span-2 p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">EEG Signal Analysis</h4>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
              {isRunning ? "Live" : "Paused"}
            </div>
          </div>

          {/* Waveform Display */}
          <div className="relative h-48 bg-background rounded-lg border border-border p-4 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 40, 80, 120, 160].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="600"
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-border"
                />
              ))}

              {/* EEG waveform */}
              {brainActivity.length > 1 && (
                <polyline
                  points={brainActivity.map((val, i) => `${(i / brainActivity.length) * 600},${160 - val}`).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={config.color}
                />
              )}
            </svg>

            {!isRunning && brainActivity.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Start monitoring to see live EEG data</p>
              </div>
            )}
          </div>
        </Card>

        {/* Status Panel */}
        <Card className={`p-6 border-2 ${config.border} ${config.bg}`}>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className={`w-5 h-5 ${config.color}`} />
                <h4 className="font-semibold text-foreground">Seizure Risk</h4>
              </div>

              {/* Risk Meter */}
              <div className="text-center mb-4">
                <div className={`text-5xl font-bold ${config.color}`}>{Math.round(seizureRisk)}%</div>
                <div className={`text-sm font-semibold ${config.color} mt-1`}>{config.label}</div>
              </div>

              <Progress value={seizureRisk} className="h-3" />
            </div>

            {/* Risk Levels */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <span className="text-muted-foreground">Normal (0-40%)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-muted-foreground">Elevated (40-70%)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-destructive rounded-full" />
                <span className="text-muted-foreground">Critical (70-100%)</span>
              </div>
            </div>

            {/* Alert */}
            {predictionStatus === "critical" && (
              <div className={`p-3 rounded-lg ${config.bg} border ${config.border} flex items-start gap-2`}>
                <AlertTriangle className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5 animate-pulse`} />
                <p className="text-xs text-foreground">
                  High seizure probability detected. Patient and caregivers have been alerted.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border text-center">
          <div className="text-2xl font-bold text-primary">90%</div>
          <div className="text-xs text-muted-foreground">Model Accuracy</div>
        </Card>
        <Card className="p-4 bg-card border-border text-center">
          <div className="text-2xl font-bold text-primary">{isRunning ? "87ms" : "--"}</div>
          <div className="text-xs text-muted-foreground">Processing Time</div>
        </Card>
        <Card className="p-4 bg-card border-border text-center">
          <div className="text-2xl font-bold text-primary">{isRunning ? "5min" : "--"}</div>
          <div className="text-xs text-muted-foreground">Warning Lead Time</div>
        </Card>
        <Card className="p-4 bg-card border-border text-center">
          <div className="text-2xl font-bold text-primary">{isRunning ? "24/7" : "--"}</div>
          <div className="text-xs text-muted-foreground">Monitoring Active</div>
        </Card>
      </div>
    </div>
  )
}
