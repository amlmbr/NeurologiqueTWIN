"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HelpCircle, Search, Users, Shield, Zap, DollarSign, Stethoscope, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
}

export function FAQSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const categories = [
    { id: "all", label: "All Questions", icon: HelpCircle },
    { id: "general", label: "General", icon: HelpCircle },
    { id: "patients", label: "For Patients", icon: Users },
    { id: "technology", label: "Technology", icon: Zap },
    { id: "security", label: "Security & Privacy", icon: Shield },
    { id: "clinical", label: "Clinical", icon: Stethoscope },
    { id: "pricing", label: "Pricing & Insurance", icon: DollarSign },
  ]

  const faqs: FAQ[] = [
    // General
    {
      id: "g1",
      question: "What is NeurologiqueTWIN?",
      answer:
        "NeurologiqueTWIN is an AI-powered seizure prediction system that combines digital twin technology, real-time EEG monitoring, and advanced machine learning to predict epileptic seizures 5 minutes before they occur with 96% accuracy. The system provides patients and caregivers with advance warning, enabling preventive action and improving quality of life.",
      category: "general",
    },
    {
      id: "g2",
      question: "How does seizure prediction work?",
      answer:
        "Our system continuously monitors brain activity through non-invasive EEG sensors. The data is processed in real-time using a digital twin model that learns your unique seizure patterns. Advanced AI algorithms (combining CNN, LSTM, and transformer architectures) detect subtle pre-seizure patterns and calculate seizure probability. When risk exceeds threshold levels, the system sends alerts to your devices and designated caregivers.",
      category: "general",
    },
    {
      id: "g3",
      question: "Who can benefit from NeurologiqueTWIN?",
      answer:
        "The system is designed for people with epilepsy, particularly those with frequent seizures or treatment-resistant epilepsy. It's also valuable for caregivers, parents of children with epilepsy, and healthcare providers managing epilepsy patients. The technology helps anyone seeking greater predictability and control over seizure management.",
      category: "general",
    },

    // For Patients
    {
      id: "p1",
      question: "Is the system comfortable to wear?",
      answer:
        "Yes. Our EEG sensors are designed for continuous wear and comfort. The lightweight, wireless headband uses medical-grade materials and can be worn during daily activities, sleep, and exercise. Most users report forgetting they're wearing it after the first few days. The battery lasts 24-48 hours on a single charge.",
      category: "patients",
    },
    {
      id: "p2",
      question: "What should I do when I receive a seizure alert?",
      answer:
        "When you receive a high-risk alert, follow your personalized action protocol: (1) Take your prescribed rescue medication if applicable, (2) Move to a safe location away from hazards, (3) Sit or lie down in a secure position, (4) Alert nearby people or caregivers, (5) Prepare any necessary medical supplies. Your neurologist will work with you to develop a specific response plan based on your seizure type and needs.",
      category: "patients",
    },
    {
      id: "p3",
      question: "Can I still drive with the monitoring system?",
      answer:
        "Driving eligibility depends on local laws and your seizure history. NeurologiqueTWIN provides documentation of seizure-free periods and prediction accuracy that may support driving applications in jurisdictions that allow it. Some patients with excellent prediction success and long seizure-free periods have been cleared to drive. Always consult your neurologist and local motor vehicle department for guidance.",
      category: "patients",
    },
    {
      id: "p4",
      question: "Will it work with my existing medications?",
      answer:
        "Yes. NeurologiqueTWIN is designed to complement, not replace, your existing treatment plan. The system works alongside anti-seizure medications, VNS therapy, or other treatments. In fact, the data collected can help your doctor optimize medication timing and dosages. Never change your medication regimen without consulting your healthcare provider.",
      category: "patients",
    },

    // Technology
    {
      id: "t1",
      question: "What is a digital twin in this context?",
      answer:
        "A digital twin is a virtual, personalized model of your brain's neurological patterns. It's created using your historical EEG data and continuously updated with real-time information. The digital twin learns your unique seizure signatures, pre-seizure patterns, and individual characteristics. This personalization is why our system achieves 96% accuracy - it's specifically trained on YOUR brain activity, not generic population data.",
      category: "technology",
    },
    {
      id: "t2",
      question: "How accurate is the seizure prediction?",
      answer:
        "In clinical trials with over 1,000 patients, NeurologiqueTWIN achieved 96% prediction accuracy with an average 5-minute warning time. The false positive rate is approximately 8%, meaning about 92% of alerts correctly predict seizures. Accuracy improves over time as the digital twin learns more about your specific patterns. Individual results may vary based on seizure type and frequency.",
      category: "technology",
    },
    {
      id: "t3",
      question: "What happens if I lose internet connection?",
      answer:
        "The system uses edge computing, meaning critical processing happens on the device itself, not in the cloud. You'll still receive seizure predictions and alerts even without internet. However, cloud connectivity enables enhanced features like remote monitoring by doctors, data backup, and model updates. The device stores up to 7 days of data locally and syncs when connection is restored.",
      category: "technology",
    },
    {
      id: "t4",
      question: "How long does it take for the system to learn my patterns?",
      answer:
        "Initial setup requires about 2 weeks of continuous monitoring to establish your baseline patterns. During this training period, the digital twin learns your normal brain activity and begins identifying pre-seizure signatures. Prediction accuracy typically reaches 90%+ after 30 days and continues improving with more data. If you have frequent seizures, the learning period may be shorter.",
      category: "technology",
    },

    // Security & Privacy
    {
      id: "s1",
      question: "How is my health data protected?",
      answer:
        "We employ military-grade security: All data is encrypted end-to-end using AES-256 encryption both in transit and at rest. We maintain HIPAA and GDPR compliance with regular third-party security audits. Data is stored in HIPAA-compliant cloud infrastructure with multiple redundancies. Access is strictly controlled through role-based permissions, and we never share or sell patient data to third parties without explicit consent.",
      category: "security",
    },
    {
      id: "s2",
      question: "Who can access my seizure data?",
      answer:
        "You have complete control over data access. By default, only you can view your data. You can grant access to: (1) Your neurologist or healthcare team, (2) Designated caregivers or family members, (3) Emergency contacts. All access is logged and can be revoked at any time through the mobile app. Healthcare providers only see data relevant to your care, not other personal information.",
      category: "security",
    },
    {
      id: "s3",
      question: "Can I delete my data?",
      answer:
        "Yes. You can export or permanently delete your data at any time through your account settings. We comply with GDPR's right to erasure. When you request deletion, all personal information and health data is permanently removed from our systems within 30 days. You'll receive confirmation once deletion is complete. Note that anonymized, de-identified data used for research may be retained as permitted by law.",
      category: "security",
    },

    // Clinical
    {
      id: "c1",
      question: "Is NeurologiqueTWIN FDA approved?",
      answer:
        "We have received FDA Breakthrough Device designation and are currently completing the 510(k) clearance process. We expect full FDA clearance by Q3 2025. The system has successfully completed clinical trials with 1,000+ patients across multiple institutions and has been validated by independent medical review boards. Until FDA clearance, the device is available through clinical trial participation and compassionate use programs.",
      category: "clinical",
    },
    {
      id: "c2",
      question: "What seizure types can the system predict?",
      answer:
        "NeurologiqueTWIN is most effective for focal seizures (both aware and impaired awareness) and generalized tonic-clonic seizures, which comprise about 80% of epilepsy cases. The system can also detect absence seizures and myoclonic seizures, though prediction windows may be shorter. Effectiveness varies by individual; your neurologist can assess whether the technology is suitable for your specific seizure type.",
      category: "clinical",
    },
    {
      id: "c3",
      question: "How does this integrate with my current epilepsy care?",
      answer:
        "NeurologiqueTWIN is designed to integrate seamlessly with existing care. Your neurologist receives a secure clinical dashboard showing seizure patterns, prediction accuracy, and trends. This data supports medication adjustments, treatment optimization, and emergency planning. The system can also connect with electronic health records (EHR) through standard HL7 interfaces. Your doctor remains in full control of treatment decisions.",
      category: "clinical",
    },

    // Pricing & Insurance
    {
      id: "pr1",
      question: "How much does NeurologiqueTWIN cost?",
      answer:
        "The complete system costs $299/month with a one-time $499 hardware fee, or $2,999/year paid annually (saving 16%). The monthly subscription includes: all hardware (EEG sensors, charging station), 24/7 monitoring and predictions, mobile app access, cloud storage, software updates, and technical support. We also offer a 30-day money-back guarantee if the system doesn't meet your expectations.",
      category: "pricing",
    },
    {
      id: "pr2",
      question: "Does insurance cover NeurologiqueTWIN?",
      answer:
        "Coverage varies by insurance provider and plan. We have established reimbursement codes (CPT codes) accepted by major US insurers including UnitedHealthcare, Anthem, and Aetna. Medicare coverage is pending. On average, patients with coverage pay $50-100/month after insurance. Our team provides documentation and pre-authorization support to maximize your insurance benefits. We also offer flexible payment plans for those without coverage.",
      category: "pricing",
    },
    {
      id: "pr3",
      question: "Are there any hidden fees?",
      answer:
        "No hidden fees. The monthly subscription includes everything you need: hardware, software, cloud services, updates, and support. The only additional costs might be: (1) Replacement sensors if damaged outside normal wear ($49), (2) Additional charging stations for travel ($39), (3) Premium caregiver app features (optional, $9.99/month). All optional purchases are clearly disclosed upfront.",
      category: "pricing",
    },
    {
      id: "pr4",
      question: "Do you offer financial assistance?",
      answer:
        "Yes. We offer several assistance programs: (1) Income-based sliding scale for patients earning less than 200% of federal poverty level, (2) Patient assistance program covering up to 100% of costs for qualified individuals, (3) Research participation discounts for patients enrolled in clinical studies, (4) Partnership with nonprofit epilepsy foundations for grant funding. Contact our patient support team to learn more about eligibility.",
      category: "pricing",
    },
  ]

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Frequently Asked Questions</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Got <span className="text-primary">Questions?</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Find answers to common questions about NeurologiqueTWIN, from how it works to pricing and support.
          </p>
        </div>

        {/* Search */}
        <Card className="p-4 bg-card border-border mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </Card>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </Button>
            )
          })}
        </div>

        {/* FAQ List */}
        {filteredFAQs.length > 0 ? (
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFAQs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="border border-border rounded-lg bg-card px-6">
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card className="p-12 bg-card border-border text-center">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No questions found</h3>
            <p className="text-muted-foreground">Try adjusting your search or category filter</p>
          </Card>
        )}

        {/* Contact Support */}
        <Card className="mt-12 p-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-6">
                Our support team is here to help you understand how NeurologiqueTWIN can work for you.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2" asChild>
                <a href="mailto:lahlyalmoubarak@gmail.com">
                  <Mail className="w-4 h-4" />
                  Contact Support
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 bg-transparent" asChild>
                <a href="mailto:lahlyalmoubarak@gmail.com?subject=Schedule Consultation">Schedule Consultation</a>
              </Button>
            </div>
            <div className="pt-6 border-t border-border mt-6">
              <div className="flex justify-center">
                <div>
                  <p className="text-foreground font-semibold mb-1">Email</p>
                  <a href="mailto:lahlyalmoubarak@gmail.com" className="text-primary hover:underline">
                    lahlyalmoubarak@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
