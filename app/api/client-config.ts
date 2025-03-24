// Configuration pour le client firebase uniquement
// Ce fichier ne doit PAS importer firebase-admin

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