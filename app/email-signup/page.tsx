"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmailAuthForm } from "@/app/components/email-auth-form"
import Image from "next/image"

export default function EmailSignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-XcaUpl2kmkXGPWq4GoS5Mvl5RpKRc1.png"
            alt="Arthur Loyd"
            width={240}
            height={64}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">État des Lieux</h1>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-800">
              Créer un compte
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Entrez vos informations pour créer un nouveau compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailAuthForm mode="signup" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 