"use client"

import { useEffect, useState } from "react"
import { app } from "@/app/lib/firebase"

export function FirebaseConfigCheck() {
  const [status, setStatus] = useState<"loading" | "configured" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const firebaseApp = app
      if (firebaseApp) {
        const config = firebaseApp.options
        console.log("Firebase configuration:", {
          apiKey: config.apiKey ? "Set" : "Not set",
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket ? "Set" : "Not set",
          messagingSenderId: config.messagingSenderId ? "Set" : "Not set",
          appId: config.appId ? "Set" : "Not set",
        })
        setStatus("configured")
      }
    } catch (err) {
      setStatus("error")
      setError((err as Error).message)
    }
  }, [])

  if (status === "loading") {
    return <div className="mt-4 text-gray-600">Checking Firebase configuration...</div>
  }

  if (status === "error") {
    return <div className="mt-4 text-red-500">Firebase configuration error: {error}</div>
  }

  return <div className="mt-4 text-green-500">Firebase configured successfully!</div>
}

