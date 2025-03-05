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
} from "@/app/lib/firebase"
import { Loader2 } from "lucide-react"
import type { User } from "firebase/auth"
import { updateProfile } from "firebase/auth"

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
        
        // Créer l'utilisateur avec email et mot de passe
        const userCredential = await createUserWithEmailAndPassword(email, password)
        
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
        } else if (firebaseError.code === "auth/user-not-found") {
          setError("Aucun compte n'existe avec cet email. Veuillez créer un compte.")
        } else if (firebaseError.code === "auth/email-already-in-use") {
          setError("Un compte existe déjà avec cet email. Veuillez vous connecter.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Une erreur inconnue s'est produite. Veuillez réessayer.")
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

