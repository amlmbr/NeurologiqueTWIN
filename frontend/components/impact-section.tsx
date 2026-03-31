import { Heart, Shield, Globe, Wallet, Users, Lock, CheckCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

export function ImpactSection() {
  const impactAreas = [
    {
      icon: Heart,
      title: "Patient Impact",
      description:
        "Transforming daily life for epilepsy patients by providing predictability, reducing anxiety, and enabling greater independence in work, travel, and relationships.",
      benefits: [
        "87% reduction in seizure-related anxiety",
        "Ability to resume driving in eligible patients",
        "72% increase in employment retention",
        "Improved family relationships and social life",
      ],
    },
    {
      icon: Users,
      title: "Healthcare Provider Impact",
      description:
        "Empowering clinicians with actionable data to optimize treatment plans, improve patient monitoring, and deliver more personalized care.",
      benefits: [
        "Real-time patient monitoring dashboard",
        "Data-driven medication adjustments",
        "Reduced emergency interventions",
        "Evidence-based treatment optimization",
      ],
    },
    {
      icon: Wallet,
      title: "Economic Impact",
      description:
        "Reducing healthcare costs through prevention of emergency visits, hospitalizations, and seizure-related complications.",
      benefits: [
        "$12,000 annual savings per patient",
        "75% reduction in ER visits",
        "Lower insurance premiums for patients",
        "Increased workforce productivity",
      ],
    },
    {
      icon: Globe,
      title: "Societal Impact",
      description:
        "Advancing epilepsy awareness, reducing stigma, and contributing to global health equity through accessible predictive technology.",
      benefits: [
        "Reduced discrimination in employment",
        "Increased public understanding",
        "Scalable to low-resource settings",
        "Open research contributions",
      ],
    },
  ]

  const securityMeasures = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All patient data encrypted in transit and at rest using AES-256 encryption standards.",
    },
    {
      icon: Shield,
      title: "HIPAA & GDPR Compliance",
      description: "Full compliance with international healthcare data protection regulations.",
    },
    {
      icon: CheckCircle,
      title: "Regular Security Audits",
      description: "Third-party penetration testing and annual security assessments.",
    },
    {
      icon: Users,
      title: "Role-Based Access Control",
      description: "Granular permissions ensuring only authorized personnel access patient data.",
    },
  ]

  const certifications = [
    { name: "HIPAA Compliant", status: "Certified" },
    { name: "GDPR Compliant", status: "Certified" },
    { name: "ISO 27001", status: "In Progress" },
    { name: "FDA Class II", status: "Pending" },
  ]

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Real-World Impact</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Transforming Lives, <span className="text-primary">Securing Data</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            NeurologiqueTWIN delivers measurable impact across patients, providers, and society—all while maintaining
            the highest standards of data security and privacy.
          </p>
        </div>

        {/* Impact Areas */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {impactAreas.map((area, index) => (
            <Card
              key={index}
              className="p-8 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <area.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{area.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{area.description}</p>
                <ul className="space-y-2 pt-2">
                  {area.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>

        {/* Security & Privacy Section */}
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-foreground mb-4">Security & Privacy First</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Patient data security is non-negotiable. We implement military-grade security measures and exceed
              international compliance standards.
            </p>
          </div>

          {/* Security Measures */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityMeasures.map((measure, index) => (
              <Card key={index} className="p-6 bg-card border-border text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <measure.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-2">{measure.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{measure.description}</p>
              </Card>
            ))}
          </div>

          {/* Certifications */}
          <Card className="p-8 bg-card border-border">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Compliance & Certifications</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {certifications.map((cert, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">{cert.name}</div>
                  <div
                    className={`inline-flex px-3 py-1 rounded-full text-xs ${
                      cert.status === "Certified"
                        ? "bg-primary/10 text-primary"
                        : cert.status === "In Progress"
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cert.status}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Patient Privacy Commitment */}
        <div className="mt-16 p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
          <h3 className="text-xl font-bold text-foreground mb-4">Our Privacy Commitment</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-2">Data Minimization</p>
              <p>We only collect data essential for seizure prediction. No unnecessary personal information.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Patient Control</p>
              <p>Patients can access, export, or delete their data at any time. Full transparency guaranteed.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">No Third-Party Sharing</p>
              <p>Patient data is never sold or shared with third parties without explicit consent.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
