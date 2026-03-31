import { Button } from "@/components/ui/button"
import { Activity, Brain, Shield, Zap } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Seizure Prediction</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-balance">
              Predicting <span className="text-primary">Epileptic Seizures</span> Before They Happen
            </h1>

            <p className="text-xl text-muted-foreground text-pretty leading-relaxed">
              NeurologiqueTWIN combines cutting-edge AI, digital twin technology, and real-time EEG monitoring to
              predict epileptic seizures with unprecedented accuracy, giving patients and caregivers precious time to
              act.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="gap-2">
                <Brain className="w-5 h-5" />
                Explore Technology
              </Button>
              <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                <Activity className="w-5 h-5" />
                View Live Demo
              </Button>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <div>
                <div className="text-3xl font-bold text-primary">90%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">5min</div>
                <div className="text-sm text-muted-foreground">Advance Warning</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Monitoring</div>
              </div>
            </div>
          </div>

          {/* Right Content - Medical Visualization */}
          <div className="relative">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-primary/20 bg-card shadow-2xl">
              <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                <source
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Design%20sans%20titre%20%287%29-p5NrLjJj7fs8zH8bo84imdAnrbfCSs.mp4"
                  type="video/mp4"
                />
              </video>
              {/* Scan Line Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-scan pointer-events-none" />
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-4 -right-4 bg-card border border-border rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Security</div>
                  <div className="text-sm font-semibold">HIPAA Compliant</div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="text-sm font-semibold text-primary">Monitoring Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
