"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, LayoutDashboard, Brain, FileText, Network, BarChart3, Activity, BookOpen, FlaskConical } from "lucide-react"

const LANDING_TABS = [
  { id: "hero",       label: "Home" },
  { id: "problem",    label: "Problem" },
  { id: "innovation", label: "Innovation" },
  { id: "kpis",       label: "KPIs" },
  { id: "impact",     label: "Impact" },
  { id: "market",     label: "Market" },
  { id: "faq",        label: "FAQ" },
]

export const APP_LINKS = [
  { href: "/dashboard",   label: "Dashboard",     icon: LayoutDashboard },
  { href: "/brain-twin",  label: "Brain Twin 3D", icon: Brain },
  { href: "/models",      label: "EEG / DL",      icon: Activity },
  { href: "/chbmit",      label: "CHB-MIT",       icon: FlaskConical },
  { href: "/simulation",  label: "Digital Twin",  icon: Network },
  { href: "/xgboost",     label: "XGBoost",       icon: BarChart3 },
  { href: "/nlp",         label: "NLP / RoBERTa", icon: FileText },
  { href: "/epilepsy",    label: "Epilepsy Ref",  icon: BookOpen },
]

interface LandingNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Navigation({ activeTab, onTabChange }: LandingNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary-foreground rounded-full animate-pulse-glow" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Neurologique<span className="text-primary">TWIN</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden xl:flex items-center gap-1">
            {LANDING_TABS.map(tab => (
              <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"} size="sm"
                onClick={() => onTabChange(tab.id)} className="text-sm">
                {tab.label}
              </Button>
            ))}
            <div className="w-px h-5 bg-border mx-2" />
            {APP_LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button variant="outline" size="sm" className="text-sm gap-1.5">
                  <Icon className="w-3.5 h-3.5" />{label}
                </Button>
              </Link>
            ))}
          </div>

          <button className="xl:hidden p-2 text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden bg-card border-t border-border">
          <div className="px-4 py-4 space-y-2">
            {LANDING_TABS.map(tab => (
              <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"} size="sm"
                onClick={() => { onTabChange(tab.id); setOpen(false) }} className="w-full justify-start">
                {tab.label}
              </Button>
            ))}
            <div className="border-t border-border pt-2 mt-2 space-y-2">
              {APP_LINKS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Icon className="w-4 h-4" />{label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export function AppNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-primary-foreground rounded-full" />
            </div>
            <span className="font-bold text-foreground text-lg">
              Neurologique<span className="text-primary">TWIN</span>
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {APP_LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button variant={pathname === href ? "default" : "ghost"} size="sm" className="gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </Button>
              </Link>
            ))}
          </div>
          <button className="sm:hidden p-2 text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="sm:hidden bg-card border-t border-border px-4 py-3 space-y-2">
          {APP_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              <Button variant={pathname === href ? "default" : "ghost"} size="sm" className="w-full justify-start gap-2">
                <Icon className="w-4 h-4" />{label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
