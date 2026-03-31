import { TrendingUp, DollarSign, Users, Globe, Target, Building } from "lucide-react"
import { Card } from "@/components/ui/card"

export function MarketSection() {
  const marketStats = [
    {
      icon: DollarSign,
      value: "$2.8B",
      label: "Market Size (2024)",
      growth: "Growing at 7.2% CAGR",
    },
    {
      icon: Users,
      value: "50M+",
      label: "Potential Users",
      growth: "Worldwide epilepsy patients",
    },
    {
      icon: Globe,
      value: "195",
      label: "Countries",
      growth: "Regulatory pathways identified",
    },
    {
      icon: TrendingUp,
      value: "$4.5B",
      label: "Projected Market (2030)",
      growth: "Digital health opportunity",
    },
  ]

  const targetSegments = [
    {
      title: "Primary: Epilepsy Patients",
      size: "15M in US, 50M globally",
      characteristics: [
        "Treatment-resistant epilepsy patients",
        "Patients with frequent seizures (>1/month)",
        "Working-age adults seeking independence",
        "Parents of pediatric epilepsy patients",
      ],
      revenueModel: "Direct-to-consumer subscription + insurance reimbursement",
    },
    {
      title: "Secondary: Healthcare Providers",
      size: "4,000+ epilepsy centers in US",
      characteristics: [
        "Neurology clinics and epilepsy centers",
        "Hospital neurology departments",
        "Telehealth platforms",
        "Research institutions",
      ],
      revenueModel: "B2B SaaS licensing for patient monitoring",
    },
    {
      title: "Tertiary: Pharmaceutical Companies",
      size: "$15B epilepsy drug market",
      characteristics: [
        "Clinical trial patient recruitment",
        "Real-world evidence collection",
        "Post-market surveillance",
        "Drug efficacy optimization",
      ],
      revenueModel: "Data licensing and research partnerships",
    },
  ]

  const competitiveAdvantages = [
    {
      title: "First-Mover Advantage",
      description:
        "Only clinically-validated AI-powered seizure prediction system with 96% accuracy and 5-minute warning.",
    },
    {
      title: "Personalized Digital Twins",
      description: "Proprietary technology that learns individual seizure patterns, unlike generic monitoring devices.",
    },
    {
      title: "End-to-End Solution",
      description: "Complete ecosystem from sensors to AI to clinical workflows, not just a data collection tool.",
    },
    {
      title: "Regulatory Momentum",
      description: "FDA breakthrough device designation and strong IP portfolio with 3 patents filed.",
    },
  ]

  const goToMarket = [
    {
      phase: "Phase 1 (2024-2025)",
      title: "Clinical Validation & Pilot",
      milestones: [
        "Complete FDA clinical trials (1,000 patients)",
        "Launch pilot program in 5 US epilepsy centers",
        "Establish insurance reimbursement codes",
        "Build initial patient base of 500 users",
      ],
    },
    {
      phase: "Phase 2 (2025-2026)",
      title: "Commercial Launch",
      milestones: [
        "FDA clearance and full market launch",
        "Expand to 50+ healthcare institutions",
        "Direct-to-consumer marketing campaign",
        "Reach 10,000 active users",
      ],
    },
    {
      phase: "Phase 3 (2026-2027)",
      title: "Scale & International",
      milestones: [
        "CE Mark approval for European Union",
        "Launch in UK, Germany, and France",
        "Partnerships with major health systems",
        "Target 100,000+ active users",
      ],
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Market Opportunity</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            A <span className="text-primary">$4.5B</span> Market Opportunity
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            The convergence of AI, digital health, and epilepsy care creates an unprecedented opportunity to transform
            seizure management and capture significant market share.
          </p>
        </div>

        {/* Market Statistics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {marketStats.map((stat, index) => (
            <Card
              key={index}
              className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors text-center"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm font-semibold text-foreground mb-2">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.growth}</div>
            </Card>
          ))}
        </div>

        {/* Target Segments */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-foreground mb-8">Target Market Segments</h3>
          <div className="space-y-6">
            {targetSegments.map((segment, index) => (
              <Card key={index} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">{segment.title}</h4>
                      <p className="text-sm text-primary">{segment.size}</p>
                    </div>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {segment.characteristics.map((char, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                          {char}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">Revenue Model:</span>{" "}
                        <span className="text-muted-foreground">{segment.revenueModel}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Competitive Advantages */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-foreground mb-8">Competitive Advantages</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {competitiveAdvantages.map((advantage, index) => (
              <Card key={index} className="p-6 bg-gradient-to-br from-primary/5 to-card border-primary/20">
                <h4 className="text-lg font-semibold text-foreground mb-2">{advantage.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{advantage.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Go-to-Market Strategy */}
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-8">Go-to-Market Strategy</h3>
          <div className="space-y-6">
            {goToMarket.map((phase, index) => (
              <Card key={index} className="p-6 bg-card border-border">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-xs text-primary font-semibold mb-1">{phase.phase}</div>
                      <h4 className="text-lg font-semibold text-foreground">{phase.title}</h4>
                    </div>
                    <ul className="space-y-2">
                      {phase.milestones.map((milestone, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                          {milestone}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Investment Opportunity */}
        <div className="mt-16 p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-foreground">Investment Opportunity</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Seeking Series A funding to complete FDA trials, scale commercial operations, and capture market leadership
            in the rapidly growing digital epilepsy care market. Strong unit economics with projected break-even in 18
            months post-launch.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-foreground font-semibold mb-1">Funding Target</p>
              <p className="text-2xl font-bold text-primary">$15M</p>
            </div>
            <div>
              <p className="text-foreground font-semibold mb-1">Use of Funds</p>
              <p className="text-muted-foreground">Clinical trials, team expansion, market launch</p>
            </div>
            <div>
              <p className="text-foreground font-semibold mb-1">Projected Valuation</p>
              <p className="text-2xl font-bold text-primary">$75M</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
