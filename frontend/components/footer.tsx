"use client"
import { Button } from "@/components/ui/button"
import { Linkedin, Mail, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background/50 backdrop-blur-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground">NeurologiqueTWIN</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered digital twin platform for epilepsy prediction and prevention
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Quick Links</h4>
            <div className="space-y-2">
              <a href="#learning" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                E-Learning Platform
              </a>
              <a href="#demo" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Live Demo
              </a>
              <a href="#faq" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                FAQ
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Connect</h4>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start bg-transparent"
                onClick={() => window.open("https://www.linkedin.com/in/ahmed-moubarak-lahlyal-015839257/", "_blank")}
              >
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start bg-transparent"
                onClick={() => (window.location.href = "mailto:lahlyalmoubarak@gmail.com")}
              >
                <Mail className="w-4 h-4 mr-2" />
                lahlyalmoubarak@gmail.com
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2025 NeurologiqueTWIN. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <span>•</span>
            <a href="#" className="hover:text-primary transition-colors">
              GDPR Compliance
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
