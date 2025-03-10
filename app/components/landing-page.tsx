"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { auth } from "@/app/lib/firebase"
import firebaseUtils, { signInWithGoogle } from "@/app/lib/firebase"
import type { User } from "firebase/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, LogIn, LogOut, User as UserIcon } from "lucide-react"
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
  const [transitionOpacity, setTransitionOpacity] = useState('opacity-0')

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

    // Animation d'entrée
    const timer = setTimeout(() => {
      setTransitionOpacity('opacity-100');
    }, 100);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    }
  }, [router])

  const handleConsultantSelect = (consultant: string) => {
    setSelectedConsultant(consultant)
    setShowAvatar(true)
  }

  const handleContinue = () => {
    if (selectedConsultant) {
      setTransitionOpacity('opacity-0');
      setTimeout(() => {
        // Après sélection du consultant, rediriger vers la page de sélection d'outil
        router.push(`/selection-outil?consultant=${selectedConsultant.toLowerCase().replace(" ", "-")}`)
      }, 300);
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    try {
      console.log("Tentative de connexion avec Google...", { 
        signInWithGoogleExists: typeof signInWithGoogle === "function",
        firebaseUtils: firebaseUtils
      });
      
      // Essayer d'abord la fonction exportée directement
      let result;
      try {
        result = await signInWithGoogle();
      } catch (e) {
        console.log("Erreur avec signInWithGoogle direct, essai avec firebaseUtils", e);
        // Si ça échoue, essayer via l'export par défaut
        result = await firebaseUtils.signInWithGoogle();
      }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-gray-700 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6 transition-opacity duration-500 ${transitionOpacity}`}>
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="relative w-[200px] h-[60px] mx-auto mb-6">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-2zK5QMuADUDloHaTHRigGM1AMVs4hq.png"
              alt="Arthur Loyd"
              fill
              style={{ objectFit: 'contain' }}
              className="drop-shadow-sm"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-3">Bonjour !</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {user ? "Sélectionnez votre profil pour accéder à vos outils" : "Connectez-vous pour accéder à vos états des lieux"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border border-red-200 shadow-sm">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-semibold">Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="w-full border border-gray-200 rounded-xl overflow-hidden shadow-md">
          <CardHeader className="space-y-2 bg-gradient-to-r from-red-50 to-pink-50 border-b border-gray-100 px-6 py-6">
            <CardTitle className="text-2xl font-bold text-center text-[#2D2D2D]">
              {user ? "Choisissez votre profil" : "Connexion"}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {user
                ? "Cliquez sur votre nom pour accéder à votre espace personnel"
                : "Connectez-vous pour accéder à vos états des lieux"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6">
            {user ? (
              <>
                <div className="relative">
                  {selectedConsultantData?.avatarUrl && showAvatar && (
                    <div className="absolute left-1/2 -translate-x-1/2 -top-28 transform transition-all duration-500 ease-in-out opacity-100 scale-100">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        <Image
                          src={selectedConsultantData.avatarUrl || "/placeholder.svg"}
                          alt={`Avatar de ${selectedConsultantData.name}`}
                          width={128}
                          height={128}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                    {consultants.map((consultant) => (
                      <Button
                        key={consultant.name}
                        variant={selectedConsultant === consultant.name ? "default" : "outline"}
                        onClick={() => handleConsultantSelect(consultant.name)}
                        className={`h-16 text-base font-medium ${
                          selectedConsultant === consultant.name 
                            ? "bg-[#DC0032] text-white shadow-md" 
                            : "bg-white text-gray-800 hover:border-[#DC0032]"
                        } hover:bg-[#DC0032] hover:text-white transition-all duration-300 transform ${
                          selectedConsultant === consultant.name ? "scale-[0.98]" : "scale-100"
                        } rounded-lg border ${
                          selectedConsultant === consultant.name ? "border-[#DC0032]" : "border-gray-200"
                        }`}
                      >
                        {consultant.name}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <Button
                      onClick={handleContinue}
                      disabled={!selectedConsultant}
                      className={`w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white py-6 text-lg font-semibold transition-all rounded-lg shadow-sm ${
                        !selectedConsultant ? "opacity-70" : "hover:shadow-md"
                      }`}
                    >
                      Continuer
                    </Button>
                    <Button 
                      onClick={handleSignOut} 
                      variant="outline" 
                      className="w-full py-5 rounded-lg border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut size={18} />
                      <span>Se déconnecter</span>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-5 py-4">
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full h-14 px-6 transition-all duration-300 border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 hover:border-gray-300 rounded-lg flex items-center justify-center gap-3 shadow-sm hover:shadow"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
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
                  <span className="font-medium">Se connecter avec Google</span>
                </Button>
                <Button
                  onClick={() => router.push("/email-signin")}
                  className="w-full h-14 bg-[#DC0032] hover:bg-[#DC0032]/90 text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-3"
                >
                  <LogIn size={18} />
                  <span className="font-medium">Se connecter par email</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Arthur Loyd Bretagne. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  )
}

export default LandingPage

