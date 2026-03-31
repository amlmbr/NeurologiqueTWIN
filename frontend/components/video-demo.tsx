"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, Play, Pause, Volume2, VolumeX, AlertCircle, Activity, MapPin, Clock } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export function VideoDemo() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(16)
  const [isMuted, setIsMuted] = useState(false)
  const [currentScene, setCurrentScene] = useState(0)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()

  const scenes = [
    { time: 0, title: "Normal Walk", description: "Person walking naturally, smartwatch visible" },
    { time: 4, title: "Smartwatch Close-up", description: "Close-up of watch detecting patterns" },
    { time: 7, title: "AI Detection", description: "Edge-AI predicts seizure risk, sends GPS alert" },
    { time: 10, title: "Emergency Response", description: "Paramedics arrive before crisis occurs" },
  ]

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const animate = (timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp
    const elapsed = (timestamp - startTimeRef.current) / 1000

    setCurrentTime(elapsed)

    const scene = scenes.findIndex((s, i) => {
      const nextScene = scenes[i + 1]
      return elapsed >= s.time && (!nextScene || elapsed < nextScene.time)
    })
    if (scene !== -1) setCurrentScene(scene)

    if (elapsed < duration) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      setIsPlaying(false)
      setCurrentTime(0)
      startTimeRef.current = undefined
    }
  }

  const togglePlay = () => {
    if (isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      setIsPlaying(false)
    } else {
      startTimeRef.current = performance.now() - currentTime * 1000
      animationRef.current = requestAnimationFrame(animate)
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    setCurrentTime(newTime)
    if (isPlaying) {
      startTimeRef.current = performance.now() - newTime * 1000
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getProgress = () => (currentTime / duration) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Real-World Scenario Demonstration</h3>
              <p className="text-sm text-muted-foreground">Interactive Edge-AI seizure prediction in action</p>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Detection Alert */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-background rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Edge-AI Detection & Prevention
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Watch how the smartwatch continuously monitors vital signs, detects pre-seizure patterns using on-device
              AI, and sends GPS-located emergency alerts—preventing crisis before it happens
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground">5 min warning time</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground">GPS localization</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Video Player */}
      <Card className="overflow-hidden border-border bg-card">
        <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 h-[400px]">
          {/* Animated Scenario Scene */}
          <div className="relative w-full h-full flex items-center justify-center p-8">
            {/* Scene 1: Walking */}
            {currentScene === 0 && (
              <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-32 h-48 bg-gradient-to-b from-blue-900 to-blue-950 rounded-full opacity-80 animate-pulse" />
                  <div className="absolute bottom-8 left-8 w-12 h-12 bg-cyan-500 rounded-lg shadow-lg shadow-cyan-500/50 animate-pulse">
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                      Watch
                    </div>
                  </div>
                  <div className="absolute -right-16 top-12 text-cyan-400 text-sm animate-pulse">Normal activity</div>
                </div>
              </div>
            )}

            {/* Scene 2: Watch Close-up */}
            {currentScene === 1 && (
              <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-48 h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-4 border-cyan-500 shadow-2xl shadow-cyan-500/30 flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="w-16 h-16 text-cyan-400 mx-auto mb-2 animate-pulse" />
                      <div className="text-cyan-400 text-xs font-mono">Monitoring...</div>
                    </div>
                  </div>
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-cyan-400 text-sm animate-pulse whitespace-nowrap">
                    Analyzing signals
                  </div>
                </div>
              </div>
            )}

            {/* Scene 3: AI Detection Alert */}
            {currentScene === 2 && (
              <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-500">
                <div className="relative text-center">
                  <div className="mb-6">
                    <AlertCircle className="w-24 h-24 text-red-500 mx-auto animate-pulse" />
                  </div>
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-6 mb-4 animate-pulse">
                    <div className="text-red-400 font-bold text-xl mb-2">SEIZURE RISK DETECTED</div>
                    <div className="text-red-300 text-sm">Risk Level: 92%</div>
                  </div>
                  <div className="bg-primary/20 border border-primary rounded-lg p-4 flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-primary animate-pulse" />
                    <div className="text-left">
                      <div className="text-primary font-semibold text-sm">Emergency Alert Sent</div>
                      <div className="text-primary/70 text-xs">GPS: 48.8566° N, 2.3522° E</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scene 4: Paramedics Arrive */}
            {currentScene === 3 && (
              <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-500">
                <div className="relative flex items-center gap-8">
                  <div className="text-center">
                    <div className="w-24 h-40 bg-gradient-to-b from-blue-900 to-blue-950 rounded-full opacity-80 mb-2" />
                    <div className="text-cyan-400 text-sm">Patient Safe</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="w-20 h-40 bg-gradient-to-b from-green-900 to-green-950 rounded-full opacity-80 mb-2" />
                      <div className="text-green-400 text-xs">Paramedic 1</div>
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-40 bg-gradient-to-b from-green-900 to-green-950 rounded-full opacity-80 mb-2" />
                      <div className="text-green-400 text-xs">Paramedic 2</div>
                    </div>
                  </div>
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-green-400 text-sm animate-pulse whitespace-nowrap">
                    Crisis prevented ✓
                  </div>
                </div>
              </div>
            )}

            {/* Play/Pause Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Button
                size="lg"
                className="w-20 h-20 rounded-full shadow-lg shadow-primary/20 hover:scale-110 transition-transform opacity-80 hover:opacity-100"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </Button>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              <div
                className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-3 cursor-pointer hover:h-2 transition-all"
                onClick={handleSeek}
              >
                <div className="h-full bg-primary transition-all" style={{ width: `${getProgress()}%` }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <span className="text-xs text-white font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="text-xs text-white/80 px-2 py-1 bg-white/10 rounded">{scenes[currentScene].title}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Scene Navigation */}
      <Card className="p-6 bg-card border-border">
        <h4 className="font-semibold text-foreground mb-4">Scenario Timeline</h4>
        <div className="grid md:grid-cols-4 gap-3">
          {scenes.map((scene, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentTime(scene.time)
                setCurrentScene(idx)
                if (isPlaying) {
                  startTimeRef.current = performance.now() - scene.time * 1000
                }
              }}
              className={`p-3 rounded-lg text-left transition-all ${
                currentScene === idx
                  ? "bg-primary/20 border-2 border-primary"
                  : "bg-muted/50 border border-border hover:bg-muted"
              }`}
            >
              <div className="text-xs text-muted-foreground mb-1">{formatTime(scene.time)}</div>
              <div className={`text-sm font-medium mb-1 ${currentScene === idx ? "text-primary" : "text-foreground"}`}>
                {scene.title}
              </div>
              <div className="text-xs text-muted-foreground">{scene.description}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Key Features */}
      <Card className="p-6 bg-card border-border">
        <h4 className="font-semibold text-foreground mb-4">Prevention Through Early Detection</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Continuous Monitoring</p>
              <p className="text-xs text-muted-foreground">
                Smartwatch analyzes heart rate, movement, and other vitals 24/7 during normal activities
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border-l-2 border-yellow-500/50">
            <div className="w-8 h-8 bg-yellow-500/20 rounded flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-yellow-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Edge-AI Prediction (90% accuracy)</p>
              <p className="text-xs text-muted-foreground">
                On-device ResNet-CBAM model detects pre-seizure patterns 5 minutes in advance
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border-l-2 border-green-500/50">
            <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Peaceful Intervention</p>
              <p className="text-xs text-muted-foreground">
                GPS alert enables calm emergency response BEFORE seizure occurs—no falls, no injuries
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
