import { Calendar, CheckCircle, Clock, Rocket, Target } from "lucide-react"
import { Card } from "@/components/ui/card"

export function RoadmapSection() {
  const roadmap = [
    {
      phase: "Q1-Q2 2024",
      status: "completed",
      title: "Foundation & Proof of Concept",
      milestones: [
        { text: "AI model development and initial training", completed: true },
        { text: "Digital twin architecture design", completed: true },
        { text: "Prototype hardware development", completed: true },
        { text: "Pilot study with 50 patients", completed: true },
        { text: "Initial accuracy: 89%", completed: true },
      ],
    },
    {
      phase: "Q3-Q4 2024",
      status: "completed",
      title: "Clinical Validation",
      milestones: [
        { text: "FDA breakthrough device designation obtained", completed: true },
        { text: "Multi-center clinical trial (1,000 patients)", completed: true },
        { text: "Achieved 96% prediction accuracy", completed: true },
        { text: "Published preliminary results", completed: true },
        { text: "Filed 3 core patents", completed: true },
      ],
    },
    {
      phase: "Q1-Q2 2025",
      status: "in-progress",
      title: "Regulatory & Pre-Launch",
      milestones: [
        { text: "Complete FDA 510(k) submission", completed: true },
        { text: "Establish manufacturing partnerships", completed: true },
        { text: "Secure insurance reimbursement codes", completed: false },
        { text: "Launch limited pilot with 5 healthcare centers", completed: false },
        { text: "Beta testing program (500 users)", completed: false },
      ],
    },
    {
      phase: "Q3-Q4 2025",
      status: "planned",
      title: "Commercial Launch (US)",
      milestones: [
        { text: "FDA clearance obtained", completed: false },
        { text: "Full commercial launch in United States", completed: false },
        { text: "Direct-to-consumer marketing campaign", completed: false },
        { text: "Partnerships with 50+ epilepsy centers", completed: false },
        { text: "Target: 10,000 active users", completed: false },
      ],
    },
    {
      phase: "2026",
      status: "planned",
      title: "Scale & International Expansion",
      milestones: [
        { text: "CE Mark approval for EU market", completed: false },
        { text: "Launch in UK, Germany, France", completed: false },
        { text: "Telehealth integration partnerships", completed: false },
        { text: "Pediatric device variant development", completed: false },
        { text: "Target: 100,000 active users", completed: false },
      ],
    },
    {
      phase: "2027+",
      status: "future",
      title: "Innovation & Diversification",
      milestones: [
        { text: "AI model updates for other neurological conditions", completed: false },
        { text: "Predictive models for migraine, Parkinson's tremors", completed: false },
        { text: "Strategic partnerships with pharma companies", completed: false },
        { text: "Global expansion to Asia-Pacific markets", completed: false },
        { text: "Target: 500,000+ active users", completed: false },
      ],
    },
  ]

  const upcomingMilestones = [
    {
      title: "FDA Clearance",
      date: "Q3 2025",
      priority: "Critical",
      description: "Final regulatory approval for commercial distribution",
    },
    {
      title: "Commercial Launch",
      date: "Q4 2025",
      priority: "Critical",
      description: "Full market launch with national availability",
    },
    {
      title: "Insurance Coverage",
      date: "Q2 2025",
      priority: "High",
      description: "Major insurers adding TWIN to covered devices",
    },
    {
      title: "Pediatric Variant",
      date: "Q1 2026",
      priority: "High",
      description: "Specialized version for children under 12",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-primary" />
      case "in-progress":
        return <Clock className="w-5 h-5 text-primary animate-pulse" />
      default:
        return <Target className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-primary/10 border-primary/20"
      case "in-progress":
        return "bg-primary/20 border-primary/40"
      default:
        return "bg-muted border-border"
    }
  }

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Product Roadmap</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Our Journey to <span className="text-primary">Transform</span> Epilepsy Care
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            From groundbreaking research to global impact—our strategic roadmap for bringing predictive seizure
            technology to millions of patients worldwide.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mb-16">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

          <div className="space-y-8">
            {roadmap.map((phase, index) => (
              <div key={index} className="relative pl-20">
                {/* Timeline dot */}
                <div
                  className={`absolute left-6 top-6 w-5 h-5 rounded-full border-4 border-background ${phase.status === "completed" ? "bg-primary" : phase.status === "in-progress" ? "bg-primary animate-pulse" : "bg-muted"}`}
                />

                <Card className={`p-6 ${getStatusColor(phase.status)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(phase.status)}
                        <div className="text-xs font-semibold text-primary">{phase.phase}</div>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{phase.title}</h3>
                    </div>
                    <div
                      className={`text-xs px-3 py-1 rounded-full ${
                        phase.status === "completed"
                          ? "bg-primary/20 text-primary"
                          : phase.status === "in-progress"
                            ? "bg-primary/30 text-primary"
                            : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {phase.status === "completed"
                        ? "Completed"
                        : phase.status === "in-progress"
                          ? "In Progress"
                          : "Planned"}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {phase.milestones.map((milestone, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        {milestone.completed ? (
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-muted-foreground/30 rounded-full flex-shrink-0 mt-0.5" />
                        )}
                        <span className={milestone.completed ? "text-foreground" : "text-muted-foreground"}>
                          {milestone.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-bold text-foreground">Key Upcoming Milestones</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {upcomingMilestones.map((milestone, index) => (
              <Card key={index} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-semibold text-foreground">{milestone.title}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      milestone.priority === "Critical"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {milestone.priority}
                  </span>
                </div>
                <div className="text-sm text-primary mb-2">{milestone.date}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Vision Statement */}
        <div className="mt-16 p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-2xl text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">Our 2030 Vision</h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            By 2030, NeurologiqueTWIN will be the global standard for seizure prediction, serving over 500,000 patients
            across 50 countries. We envision a world where epilepsy patients can live with confidence, independence, and
            freedom from the fear of unexpected seizures.
          </p>
        </div>
      </div>
    </section>
  )
}
