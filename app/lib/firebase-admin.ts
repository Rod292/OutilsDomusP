import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error("Missing Firebase Admin credentials - check your environment variables")
}

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
}

// Initialize Firebase Admin only if it hasn't been initialized already
export const firebaseAdmin = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0]

export const adminDb = getFirestore(firebaseAdmin)
export const adminAuth = getAuth(firebaseAdmin)

