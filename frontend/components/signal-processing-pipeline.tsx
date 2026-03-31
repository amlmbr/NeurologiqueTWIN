"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Brain, ImageIcon, Zap, Activity, Play, Pause } from "lucide-react"

export function SignalProcessingPipeline() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const epilepsyClasses = [
    { name: "Tonique", color: "#ef4444", description: "Raidissement musculaire" },
    { name: "Clonique", color: "#f97316", description: "Secousses rythmiques" },
    { name: "Myoclonique", color: "#eab308", description: "Contractions brèves" },
    { name: "Atonique", color: "#84cc16", description: "Perte de tonus musculaire" },
    { name: "Absence", color: "#06b6d4", description: "Perte de conscience brève" },
  ]

  const steps = [
    {
      id: 0,
      title: "Signal EEG Brut",
      icon: Activity,
      description: "Acquisition des signaux cérébraux multi-canaux",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      visual: "eeg",
    },
    {
      id: 1,
      title: "Prétraitement",
      icon: Zap,
      description: "Filtrage 0.5-50Hz + Débruitage ondelettes",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      visual: "preprocessing",
    },
    {
      id: 2,
      title: "Transformation 1D→2D",
      icon: ImageIcon,
      description: "GASF / MTF / Recurrence Plot",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      visual: "transformation",
    },
    {
      id: 3,
      title: "Image RGB",
      icon: ImageIcon,
      description: "Fusion multi-canaux en image couleur 64×64",
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      visual: "rgb",
    },
    {
      id: 4,
      title: "ResNet-CBAM",
      icon: Brain,
      description: "Classification par deep learning",
      color: "text-primary",
      bg: "bg-primary/10",
      visual: "classification",
    },
  ]

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [isAnimating, steps.length])

  const renderVisualization = (step: (typeof steps)[0]) => {
    switch (step.visual) {
      case "eeg":
        return (
          <div className="h-full flex items-center justify-center p-4">
            <svg className="w-full h-32" viewBox="0 0 400 100" preserveAspectRatio="none">
              {/* Multi-channel EEG waves */}
              {[0, 1, 2, 3].map((channel) => (
                <g key={channel} transform={`translate(0, ${channel * 25})`}>
                  <polyline
                    points={Array.from({ length: 100 }, (_, i) => {
                      const x = (i / 100) * 400
                      const y = 12 + Math.sin((i + channel * 20) * 0.3) * 8 + Math.random() * 3
                      return `${x},${y}`
                    }).join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                </g>
              ))}
            </svg>
          </div>
        )

      case "preprocessing":
        return (
          <div className="h-full flex items-center justify-center p-4">
            <div className="space-y-2 w-full">
              <div className="flex items-center gap-2">
                <div className="w-24 text-xs text-muted-foreground">Brut:</div>
                <div className="flex-1 h-8 bg-gradient-to-r from-blue-500/20 via-cyan-500/40 to-blue-500/20 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 text-xs text-muted-foreground">Filtré:</div>
                <div className="flex-1 h-8 bg-gradient-to-r from-cyan-500/30 to-cyan-500/30 rounded" />
              </div>
            </div>
          </div>
        )

      case "transformation":
        return (
          <div className="h-full grid grid-cols-3 gap-2 p-4">
            {["GASF", "MTF", "RP"].map((method, i) => (
              <div key={method} className="space-y-1">
                <div className="text-xs text-center text-muted-foreground">{method}</div>
                <div
                  className="aspect-square rounded bg-gradient-to-br from-purple-500/30 to-pink-500/30 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              </div>
            ))}
          </div>
        )

      case "rgb":
        return (
          <div className="h-full flex items-center justify-center p-4">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/40 via-green-500/40 to-blue-500/40 rounded-lg animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-semibold">
                64×64
              </div>
            </div>
          </div>
        )

      case "classification":
        return (
          <div className="h-full flex flex-col items-center justify-center p-4 space-y-3">
            <Brain className="w-12 h-12 text-primary animate-pulse" />
            <div className="text-center space-y-1">
              <div className="text-sm font-semibold text-foreground">ResNet-CBAM</div>
              <div className="text-xs text-muted-foreground">90% Accuracy</div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-foreground">Pipeline de Traitement du Signal</h3>
        <p className="text-sm text-muted-foreground">
          De l'acquisition EEG à la prédiction de crise via transformation d'image et deep learning
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        <Button onClick={() => setIsAnimating(!isAnimating)} variant="outline" size="sm" className="gap-2">
          {isAnimating ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Animer
            </>
          )}
        </Button>
      </div>

      {/* Pipeline Steps */}
      <div className="relative">
        {/* Connection Lines */}
        <div className="absolute top-24 left-0 right-0 h-0.5 bg-border hidden lg:block" />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Arrow for mobile */}
              {index < steps.length - 1 && (
                <div className="lg:hidden flex justify-center my-2">
                  <ArrowRight className="w-6 h-6 text-muted-foreground" />
                </div>
              )}

              <Card
                className={`relative transition-all duration-500 ${
                  currentStep === index
                    ? `border-2 ${step.color.replace("text-", "border-")} shadow-lg`
                    : "border-border"
                }`}
              >
                {/* Step Indicator */}
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-4 border-background flex items-center justify-center ${step.bg} transition-all duration-500`}
                >
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </div>

                {/* Step Content */}
                <div className="pt-12 pb-4 px-4 space-y-3">
                  <div className="text-center">
                    <h4 className="font-semibold text-sm text-foreground">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  </div>

                  {/* Visualization */}
                  <div className="bg-background/50 rounded-lg h-32 border border-border">
                    {renderVisualization(step)}
                  </div>
                </div>
              </Card>

              {/* Arrow for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-24 -right-5 z-10">
                  <ArrowRight className="w-10 h-10 text-primary animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Output: Seizure Classes */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-card border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" />
            <h4 className="text-lg font-bold text-foreground">Classes de Crises Détectées</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {epilepsyClasses.map((classType, index) => (
              <div
                key={classType.name}
                className="p-4 rounded-lg border-2 transition-all hover:scale-105"
                style={{
                  borderColor: classType.color,
                  backgroundColor: `${classType.color}15`,
                }}
              >
                <div className="text-center space-y-2">
                  <div
                    className="w-3 h-3 rounded-full mx-auto animate-pulse"
                    style={{
                      backgroundColor: classType.color,
                      animationDelay: `${index * 200}ms`,
                    }}
                  />
                  <div className="font-bold text-sm" style={{ color: classType.color }}>
                    {classType.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{classType.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Le modèle ResNet-CBAM classifie les signaux EEG transformés en 5 types de crises épileptiques
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
