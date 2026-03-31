"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, MapPin, Clock, Users, Activity, Bell, CheckCircle2 } from "lucide-react"

interface Alert {
  id: string
  patientId: string
  patientName: string
  riskLevel: number
  status: "active" | "responding" | "resolved"
  location: { lat: number; lng: number; address: string }
  timestamp: Date
  responseTime?: number
}

export function EmergencyDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "ALT-001",
      patientId: "PT-2847",
      patientName: "Sophie Martin",
      riskLevel: 89,
      status: "responding",
      location: { lat: 48.8566, lng: 2.3522, address: "15 Rue de Rivoli, Paris 75001" },
      timestamp: new Date(Date.now() - 3 * 60000),
      responseTime: 3,
    },
    {
      id: "ALT-002",
      patientId: "PT-1923",
      patientName: "Thomas Dubois",
      riskLevel: 76,
      status: "active",
      location: { lat: 48.8499, lng: 2.3486, address: "28 Boulevard Saint-Michel, Paris 75006" },
      timestamp: new Date(Date.now() - 1 * 60000),
    },
    {
      id: "ALT-003",
      patientId: "PT-5621",
      patientName: "Marie Leclerc",
      riskLevel: 92,
      status: "resolved",
      location: { lat: 48.8738, lng: 2.295, address: "Avenue des Champs-Élysées, Paris 75008" },
      timestamp: new Date(Date.now() - 25 * 60000),
      responseTime: 4,
    },
  ])

  const [stats, setStats] = useState({
    activeAlerts: 2,
    totalPatients: 156,
    avgResponseTime: 4.2,
    successRate: 96,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time updates
      setAlerts((prev) =>
        prev.map((alert) => {
          if (alert.status === "active" && Math.random() > 0.7) {
            return { ...alert, status: "responding" as const, responseTime: Math.floor(Math.random() * 3) + 2 }
          }
          return alert
        }),
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: Alert["status"]) => {
    switch (status) {
      case "active":
        return "bg-destructive text-destructive-foreground"
      case "responding":
        return "bg-yellow-500 text-yellow-50"
      case "resolved":
        return "bg-primary text-primary-foreground"
    }
  }

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return "text-destructive"
    if (risk >= 60) return "text-yellow-500"
    return "text-primary"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-destructive/20 via-destructive/10 to-destructive/20 border-destructive/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
            <Bell className="w-6 h-6 text-destructive animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Emergency Response Dashboard</h3>
            <p className="text-sm text-muted-foreground">Real-time monitoring of seizure alerts and EMS responses</p>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.activeAlerts}</div>
              <div className="text-xs text-muted-foreground">Active Alerts</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.totalPatients}</div>
              <div className="text-xs text-muted-foreground">Monitored Patients</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.avgResponseTime}min</div>
              <div className="text-xs text-muted-foreground">Avg Response Time</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.successRate}%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Map & Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map Visualization */}
        <Card className="p-6 bg-card border-border">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Live Location Tracking
          </h4>

          {/* Simplified map with alert pins */}
          <div className="relative h-80 bg-muted rounded-lg overflow-hidden border border-border">
            {/* Map background (simplified Paris map representation) */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-muted to-primary/10" />

            {/* Street grid overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-20">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Alert markers */}
            {alerts.map((alert, index) => (
              <div
                key={alert.id}
                className="absolute animate-pulse"
                style={{
                  left: `${20 + index * 25}%`,
                  top: `${30 + index * 15}%`,
                }}
              >
                <div className="relative">
                  {/* Pulsing ring */}
                  <div
                    className={`absolute inset-0 w-12 h-12 rounded-full ${alert.status === "active" ? "bg-destructive/30" : alert.status === "responding" ? "bg-yellow-500/30" : "bg-primary/30"} animate-ping`}
                  />
                  {/* Pin marker */}
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center ${alert.status === "active" ? "bg-destructive" : alert.status === "responding" ? "bg-yellow-500" : "bg-primary"} shadow-lg`}
                  >
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  {/* Patient label */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold bg-background px-2 py-1 rounded border border-border">
                    {alert.patientName.split(" ")[0]}
                  </div>
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border border-border text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded-full" />
                <span>Active Alert</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span>EMS Responding</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <span>Resolved</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Alert List */}
        <Card className="p-6 bg-card border-border">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Recent Alerts
          </h4>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{alert.patientName}</span>
                      <Badge variant="outline" className="text-xs">
                        {alert.patientId}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{alert.id}</div>
                  </div>
                  <Badge className={getStatusColor(alert.status)}>
                    {alert.status === "active" ? "Active" : alert.status === "responding" ? "Responding" : "Resolved"}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${getRiskColor(alert.riskLevel)}`} />
                    <span className="text-muted-foreground">Risk Level:</span>
                    <span className={`font-semibold ${getRiskColor(alert.riskLevel)}`}>{alert.riskLevel}%</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{alert.location.address}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor((Date.now() - alert.timestamp.getTime()) / 60000)}min ago
                    </div>
                    {alert.responseTime && (
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Response: {alert.responseTime}min
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Response Timeline */}
      <Card className="p-6 bg-card border-border">
        <h4 className="font-semibold text-foreground mb-4">Emergency Response Timeline</h4>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline events */}
          <div className="space-y-6">
            <div className="relative flex items-start gap-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                <Bell className="w-8 h-8 text-destructive" />
              </div>
              <div className="flex-1 pt-3">
                <div className="font-semibold text-foreground">Alert Generated</div>
                <div className="text-sm text-muted-foreground">Edge-AI detects anomaly • GPS location captured</div>
              </div>
            </div>

            <div className="relative flex items-start gap-4">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                <MapPin className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="flex-1 pt-3">
                <div className="font-semibold text-foreground">EMS Dispatched</div>
                <div className="text-sm text-muted-foreground">
                  Nearest ambulance notified • Real-time routing • Patient data shared
                </div>
              </div>
            </div>

            <div className="relative flex items-start gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 pt-3">
                <div className="font-semibold text-foreground">Crisis Prevented</div>
                <div className="text-sm text-muted-foreground">
                  EMS arrives before seizure • Patient stabilized • No injury
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
