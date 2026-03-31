"use client"

import { Card } from "@/components/ui/card"
import {
  Activity,
  Database,
  Brain,
  AlertTriangle,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  Smartphone,
} from "lucide-react"

export function ProcessDiagram() {
  const processes = [
    {
      id: 1,
      title: "Data Acquisition",
      icon: Activity,
      description: "EEG & IMU sensors capture physiological signals",
      color: "bg-blue-500",
      details: ["Smartwatch sensors", "24/7 monitoring", "Real-time data stream"],
    },
    {
      id: 2,
      title: "Preprocessing",
      icon: Database,
      description: "Signal filtering and artifact removal",
      color: "bg-purple-500",
      details: ["Bandpass filtering", "Normalization", "Artifact detection"],
    },
    {
      id: 3,
      title: "Feature Encoding",
      icon: Brain,
      description: "1D→2D transformation (GASF/MTF/RP)",
      color: "bg-pink-500",
      details: ["GASF encoding", "MTF encoding", "Recurrence plots"],
    },
    {
      id: 4,
      title: "AI Prediction",
      icon: Smartphone,
      description: "ResNet-CBAM Edge-AI model",
      color: "bg-primary",
      details: ["On-device inference", "90% accuracy", "87ms latency"],
    },
    {
      id: 5,
      title: "Risk Assessment",
      icon: AlertTriangle,
      description: "Seizure probability calculation",
      color: "bg-yellow-500",
      details: ["Risk scoring", "Threshold detection", "Alert triggering"],
    },
    {
      id: 6,
      title: "GPS Localization",
      icon: MapPin,
      description: "Patient location capture",
      color: "bg-green-500",
      details: ["Real-time GPS", "Address lookup", "Location sharing"],
    },
    {
      id: 7,
      title: "Emergency Alert",
      icon: Users,
      description: "EMS & caregiver notification",
      color: "bg-destructive",
      details: ["SMS/push alerts", "EMS dispatch", "Patient data"],
    },
    {
      id: 8,
      title: "Response",
      icon: CheckCircle2,
      description: "Intervention before seizure",
      color: "bg-primary",
      details: ["EMS arrival", "Patient stabilization", "Crisis prevention"],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">End-to-End Process Flow</h3>
            <p className="text-sm text-muted-foreground">From sensor data to emergency response in under 5 minutes</p>
          </div>
        </div>
      </Card>

      {/* Process Flow Diagram */}
      <Card className="p-8 bg-card border-border overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Desktop view - horizontal flow */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Connection lines */}
              <div className="absolute top-20 left-0 right-0 h-0.5 bg-border" />

              {/* Process nodes */}
              <div className="grid grid-cols-4 gap-8">
                {processes.map((process, index) => {
                  const Icon = process.icon
                  return (
                    <div key={process.id} className="relative">
                      {/* Connector arrow */}
                      {index < processes.length - 1 && index % 4 !== 3 && (
                        <div className="absolute left-full top-20 -translate-y-1/2 z-0">
                          <ArrowRight className="w-6 h-6 text-border" />
                        </div>
                      )}

                      {/* Process card */}
                      <div className="relative z-10 space-y-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-20 h-20 ${process.color} rounded-full flex items-center justify-center shadow-lg mb-3`}
                          >
                            <Icon className="w-10 h-10 text-white" />
                          </div>
                          <div className="text-xs font-semibold text-muted-foreground mb-1">Step {process.id}</div>
                          <h4 className="font-semibold text-foreground text-center text-sm">{process.title}</h4>
                          <p className="text-xs text-muted-foreground text-center mt-1">{process.description}</p>
                        </div>

                        {/* Details */}
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                          {process.details.map((detail, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Line break for 4-column grid */}
                      {index === 3 && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 col-span-4">
                          <ArrowRight className="w-6 h-6 text-border rotate-90" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile view - vertical flow */}
          <div className="md:hidden space-y-4">
            {processes.map((process, index) => {
              const Icon = process.icon
              return (
                <div key={process.id} className="relative">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-16 h-16 ${process.color} rounded-full flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Step {process.id}</div>
                      <h4 className="font-semibold text-foreground">{process.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{process.description}</p>
                      <div className="mt-2 space-y-1">
                        {process.details.map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {index < processes.length - 1 && (
                    <div className="flex justify-center my-3">
                      <ArrowRight className="w-5 h-5 text-border rotate-90" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">5min</div>
            <div className="text-sm text-muted-foreground">Total Alert Time</div>
            <div className="text-xs text-muted-foreground mt-2">From detection to EMS arrival</div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">87ms</div>
            <div className="text-sm text-muted-foreground">AI Inference Time</div>
            <div className="text-xs text-muted-foreground mt-2">Edge computing on smartwatch</div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">90%</div>
            <div className="text-sm text-muted-foreground">Prediction Accuracy</div>
            <div className="text-xs text-muted-foreground mt-2">Clinical validation results</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
