"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, BookOpen, CheckCircle, Lock, PlayCircle, FileText, Award } from "lucide-react"

interface Module {
  id: number
  title: string
  description: string
  duration: string
  lessons: number
  locked: boolean
  completed: boolean
  progress: number
}

export function LearningSection() {
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [completedLessons, setCompletedLessons] = useState<number[]>([])

  const modules: Module[] = [
    {
      id: 1,
      title: "Understanding Epilepsy",
      description: "Learn the fundamentals of epilepsy, seizure types, and current treatment approaches.",
      duration: "45 min",
      lessons: 5,
      locked: false,
      completed: false,
      progress: 0,
    },
    {
      id: 2,
      title: "Introduction to Digital Twins",
      description: "Discover how digital twin technology creates personalized neurological models.",
      duration: "30 min",
      lessons: 4,
      locked: false,
      completed: false,
      progress: 0,
    },
    {
      id: 3,
      title: "AI & Machine Learning Basics",
      description: "Understand the AI models that power seizure prediction and pattern recognition.",
      duration: "60 min",
      lessons: 6,
      locked: false,
      completed: false,
      progress: 0,
    },
    {
      id: 4,
      title: "Using NeurologiqueTWIN",
      description: "Step-by-step guide to setting up and using the seizure prediction system.",
      duration: "40 min",
      lessons: 5,
      locked: false,
      completed: false,
      progress: 0,
    },
    {
      id: 5,
      title: "Data Security & Privacy",
      description: "Learn how we protect patient data and ensure HIPAA compliance.",
      duration: "25 min",
      lessons: 3,
      locked: false,
      completed: false,
      progress: 0,
    },
    {
      id: 6,
      title: "Advanced Topics",
      description: "Deep dive into BPMN workflows, edge computing, and clinical research.",
      duration: "90 min",
      lessons: 8,
      locked: true,
      completed: false,
      progress: 0,
    },
  ]

  const lessons = {
    1: [
      { id: 1, title: "What is Epilepsy?", type: "video", duration: "8 min" },
      { id: 2, title: "Types of Seizures", type: "reading", duration: "10 min" },
      { id: 3, title: "Current Treatment Methods", type: "video", duration: "12 min" },
      { id: 4, title: "Challenges in Epilepsy Care", type: "reading", duration: "8 min" },
      { id: 5, title: "Knowledge Check", type: "quiz", duration: "7 min" },
    ],
    2: [
      { id: 6, title: "What are Digital Twins?", type: "video", duration: "10 min" },
      { id: 7, title: "Neurological Modeling", type: "reading", duration: "8 min" },
      { id: 8, title: "Real-time Data Integration", type: "interactive", duration: "10 min" },
      { id: 9, title: "Module Assessment", type: "quiz", duration: "5 min" },
    ],
    3: [
      { id: 10, title: "Introduction to AI", type: "video", duration: "12 min" },
      { id: 11, title: "Neural Networks Explained", type: "reading", duration: "15 min" },
      { id: 12, title: "Pattern Recognition", type: "video", duration: "10 min" },
      { id: 13, title: "Training AI Models", type: "interactive", duration: "12 min" },
      { id: 14, title: "Model Accuracy & Validation", type: "reading", duration: "8 min" },
      { id: 15, title: "Final Quiz", type: "quiz", duration: "8 min" },
    ],
    4: [
      { id: 16, title: "Device Setup", type: "video", duration: "10 min" },
      { id: 17, title: "Mobile App Tutorial", type: "interactive", duration: "12 min" },
      { id: 18, title: "Understanding Alerts", type: "reading", duration: "8 min" },
      { id: 19, title: "Response Protocols", type: "video", duration: "8 min" },
      { id: 20, title: "Hands-on Practice", type: "quiz", duration: "5 min" },
    ],
    5: [
      { id: 21, title: "HIPAA Compliance Overview", type: "reading", duration: "10 min" },
      { id: 22, title: "Data Encryption & Security", type: "video", duration: "8 min" },
      { id: 23, title: "Privacy Assessment", type: "quiz", duration: "7 min" },
    ],
    6: [
      { id: 24, title: "BPMN Workflow Design", type: "video", duration: "15 min" },
      { id: 25, title: "Edge Computing Architecture", type: "reading", duration: "20 min" },
      { id: 26, title: "Clinical Trial Design", type: "reading", duration: "18 min" },
      { id: 27, title: "Regulatory Compliance", type: "video", duration: "12 min" },
      { id: 28, title: "Research Methodologies", type: "reading", duration: "15 min" },
      { id: 29, title: "Future Innovations", type: "video", duration: "10 min" },
      { id: 30, title: "Case Studies", type: "interactive", duration: "12 min" },
      { id: 31, title: "Comprehensive Exam", type: "quiz", duration: "15 min" },
    ],
  }

  const currentModule = modules.find((m) => m.id === selectedModule)
  const currentLessons = selectedModule ? lessons[selectedModule as keyof typeof lessons] || [] : []

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <PlayCircle className="w-4 h-4 text-primary" />
      case "reading":
        return <FileText className="w-4 h-4 text-primary" />
      case "interactive":
        return <BookOpen className="w-4 h-4 text-primary" />
      case "quiz":
        return <Award className="w-4 h-4 text-primary" />
      default:
        return <BookOpen className="w-4 h-4 text-primary" />
    }
  }

  const totalModules = modules.length
  const completedModules = modules.filter((m) => m.completed).length
  const overallProgress = (completedModules / totalModules) * 100

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Interactive Learning</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Master <span className="text-primary">Seizure Prediction</span> Technology
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Comprehensive courses designed for patients, caregivers, and healthcare professionals to understand and
            effectively use NeurologiqueTWIN.
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="p-6 bg-card border-border mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Your Learning Journey</h3>
                <p className="text-sm text-muted-foreground">
                  {completedModules} of {totalModules} modules completed
                </p>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold text-foreground">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
          </div>
        </Card>

        {/* Module Selection */}
        {!selectedModule ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Card
                key={module.id}
                className={`p-6 border-2 transition-all ${
                  module.locked
                    ? "border-border bg-muted/30 opacity-75"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                }`}
                onClick={() => !module.locked && setSelectedModule(module.id)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        module.completed ? "bg-primary/20" : module.locked ? "bg-muted" : "bg-primary/10"
                      }`}
                    >
                      {module.locked ? (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      ) : module.completed ? (
                        <CheckCircle className="w-6 h-6 text-primary" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    {module.completed && (
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Completed</span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{module.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{module.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{module.lessons} lessons</span>
                    <span className="text-primary font-semibold">{module.duration}</span>
                  </div>

                  {module.progress > 0 && !module.completed && (
                    <div>
                      <Progress value={module.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{module.progress}% complete</p>
                    </div>
                  )}

                  {module.locked && (
                    <p className="text-xs text-muted-foreground italic">Complete previous modules to unlock</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Lesson View */
          <div className="space-y-6">
            <Button variant="outline" onClick={() => setSelectedModule(null)} className="mb-4">
              ← Back to Modules
            </Button>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{currentModule?.title}</h3>
                  <p className="text-muted-foreground mb-4">{currentModule?.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{currentModule?.lessons} lessons</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-primary font-semibold">{currentModule?.duration}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {currentLessons.map((lesson, index) => {
                  const isCompleted = completedLessons.includes(lesson.id)

                  return (
                    <Card
                      key={lesson.id}
                      className={`p-4 border transition-all cursor-pointer ${
                        isCompleted ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30"
                      }`}
                      onClick={() => {
                        if (!isCompleted) {
                          setCompletedLessons([...completedLessons, lesson.id])
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeIcon(lesson.type)}
                            <h4 className="font-semibold text-foreground">{lesson.title}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground capitalize">{lesson.type}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-primary">{lesson.duration}</span>
                          </div>
                        </div>
                        {isCompleted && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                      </div>
                    </Card>
                  )
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Module Progress</p>
                    <p className="text-lg font-semibold text-foreground">
                      {completedLessons.filter((id) => currentLessons.find((l) => l.id === id)).length} /{" "}
                      {currentLessons.length} lessons
                    </p>
                  </div>
                  <Button
                    size="lg"
                    disabled={
                      completedLessons.filter((id) => currentLessons.find((l) => l.id === id)).length <
                      currentLessons.length
                    }
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Complete Module
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Learning Paths */}
        {!selectedModule && (
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card border-border">
              <h4 className="font-semibold text-foreground mb-3">For Patients</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Essential modules to understand epilepsy and use the monitoring system effectively.
              </p>
              <p className="text-xs text-primary">Recommended: Modules 1, 2, 4</p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h4 className="font-semibold text-foreground mb-3">For Caregivers</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Learn how to support patients and respond to seizure alerts appropriately.
              </p>
              <p className="text-xs text-primary">Recommended: Modules 1, 4, 5</p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h4 className="font-semibold text-foreground mb-3">For Healthcare Professionals</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Comprehensive training on the technology, clinical integration, and research applications.
              </p>
              <p className="text-xs text-primary">Recommended: All Modules</p>
            </Card>
          </div>
        )}
      </div>
    </section>
  )
}
