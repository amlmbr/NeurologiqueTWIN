import { AlertCircle, Brain, Clock, TrendingDown, Users } from "lucide-react"
import { Card } from "@/components/ui/card"

export function ProblemSection() {
  const statistics = [
    {
      icon: Users,
      value: "50M+",
      label: "People worldwide with epilepsy",
      description: "70% live in low-resource settings",
    },
    {
      icon: TrendingDown,
      value: "30%",
      label: "Treatment-resistant cases",
      description: "Cannot achieve seizure control with medication",
    },
    {
      icon: Clock,
      value: "0min",
      label: "Current warning time",
      description: "No reliable prediction system exists",
    },
    {
      icon: AlertCircle,
      value: "3x",
      label: "Higher mortality risk",
      description: "Due to SUDEP and seizure-related injuries",
    },
  ]

  const challenges = [
    {
      title: "Unpredictability",
      description:
        "Patients live in constant fear of the next seizure, unable to plan activities, work, or drive safely. This unpredictability severely impacts quality of life and mental health.",
      impact: "Critical",
    },
    {
      title: "Delayed Medical Response",
      description:
        "Without warning, seizures can occur in dangerous situations—while driving, swimming, or alone. Emergency services are often called too late, leading to preventable injuries and complications.",
      impact: "Critical",
    },
    {
      title: "Limited Monitoring Tools",
      description:
        "Current EEG monitoring is typically limited to clinical settings. Continuous home monitoring solutions are expensive, cumbersome, and don't provide predictive insights.",
      impact: "High",
    },
    {
      title: "One-Size-Fits-All Treatment",
      description:
        "Treatment plans are generic and reactive rather than personalized and proactive. Physicians lack the data to optimize medication timing and dosages for individual seizure patterns.",
      impact: "High",
    },
  ]

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-full">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">The Critical Problem</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Living in the Shadow of <span className="text-destructive">Uncertainty</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Epilepsy affects millions worldwide, but the inability to predict seizures leaves patients vulnerable and
            anxious, severely limiting their independence and quality of life.
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {statistics.map((stat, index) => (
            <Card
              key={index}
              className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-destructive" />
                </div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm font-semibold text-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.description}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Key Challenges */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-foreground mb-8">Key Challenges in Epilepsy Care</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {challenges.map((challenge, index) => (
              <Card key={index} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 bg-destructive rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-foreground">{challenge.title}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          challenge.impact === "Critical"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {challenge.impact}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 p-8 bg-gradient-to-r from-destructive/10 via-destructive/5 to-primary/10 border border-border rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <Brain className="w-8 h-8 text-primary" />
            <h3 className="text-2xl font-bold text-foreground">The Solution: Predictive Technology</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            What if we could predict seizures minutes before they occur? NeurologiqueTWIN uses AI-powered digital twin
            technology to analyze real-time EEG data and provide advance warning, transforming epilepsy management from
            reactive to proactive.
          </p>
        </div>
      </div>
    </section>
  )
}
