// Configuration pour firebase et firebase-admin
// Imports conditionnels pour éviter les erreurs côté client

// Import pour firebase (client)
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Constantes de configuration Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialisation de l'application Firebase (client)
const clientApps = getApps();
const clientApp = clientApps.length === 0 ? initializeApp(firebaseConfig) : clientApps[0];
const clientDb = getFirestore(clientApp);
const clientAuth = getAuth(clientApp);
const clientStorage = getStorage(clientApp);

// Exports pour le client
export { clientApp, clientDb, clientAuth, clientStorage };

// Configuration de firebase-admin pour les API routes
// Ce fichier ne doit être importé que côté serveur !

// Import admin SDK uniquement côté serveur
import * as admin from 'firebase-admin';

// Initialisation de l'application Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Exports pour les API routes
export const adminApp = admin.app();
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
export const adminMessaging = admin.messaging();

// Configuration des options de notification
export const NOTIFICATION_OPTIONS = {
  USE_FCM: true, // Utilisation de Firebase Cloud Messaging
  TOKENS_COLLECTION: 'notification_tokens', // Nom de la collection Firestore pour les tokens
  NOTIFICATIONS_COLLECTION: 'notifications', // Nom de la collection Firestore pour les notifications
  MAX_TOKENS_PER_USER: 5, // Nombre maximum de tokens par utilisateur
  TOKEN_CLEANUP_INTERVAL: 7 * 24 * 60 * 60 * 1000, // Nettoyer les tokens inactifs après 7 jours
};

// Configuration partagée pour les notifications
export const NOTIFICATION_CONFIG = {
  USE_FCM: true, // Utiliser Firebase Cloud Messaging (sinon mode local)
  USE_API_KEY: false, // Utiliser une clé API pour l'authentification
  vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  MESSAGES: {
    taskAssigned: 'Vous avez une nouvelle tâche assignée',
    communicationAssigned: 'Vous avez une nouvelle communication assignée',
    reminderSent: 'Rappel: vous avez une tâche à compléter',
    ACTIVATED: 'Notifications activées pour'
  }
};

// Fonction pour vérifier la disponibilité du service Firebase Admin
export const checkFirebaseAdmin = async (): Promise<boolean> => {
  try {
    // Dynamic import pour éviter les erreurs côté client
    const admin = await import('firebase-admin');
    return !!admin;
  } catch (error) {
    console.error('Firebase Admin n\'est pas disponible:', error);
    return false;
  }
}; 