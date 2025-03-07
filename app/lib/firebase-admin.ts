import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Vérifier que les variables d'environnement nécessaires sont définies
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error("Variables d'environnement Firebase Admin manquantes - vérifiez vos variables d'environnement")
}

// Nettoyer la clé privée (remplacer les \n par des sauts de ligne réels)
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

// Configuration de Firebase Admin
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
}

// Initialiser Firebase Admin seulement s'il n'a pas déjà été initialisé
let firebaseAdmin;
let adminDb;

try {
  if (getApps().length === 0) {
    console.log("Initialisation de Firebase Admin...");
    firebaseAdmin = initializeApp(firebaseAdminConfig);
  } else {
    console.log("Utilisation de l'instance Firebase Admin existante");
    firebaseAdmin = getApps()[0];
  }
  
  // Initialiser Firestore Admin
  adminDb = getFirestore(firebaseAdmin);
  console.log("Firestore Admin initialisé avec succès");
} catch (error) {
  console.error("Erreur lors de l'initialisation de Firebase Admin:", error);
  throw error;
}

export { firebaseAdmin, adminDb }

export const adminAuth = getAuth(firebaseAdmin)

