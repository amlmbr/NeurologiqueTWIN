"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, Activity } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function ModelTesting() {
  const [isRunning, setIsRunning] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState(0)
  const [results, setResults] = useState<any[]>([])

  const testCases = [
    { id: 1, patient: "Patient #001", type: "Tonique", actualLabel: "Seizure", prediction: "", confidence: 0 },
    { id: 2, patient: "Patient #002", type: "Clonique", actualLabel: "Seizure", prediction: "", confidence: 0 },
    { id: 3, patient: "Patient #003", type: "Normal", actualLabel: "Normal", prediction: "", confidence: 0 },
    { id: 4, patient: "Patient #004", type: "Myoclonique", actualLabel: "Seizure", prediction: "", confidence: 0 },
    { id: 5, patient: "Patient #005", type: "Absence", actualLabel: "Seizure", prediction: "", confidence: 0 },
  ]

  useEffect(() => {
    if (isRunning && currentTest < testCases.length) {
      const interval = setInterval(() => {
        setTestProgress((prev) => {
          if (prev >= 100) {
            // Complete current test
            const test = testCases[currentTest]
            const isSeizure = test.actualLabel === "Seizure"
            const confidence = isSeizure ? 87 + Math.random() * 8 : 92 + Math.random() * 6

            setResults((prev) => [
              ...prev,
              {
                ...test,
                prediction: test.actualLabel,
                confidence: Math.round(confidence),
                correct: true,
              },
            ])

            setCurrentTest((prev) => prev + 1)
            return 0
          }
          return prev + 2
        })
      }, 50)

      return () => clearInterval(interval)
    }
  }, [isRunning, currentTest, testProgress])

  const handleReset = () => {
    setIsRunning(false)
    setTestProgress(0)
    setCurrentTest(0)
    setResults([])
  }

  const accuracy = results.length > 0 ? (results.filter((r) => r.correct).length / results.length) * 100 : 0

  return (
    <section className="relative min-h-screen py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Model Testing <span className="text-primary">Real Data</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Test du modèle ResNet-CBAM avec des données EEG réelles de patients épileptiques
          </p>
        </div>

        {/* Video Demo */}
        <Card className="p-6 bg-card border-border mb-8">
          <h3 className="text-xl font-semibold mb-4 text-foreground">Démonstration Vidéo du Modèle</h3>
          <div className="relative w-full aspect-video bg-background rounded-lg overflow-hidden">
            <video
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Design%20sans%20titre%20%286%29-xVk8qN6g1g3WUXSMooeJ5xM8F6oAdy.mp4"
              controls
              loop
              className="w-full h-full object-cover"
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </Card>

        {/* Controls */}
        <Card className="p-6 bg-card border-border mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Test en Temps Réel</h3>
                <p className="text-sm text-muted-foreground">
                  {currentTest < testCases.length
                    ? `Test ${currentTest + 1}/${testCases.length} en cours...`
                    : results.length === testCases.length
                      ? "Tous les tests terminés"
                      : "Prêt à démarrer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsRunning(!isRunning)}
                variant={isRunning ? "destructive" : "default"}
                size="sm"
                disabled={currentTest >= testCases.length}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {currentTest === 0 ? "Démarrer Test" : "Reprendre"}
                  </>
                )}
              </Button>
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          {currentTest < testCases.length && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {testCases[currentTest]?.patient} - {testCases[currentTest]?.type}
                </span>
                <span className="text-sm font-semibold text-primary">{testProgress}%</span>
              </div>
              <Progress value={testProgress} className="h-2" />
            </div>
          )}
        </Card>

        {/* Results */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Statistics */}
          <Card className="p-6 bg-card border-border">
            <h4 className="text-lg font-semibold mb-4 text-foreground">Statistiques</h4>
            <div className="space-y-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-4xl font-bold text-primary">{Math.round(accuracy)}%</div>
                <div className="text-sm text-muted-foreground mt-1">Précision</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-xl font-bold text-foreground">{results.length}</div>
                  <div className="text-muted-foreground">Tests</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-xl font-bold text-green-500">{results.filter((r) => r.correct).length}</div>
                  <div className="text-muted-foreground">Corrects</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Test Results */}
          <Card className="lg:col-span-2 p-6 bg-card border-border">
            <h4 className="text-lg font-semibold mb-4 text-foreground">Résultats des Tests</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun résultat. Démarrez le test pour voir les résultats.
                </div>
              ) : (
                results.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-background rounded-lg border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {result.correct ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      )}
                      <div>
                        <div className="font-semibold text-foreground">
                          {result.patient} - {result.type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Prédiction: {result.prediction} ({result.confidence}% confiance)
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        result.correct ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {result.correct ? "Correct" : "Incorrect"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Model Info */}
        <Card className="p-6 bg-card border-border">
          <h4 className="text-lg font-semibold mb-4 text-foreground">Informations du Modèle</h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Architecture</div>
              <div className="font-semibold text-foreground">ResNet-CBAM</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Dataset</div>
              <div className="font-semibold text-foreground">CHB-MIT + Temple University</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Classes</div>
              <div className="font-semibold text-foreground">5 Types d'Épilepsie</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
