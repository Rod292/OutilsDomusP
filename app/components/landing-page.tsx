"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { auth, signInWithGoogle } from "@/app/lib/firebase"
import type { User } from "firebase/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type React from "react"

interface Consultant {
  name: string
  avatarUrl?: string
}

const consultants: Consultant[] = [
  { name: "Anne" },
  { name: "Elowan" },
  {
    name: "Erwan",
    avatarUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_4576%202.JPG-W3byCW4DiRsqfXvS4bWsO4yqJIZiK2.jpeg",
  },
  { name: "Julie" },
  { name: "Justine" },
  { name: "Morgane" },
  { name: "Nathalie" },
  { name: "Pierre" },
  { name: "Pierre-Marie" },
  { name: "Sonia" },
]

export const LandingPage: React.FC = () => {
  const router = useRouter()
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAvatar, setShowAvatar] = useState(false)

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setIsLoading(false)
      
      // Ne pas rediriger automatiquement - laisser l'utilisateur choisir son consultant
    })

    return () => unsubscribe()
  }, [router])

  const handleConsultantSelect = (consultant: string) => {
    setSelectedConsultant(consultant)
    setShowAvatar(true)
  }

  const handleContinue = () => {
    if (selectedConsultant) {
      // Après sélection du consultant, rediriger vers la page de sélection d'outil
      router.push(`/selection-outil?consultant=${selectedConsultant.toLowerCase().replace(" ", "-")}`)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    try {
      const result = await signInWithGoogle()
      if (result) {
        // Ne pas rediriger - laisser sur la page de sélection de consultant
      }
    } catch (error) {
      console.error("Error signing in with Google:", error)
      if (error instanceof Error) {
        setError(`Erreur de connexion: ${error.message}`)
      } else {
        setError("Une erreur inconnue s'est produite lors de la connexion")
      }
    }
  }

  const handleSignOut = async () => {
    if (!auth) {
      setError("Service d'authentification non disponible");
      return;
    }
    
    try {
      await auth.signOut()
    } catch (error) {
      console.error("Error signing out", error)
      if (error instanceof Error) {
        setError(`Erreur de déconnexion: ${error.message}`)
      }
    }
  }

  const selectedConsultantData = consultants.find((c) => c.name === selectedConsultant)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-2zK5QMuADUDloHaTHRigGM1AMVs4hq.png"
            alt="Arthur Loyd"
            width={160}
            height={160}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-[#2D2D2D] mb-2">État des Lieux</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="w-full border-gray-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-[#2D2D2D]">
              {user ? "Choisissez votre profil" : "Connexion"}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {user
                ? "Cliquez sur votre nom pour accéder à votre espace personnel"
                : "Connectez-vous pour accéder à vos états des lieux"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <>
                <div className="relative">
                  {selectedConsultantData?.avatarUrl && showAvatar && (
                    <div className="absolute left-1/2 -translate-x-1/2 -top-24 transform transition-all duration-500 ease-in-out opacity-100 scale-100">
                      <Image
                        src={selectedConsultantData.avatarUrl || "/placeholder.svg"}
                        alt={`Avatar de ${selectedConsultantData.name}`}
                        width={120}
                        height={120}
                        className="rounded-full shadow-lg border-4 border-white"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    {consultants.map((consultant) => (
                      <Button
                        key={consultant.name}
                        variant={selectedConsultant === consultant.name ? "default" : "outline"}
                        onClick={() => handleConsultantSelect(consultant.name)}
                        className={`h-16 text-sm ${
                          selectedConsultant === consultant.name ? "bg-[#DC0032] text-white" : "bg-white text-gray-800"
                        } hover:bg-[#DC0032] hover:text-white transition-all duration-300 transform ${
                          selectedConsultant === consultant.name ? "scale-95" : "scale-100"
                        }`}
                      >
                        {consultant.name}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedConsultant}
                    className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white py-3 text-lg font-semibold transition-colors mb-4"
                  >
                    Continuer
                  </Button>
                  <Button onClick={handleSignOut} variant="outline" className="w-full">
                    Se déconnecter
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full h-12 px-6 transition-colors duration-150 border border-gray-200 text-gray-900 bg-white hover:bg-gray-50"
                >
                  <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Se connecter avec Google
                </Button>
                <Button
                  onClick={() => router.push("/email-signin")}
                  className="w-full h-12 bg-[#DC0032] hover:bg-[#DC0032]/90 text-white"
                >
                  Se connecter par email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LandingPage

