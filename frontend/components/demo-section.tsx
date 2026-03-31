"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DigitalTwinDemo } from "@/components/digital-twin-demo"
import { BPMNDemo } from "@/components/bpmn-demo"
import { MesaDemo } from "@/components/mesa-demo"
import { VideoDemo } from "@/components/video-demo"
import { EmergencyDashboard } from "@/components/emergency-dashboard"
import { ProcessDiagram } from "@/components/process-diagram"
import { SignalProcessingPipeline } from "@/components/signal-processing-pipeline"
import { Activity, Network, BarChart3, Video, Bell, GitBranch, Waves } from "lucide-react"

export function DemoSection() {
  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Interactive Demonstration</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Experience <span className="text-primary">NeurologiqueTWIN</span> in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Explore our cutting-edge technology through interactive demonstrations of the digital twin, workflow
            automation, and predictive simulations.
          </p>
        </div>

        {/* Demo Tabs */}
        <Tabs defaultValue="video" className="w-full">
          <TabsList className="grid w-full max-w-6xl mx-auto grid-cols-3 md:grid-cols-7 mb-8 h-auto p-1 gap-1">
            <TabsTrigger value="video" className="gap-2 py-3">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Video</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2 py-3">
              <Waves className="w-4 h-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="digital-twin" className="gap-2 py-3">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Twin</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2 py-3">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="process" className="gap-2 py-3">
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">Process</span>
            </TabsTrigger>
            <TabsTrigger value="bpmn" className="gap-2 py-3">
              <Network className="w-4 h-4" />
              <span className="hidden sm:inline">BPMN</span>
            </TabsTrigger>
            <TabsTrigger value="mesa" className="gap-2 py-3">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Mesa</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video">
            <VideoDemo />
          </TabsContent>

          <TabsContent value="pipeline">
            <SignalProcessingPipeline />
          </TabsContent>

          <TabsContent value="digital-twin">
            <DigitalTwinDemo />
          </TabsContent>

          <TabsContent value="dashboard">
            <EmergencyDashboard />
          </TabsContent>

          <TabsContent value="process">
            <ProcessDiagram />
          </TabsContent>

          <TabsContent value="bpmn">
            <BPMNDemo />
          </TabsContent>

          <TabsContent value="mesa">
            <MesaDemo />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
