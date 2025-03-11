"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithGoogle,
} from "@/app/lib/firebase"
import { Loader2 } from "lucide-react"
import type { User } from "firebase/auth"
import { updateProfile } from "firebase/auth"
import { hasAllowedEmailDomain } from "@/app/lib/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Composant d'animation du personnage
const AnimatedCharacter = ({ 
  focusedField, 
  emailText, 
  firstNameText = "", 
  lastNameText = "" 
}: { 
  focusedField: 'email' | 'password' | 'firstName' | 'lastName' | null, 
  emailText: string,
  firstNameText?: string,
  lastNameText?: string
}) => {
  const headRef = useRef<SVGGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);
  const leftReflectionRef = useRef<SVGCircleElement>(null);
  const rightReflectionRef = useRef<SVGCircleElement>(null);
  const leftPawRef = useRef<SVGPathElement>(null);
  const rightPawRef = useRef<SVGPathElement>(null);
  
  // Couleurs Arthur Lloyd
  const primaryColor = "#DC0032"; // Rouge Arthur Lloyd
  const secondaryColor = "#333333"; // Couleur foncée pour détails
  const pawColor = "#B9002A"; // Couleur légèrement différente pour les pattes (pour le contraste)
  
  // Animation des yeux et de la tête basée sur le champ actif et le texte
  useEffect(() => {
    // Position de base des yeux
    const baseLeftEyeX = 45;
    const baseRightEyeX = 75;
    const baseEyeY = 55;
    
    // Position des reflets par rapport aux pupilles
    const reflectionOffsetX = -2;
    const reflectionOffsetY = -2;
    
    // Réinitialiser la position des pattes selon le champ actif
    if (leftPawRef.current && rightPawRef.current) {
      if (focusedField === 'password') {
        // Pattes couvrant les yeux pour le mot de passe
        leftPawRef.current.setAttribute('d', 'M25,70 Q35,55 45,50');
        rightPawRef.current.setAttribute('d', 'M85,70 Q75,55 65,50');
        
        // Animation d'entrée des pattes
        leftPawRef.current.classList.add('paws-covering');
        rightPawRef.current.classList.add('paws-covering');
      } else {
        // Pattes invisibles quand on n'est pas sur le mot de passe
        leftPawRef.current.setAttribute('d', 'M0,0 L0,0');
        rightPawRef.current.setAttribute('d', 'M0,0 L0,0');
        
        // Retirer la classe d'animation
        leftPawRef.current.classList.remove('paws-covering');
        rightPawRef.current.classList.remove('paws-covering');
      }
    }
    
    // Suivre la souris uniquement quand on est dans un champ de texte (sauf password)
    const handleMouseMove = (e: MouseEvent) => {
      if (
        (focusedField !== 'email' && 
         focusedField !== 'firstName' && 
         focusedField !== 'lastName') || 
        !eyesRef.current || 
        !leftEyeRef.current || 
        !rightEyeRef.current || 
        !leftReflectionRef.current || 
        !rightReflectionRef.current
      ) return;
      
      const svgRect = eyesRef.current.getBoundingClientRect();
      
      // Calculer la position relative de la souris par rapport au SVG
      const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * 2 - 1;
      const mouseY = ((e.clientY - svgRect.top) / svgRect.height) * 2 - 1;
      
      // Limiter le mouvement des yeux
      const maxEyeMovement = 3;
      
      // Appliquer le déplacement avec une limite
      const eyeX = Math.max(-maxEyeMovement, Math.min(maxEyeMovement, mouseX));
      const eyeY = Math.max(-maxEyeMovement, Math.min(maxEyeMovement, mouseY));
      
      // Mettre à jour la position des pupilles
      const leftPupilX = baseLeftEyeX + eyeX;
      const rightPupilX = baseRightEyeX + eyeX;
      const leftPupilY = baseEyeY + eyeY;
      const rightPupilY = baseEyeY + eyeY;
      
      leftEyeRef.current.setAttribute('cx', `${leftPupilX}`);
      leftEyeRef.current.setAttribute('cy', `${leftPupilY}`);
      rightEyeRef.current.setAttribute('cx', `${rightPupilX}`);
      rightEyeRef.current.setAttribute('cy', `${rightPupilY}`);
      
      // Déplacer les reflets avec les pupilles
      leftReflectionRef.current.setAttribute('cx', `${leftPupilX + reflectionOffsetX}`);
      leftReflectionRef.current.setAttribute('cy', `${leftPupilY + reflectionOffsetY}`);
      rightReflectionRef.current.setAttribute('cx', `${rightPupilX + reflectionOffsetX}`);
      rightReflectionRef.current.setAttribute('cy', `${rightPupilY + reflectionOffsetY}`);
    };
    
    // Animation en fonction de la longueur du texte dans le champ actif
    if (leftEyeRef.current && rightEyeRef.current && headRef.current && leftReflectionRef.current && rightReflectionRef.current) {
      let textToFollow = "";
      let maxTextLength = 30; // Par défaut pour email
      
      // Déterminer quel texte utiliser selon le champ actif
      if (focusedField === 'email') {
        textToFollow = emailText;
        maxTextLength = 30;
      } else if (focusedField === 'firstName') {
        textToFollow = firstNameText;
        maxTextLength = 20;
      } else if (focusedField === 'lastName') {
        textToFollow = lastNameText;
        maxTextLength = 20;
      }
      
      if (textToFollow && (focusedField === 'email' || focusedField === 'firstName' || focusedField === 'lastName')) {
        // Calculer la position horizontale en fonction de la longueur du texte
        const textLength = textToFollow.length;
        const textProgress = Math.min(1, textLength / maxTextLength);
        
        // Déplacer les yeux horizontalement en fonction de la progression du texte
        const eyeX = -2 + (textProgress * 6);
        
        // Appliquer uniquement le déplacement horizontal basé sur le texte
        const leftPupilX = baseLeftEyeX + eyeX;
        const rightPupilX = baseRightEyeX + eyeX;
        
        leftEyeRef.current.setAttribute('cx', `${leftPupilX}`);
        rightEyeRef.current.setAttribute('cx', `${rightPupilX}`);
        
        // Déplacer aussi les reflets
        leftReflectionRef.current.setAttribute('cx', `${leftPupilX + reflectionOffsetX}`);
        rightReflectionRef.current.setAttribute('cx', `${rightPupilX + reflectionOffsetX}`);
        
        // Rotation de la tête qui suit le texte écrit (de -10 à 10 degrés)
        const rotationDegree = -10 + (textProgress * 20);
        headRef.current.style.transform = `rotate(${rotationDegree}deg)`;
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [focusedField, emailText, firstNameText, lastNameText]);
  
  return (
    <div className="flex justify-center my-6">
      <svg width="130" height="130" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" className="transition-all duration-300">
        <style>
          {`
            .head {
              transform-origin: center center;
              transition: transform 0.3s ease;
            }
            .paws-covering {
              transition: d 0.5s ease-out;
            }
            @keyframes slow-bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-2px); }
            }
            .character-body {
              animation: slow-bounce 3s infinite ease-in-out;
            }
          `}
        </style>
        
        {/* Ombre sous la tête pour la profondeur */}
        <ellipse cx="65" cy="110" rx="35" ry="6" fill="rgba(0,0,0,0.1)" />
        
        {/* Groupe de la tête pour l'animation de rotation */}
        <g ref={headRef} className="head character-body">
          {/* Tête avec la couleur rouge Arthur Lloyd */}
          <circle cx="65" cy="65" r="42" fill={primaryColor} />
          
          {/* Oreilles */}
          <circle cx="35" cy="35" r="13" fill={primaryColor} />
          <circle cx="95" cy="35" r="13" fill={primaryColor} />
          
          {/* Détails intérieurs des oreilles */}
          <ellipse cx="35" cy="35" rx="7" ry="7" fill="#B9002A" />
          <ellipse cx="95" cy="35" rx="7" ry="7" fill="#B9002A" />
          
          {/* Museau - plus rond et plus mignon */}
          <ellipse cx="65" cy="75" rx="22" ry="18" fill="#FFCCCC" />
          
          {/* Joues roses pour plus de mignonnerie */}
          <circle cx="40" cy="75" r="8" fill="#FFAABB" opacity="0.6" />
          <circle cx="90" cy="75" r="8" fill="#FFAABB" opacity="0.6" />
          
          {/* Nez - légèrement plus petit et plus haut */}
          <ellipse cx="65" cy="70" rx="5" ry="3.5" fill={secondaryColor} />
          
          {/* Bouche - sourire plus mignon et plus petit */}
          <path d="M55,80 Q65,85 75,80" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Yeux (état différent selon le champ actif) */}
          <g ref={eyesRef}>
            {focusedField === 'password' ? (
              <>
                {/* Yeux fermés et sourcils relevés pour le mot de passe - avec un air plus inquiet que fâché */}
                <path d="M38,56 Q45,52 52,56" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M78,56 Q85,52 92,56" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
                
                {/* Sourcils inquiets mais pas énervés */}
                <path d="M38,46 Q45,42 52,47" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M78,47 Q85,42 92,46" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Sourcils plus doux et plus hauts - expression plus amicale */}
                <path d="M40,44 Q45,42 50,44" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M80,44 Q85,42 90,44" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
                
                {/* Yeux agrandis avec pupilles suivant le pointeur ou le texte */}
                <circle cx="45" cy="55" r="8" fill="white" stroke={secondaryColor} strokeWidth="0.5" />
                <circle cx="75" cy="55" r="8" fill="white" stroke={secondaryColor} strokeWidth="0.5" />
                
                {/* Pupilles plus grandes */}
                <circle ref={leftEyeRef} cx="45" cy="55" r="3.5" fill={secondaryColor} />
                <circle ref={rightEyeRef} cx="75" cy="55" r="3.5" fill={secondaryColor} />
                
                {/* Reflets dans les yeux qui suivent les pupilles */}
                <circle ref={leftReflectionRef} cx="43" cy="53" r="1.5" fill="white" />
                <circle ref={rightReflectionRef} cx="73" cy="53" r="1.5" fill="white" />
              </>
            )}
          </g>
        </g>
        
        {/* Pattes qui couvrent les yeux en mode mot de passe - utilisation d'une couleur différente pour le contraste */}
        <path ref={leftPawRef} d="M0,0 L0,0" fill="none" stroke={pawColor} strokeWidth="13" strokeLinecap="round" />
        <path ref={rightPawRef} d="M0,0 L0,0" fill="none" stroke={pawColor} strokeWidth="13" strokeLinecap="round" />
        
        {/* Bouts des pattes plus clairs et plus grands pour le contraste */}
        <circle cx="45" cy="50" r="6" fill="#FFCCCC" className={focusedField === 'password' ? 'opacity-100' : 'opacity-0'} />
        <circle cx="75" cy="50" r="6" fill="#FFCCCC" className={focusedField === 'password' ? 'opacity-100' : 'opacity-0'} />
      </svg>
    </div>
  );
};

interface EmailAuthFormProps {
  mode: "signin" | "signup"
}

export function EmailAuthForm({ mode }: EmailAuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'firstName' | 'lastName' | null>(null);
  const router = useRouter()

  // Ajouter un useEffect pour rediriger automatiquement si l'utilisateur est déjà connecté
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        // Rediriger vers la page principale
        router.push("/")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validation de base
    if (!email || !password) {
      setError("Veuillez remplir tous les champs obligatoires")
      setIsLoading(false)
      return
    }

    try {
      if (!auth) {
        throw new Error("Service d'authentification non disponible")
      }
      
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        // Vérifier que les champs prénom et nom sont remplis si on est en mode inscription
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("Veuillez remplir les champs prénom et nom")
        }
        
        // Vérifier que l'email a un domaine autorisé
        if (!hasAllowedEmailDomain(email)) {
          throw new Error("Seuls les emails @arthurloydbretagne.fr et @arthur-loyd.com sont autorisés à s'inscrire")
        }
        
        // Créer l'utilisateur avec email et mot de passe
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        // Mettre à jour le profil avec le prénom et le nom
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: `${firstName} ${lastName}`,
          })
        }
      }
      // La redirection sera gérée par le useEffect onAuthStateChanged
      // Pas besoin d'appeler router.push ici car l'utilisateur sera automatiquement redirigé
    } catch (error) {
      if (error instanceof Error) {
        const firebaseError = error as { code?: string }
        if (firebaseError.code === "auth/invalid-credential") {
          setError("Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.")
        } else if (firebaseError.code === "auth/email-already-in-use") {
          setError("Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.")
        } else if (firebaseError.code === "auth/weak-password") {
          setError("Le mot de passe est trop faible. Utilisez au moins 6 caractères.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Une erreur s'est produite. Veuillez réessayer.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError("Veuillez entrer votre email pour réinitialiser votre mot de passe.")
      return
    }
    
    if (!auth) {
      setError("Service d'authentification non disponible")
      return
    }
    
    setIsLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      alert("Un email de réinitialisation du mot de passe a été envoyé. Vérifiez votre boîte de réception.")
    } catch (error) {
      setError("Erreur lors de l'envoi de l'email de réinitialisation. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Fonction pour gérer la navigation entre les pages
  const handleNavigate = () => {
    // Utiliser le router Next.js pour la navigation
    if (mode === "signin") {
      router.push("/email-signup")
    } else {
      router.push("/email-signin")
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsGoogleLoading(true)
    
    try {
      await signInWithGoogle()
      // La redirection sera gérée par le useEffect onAuthStateChanged
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Une erreur s'est produite lors de la connexion avec Google. Veuillez réessayer.")
      }
      setIsGoogleLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Ajouter le personnage animé avec le texte de l'email */}
      <AnimatedCharacter 
        focusedField={focusedField} 
        emailText={email} 
        firstNameText={firstName}
        lastNameText={lastName}
      />
      
      {mode === "signup" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                required={mode === "signup"}
                disabled={isLoading}
                placeholder="Prénom"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField(null)}
                required={mode === "signup"}
                disabled={isLoading}
                placeholder="Nom"
              />
            </div>
          </div>
        </>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          required
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      
      {/* Bouton de connexion avec Google */}
      {mode === "signin" && (
        <Button 
          type="button" 
          className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center" 
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
              Se connecter avec Google
            </>
          )}
        </Button>
      )}
      
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">ou</span>
        </div>
      </div>
      
      <Button type="submit" className="w-full bg-brand hover:bg-brand/90 text-white" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {mode === "signin" ? "Connexion en cours..." : "Inscription en cours..."}
          </>
        ) : mode === "signin" ? (
          "Se connecter"
        ) : (
          "S'inscrire"
        )}
      </Button>
      <div className="flex justify-between">
        {mode === "signin" && (
          <Button type="button" variant="link" onClick={handleResetPassword} disabled={isLoading}>
            Mot de passe oublié ?
          </Button>
        )}
        <Button
          type="button"
          variant="link"
          onClick={handleNavigate}
          disabled={isLoading}
          className="ml-auto"
        >
          {mode === "signin" ? "Créer un compte" : "Déjà un compte ?"}
        </Button>
      </div>
    </form>
  )
}

