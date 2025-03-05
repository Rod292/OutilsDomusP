"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const consultants = [
  "Anne",
  "Elowan",
  "Erwan",
  "Julie",
  "Justine",
  "Morgane",
  "Nathalie",
  "Pierre",
  "Pierre-Marie",
  "Sonia",
]

export function LandingPage() {
  const router = useRouter()
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null)

  const handleConsultantSelect = (consultant: string) => {
    setSelectedConsultant(consultant)
  }

  const handleContinue = () => {
    if (selectedConsultant) {
      const encodedName = encodeURIComponent(selectedConsultant.toLowerCase())
      router.push(`/consultant/${encodedName}/new-report`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Capture%20d%E2%80%99e%CC%81cran%202025-02-13%20a%CC%80%2016.16.55-xk5xXEckPhEaDJHYcO6QQJJZwRm6Dc.png"
            alt="Arthur Lloyd"
            width={240}
            height={64}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">État des Lieux</h1>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-800">Choisissez votre profil</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Cliquez sur votre nom pour accéder à votre espace personnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
              {consultants.map((consultant) => (
                <Button
                  key={consultant}
                  variant={selectedConsultant === consultant ? "default" : "outline"}
                  onClick={() => handleConsultantSelect(consultant)}
                  className={`h-16 text-sm sm:text-base ${
                    selectedConsultant === consultant ? "bg-brand text-white" : "bg-white text-gray-800"
                  } hover:bg-brand/90 hover:text-white transition-colors`}
                >
                  {consultant}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleContinue}
              disabled={!selectedConsultant}
              className="w-full bg-brand hover:bg-brand/90 text-white py-3 text-lg font-semibold transition-colors"
            >
              Continuer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

