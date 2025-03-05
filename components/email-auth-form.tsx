"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import type { User } from "firebase/auth"

type AuthMode = "signin" | "signup" | "reset"

export function EmailAuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authMode, setAuthMode] = useState<AuthMode>("signin")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
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
      
      if (authMode === "signin") {
        await signInWithEmailAndPassword(auth, email, password)
      } else if (authMode === "signup") {
        await createUserWithEmailAndPassword(email, password)
      } else if (authMode === "reset") {
        await sendPasswordResetEmail(auth, email)
        alert("Un email de réinitialisation du mot de passe a été envoyé. Vérifiez votre boîte de réception.")
      }
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          disabled={isLoading}
        />
      </div>
      {authMode !== "reset" && (
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full bg-brand hover:bg-brand/90 text-white" disabled={isLoading}>
        {isLoading ? (
          "Chargement..."
        ) : authMode === "signin"
          ? "Se connecter"
          : authMode === "signup"
            ? "S'inscrire"
            : "Réinitialiser le mot de passe"}
      </Button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
          className="text-brand hover:underline"
          disabled={isLoading}
        >
          {authMode === "signin" ? "Créer un compte" : "Déjà un compte ?"}
        </button>
        <button 
          type="button" 
          onClick={() => setAuthMode("reset")} 
          className="text-brand hover:underline"
          disabled={isLoading}
        >
          Mot de passe oublié ?
        </button>
      </div>
    </form>
  )
}

