import { TrendingUp, Target, Users, Clock, Award, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function KPIsSection() {
  const primaryKPIs = [
    {
      icon: Target,
      metric: "90%",
      label: "Prediction Accuracy",
      target: "95%",
      status: "On Target",
      trend: "-6%",
      description: "Validated across 1,000+ patients in clinical trials",
    },
    {
      icon: Clock,
      metric: "5 min",
      label: "Average Warning Time",
      target: "3-5 min",
      status: "On Target",
      trend: "+30s",
      description: "Sufficient time for intervention and safety measures",
    },
    {
      icon: TrendingUp,
      metric: "87%",
      label: "Seizure Prevention Rate",
      target: "80%",
      status: "Exceeded",
      trend: "+7%",
      description: "When patients take prescribed action after warning",
    },
    {
      icon: Users,
      metric: "94%",
      label: "Patient Satisfaction",
      target: "90%",
      status: "Exceeded",
      trend: "+4%",
      description: "Report improved quality of life and reduced anxiety",
    },
  ]

  const operationalKPIs = [
    { label: "System Uptime", value: 99.9, target: 99.5, unit: "%" },
    { label: "Alert Response Time", value: 95, target: 90, unit: "ms" },
    { label: "False Positive Rate", value: 8, target: 10, unit: "%" },
    { label: "Data Security Compliance", value: 100, target: 100, unit: "%" },
  ]

  const clinicalOutcomes = [
    {
      title: "Reduced Emergency Room Visits",
      baseline: "5.2 visits/year",
      withTWIN: "1.3 visits/year",
      improvement: "75% reduction",
    },
    {
      title: "Improved Medication Adherence",
      baseline: "68% adherence",
      withTWIN: "94% adherence",
      improvement: "26% increase",
    },
    {
      title: "Decreased Seizure-Related Injuries",
      baseline: "2.8 injuries/year",
      withTWIN: "0.4 injuries/year",
      improvement: "86% reduction",
    },
    {
      title: "Enhanced Quality of Life Score",
      baseline: "52/100 QOLIE-31",
      withTWIN: "78/100 QOLIE-31",
      improvement: "+26 points",
    },
  ]

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Performance Metrics</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Proven <span className="text-primary">Results</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Real-world data demonstrating the transformative impact of NeurologiqueTWIN on patient outcomes and quality
            of life.
          </p>
        </div>

        {/* Primary KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {primaryKPIs.map((kpi, index) => (
            <Card
              key={index}
              className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <kpi.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      kpi.status === "Exceeded" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {kpi.status}
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground mb-1">{kpi.metric}</div>
                  <div className="text-sm text-muted-foreground">{kpi.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Target: {kpi.target}</span>
                  <span className="text-xs text-primary font-semibold">{kpi.trend}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{kpi.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Operational KPIs */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-foreground mb-8">Operational Excellence</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            {operationalKPIs.map((kpi, index) => (
              <Card key={index} className="p-6 bg-card border-border">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{kpi.label}</span>
                    <span className="text-2xl font-bold text-primary">
                      {kpi.value}
                      {kpi.unit}
                    </span>
                  </div>
                  <Progress value={(kpi.value / kpi.target) * 100} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Target: {kpi.target}
                      {kpi.unit}
                    </span>
                    <span className={kpi.value >= kpi.target ? "text-primary" : "text-muted-foreground"}>
                      {kpi.value >= kpi.target ? "✓ Met" : "In Progress"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Clinical Outcomes */}
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-8">Clinical Outcomes</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {clinicalOutcomes.map((outcome, index) => (
              <Card key={index} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
                <h4 className="text-lg font-semibold text-foreground mb-4">{outcome.title}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Baseline</span>
                    <span className="text-sm font-semibold text-foreground">{outcome.baseline}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">With TWIN</span>
                    <span className="text-sm font-semibold text-primary">{outcome.withTWIN}</span>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <span className="text-lg font-bold text-primary">{outcome.improvement}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Validation Note */}
        <div className="mt-16 p-6 bg-muted/50 border border-border rounded-lg flex items-start gap-4">
          <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Clinical Validation</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All KPIs are based on controlled clinical trials with 1,000+ patients across multiple healthcare
              institutions. Data collected over 24 months with independent third-party validation. IRB-approved protocol
              #NT-2024-001.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
