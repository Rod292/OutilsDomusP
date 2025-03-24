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
import { motion, AnimatePresence } from "framer-motion"

// Variantes d'animation pour les éléments
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const buttonVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  hover: { 
    scale: 1.03,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.97,
    transition: { duration: 0.1 }
  },
  selected: {
    scale: 1,
    backgroundColor: "#DC0032",
    color: "#FFFFFF",
    borderColor: "#DC0032",
    boxShadow: "0 4px 12px rgba(220, 0, 50, 0.2)",
    transition: { duration: 0.3 }
  }
};

const avatarVariants = {
  hidden: { scale: 0.8, opacity: 0, y: 10 },
  visible: { 
    scale: 1, 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 15 
    }
  }
};

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
  const [isExiting, setIsExiting] = useState(false)

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

    return () => {
      unsubscribe();
    }
  }, [router])

  const handleConsultantSelect = (consultant: string) => {
    setSelectedConsultant(consultant)
  }

  const handleContinue = () => {
    if (selectedConsultant) {
      setIsExiting(true);
      setTimeout(() => {
        // Après sélection du consultant, rediriger vers la page de sélection d'outil
        router.push(`/selection-outil?consultant=${selectedConsultant.toLowerCase().replace(" ", "-")}`)
      }, 500);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full mx-auto mb-5"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-6"
        variants={containerVariants}
        initial="hidden"
        animate={isExiting ? "exit" : "visible"}
        exit="exit"
        key="landing-page"
      >
        <motion.div className="w-full max-w-4xl" variants={itemVariants}>
          <motion.div className="text-center mb-10" variants={itemVariants}>
            <motion.div 
              className="relative w-[200px] h-[60px] mx-auto mb-6"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-2zK5QMuADUDloHaTHRigGM1AMVs4hq.png"
                alt="Arthur Loyd"
                fill
                style={{ objectFit: 'contain' }}
                className="drop-shadow-sm"
              />
            </motion.div>
            <motion.h1 
              className="text-3xl md:text-4xl font-bold text-[#2D2D2D] dark:text-white mb-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Bonjour !
            </motion.h1>
            <motion.p 
              className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {user ? "Sélectionnez votre profil pour accéder à vos outils" : "Connectez-vous pour accéder à vos états des lieux"}
            </motion.p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert variant="destructive" className="mb-6 border border-red-200 shadow-sm">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle className="font-semibold">Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <motion.div 
            variants={itemVariants}
            className="w-full"
          >
            <Card className="w-full border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md">
              <CardHeader className="space-y-2 bg-gradient-to-r from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-100 dark:border-gray-700 px-6 py-6">
                <CardTitle className="text-2xl font-bold text-center text-[#2D2D2D] dark:text-white">
                  {user ? "Choisissez votre profil" : "Connexion"}
                </CardTitle>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  {user
                    ? "Cliquez sur votre nom pour accéder à votre espace personnel"
                    : "Connectez-vous pour accéder à vos outils"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-6">
                {user ? (
                  <>
                    <div className="relative">
                      <motion.div 
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8"
                        variants={containerVariants}
                      >
                        {consultants.map((consultant, index) => (
                          <motion.div
                            key={consultant.name}
                            variants={buttonVariants}
                            custom={index}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <motion.button
                              onClick={() => handleConsultantSelect(consultant.name)}
                              className={`w-full h-16 text-base font-medium rounded-lg border transition-all duration-300 ${
                                selectedConsultant === consultant.name 
                                  ? "bg-[#DC0032] text-white border-[#DC0032]" 
                                  : "bg-white text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
                              }`}
                              animate={selectedConsultant === consultant.name ? "selected" : "visible"}
                              initial="hidden"
                            >
                              {consultant.name}
                            </motion.button>
                          </motion.div>
                        ))}
                      </motion.div>
                      <motion.div 
                        className="space-y-4"
                        variants={containerVariants}
                      >
                        <motion.div variants={itemVariants}>
                          <Button
                            onClick={handleContinue}
                            disabled={!selectedConsultant}
                            className={`w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white py-6 text-lg font-semibold transition-all rounded-lg shadow-sm ${
                              !selectedConsultant ? "opacity-70" : "hover:shadow-md"
                            }`}
                          >
                            Continuer
                          </Button>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                          <Button 
                            onClick={handleSignOut} 
                            variant="outline" 
                            className="w-full py-5 rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 dark:text-gray-200"
                          >
                            <LogOut size={18} />
                            <span>Se déconnecter</span>
                          </Button>
                        </motion.div>
                      </motion.div>
                    </div>
                  </>
                ) : (
                  <motion.div 
                    className="space-y-5 py-4"
                    variants={containerVariants}
                  >
                    <motion.div 
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleGoogleSignIn}
                        variant="outline"
                        className="w-full h-14 px-6 transition-all duration-300 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg flex items-center justify-center gap-3 shadow-sm hover:shadow"
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
                          <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        <span className="text-base font-medium">Se connecter avec Google</span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          © 2025 Arthur Loyd Bretagne. Tous droits réservés.
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default LandingPage

