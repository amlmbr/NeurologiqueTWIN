"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { ProblemSection } from "@/components/problem-section"
import { InnovationSection } from "@/components/innovation-section"
import { KPIsSection } from "@/components/kpis-section"
import { ImpactSection } from "@/components/impact-section"
import { MarketSection } from "@/components/market-section"
import { FAQSection } from "@/components/faq-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("hero")

  const renderContent = () => {
    switch (activeTab) {
      case "hero":       return <HeroSection />
      case "problem":    return <ProblemSection />
      case "innovation": return <InnovationSection />
      case "kpis":       return <KPIsSection />
      case "impact":     return <ImpactSection />
      case "market":     return <MarketSection />
      case "faq":        return <FAQSection />
      default:           return <HeroSection />
    }
  }

  return (
    <main className="min-h-screen">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="pt-16">
        {renderContent()}
        <Footer />
      </div>
    </main>
  )
}
