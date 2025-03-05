import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

console.log('Environment Variables Check:', {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '602323147221',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:602323147221:web:7a1d976ac0478b593b455c',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Not set'
});

console.log('Initializing Firebase...');

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  console.log('Creating new Firebase app');
  app = initializeApp(firebaseConfig);
} else {
  console.log('Using existing Firebase app');
  app = getApp();
}

// Initialize Firestore
const db = getFirestore(app);
console.log('Firestore initialized');

// Initialize Auth only in browser environment
let auth: Auth;
if (typeof window !== 'undefined') {
  auth = getAuth(app);
  console.log('Auth initialized (browser environment)', { authInitialized: !!auth });
} else {
  // Créer un objet factice pour SSR
  auth = {} as Auth;
  console.log('Auth mock created for SSR');
}

// Fonction utilitaire pour uploader une image
const uploadImage = async (file: File, path: string) => {
  console.log('uploadImage called', { fileSize: file.size, path });
  const storage = getStorage(app);
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

// Fonction pour se connecter avec Google
export async function signInWithGoogle() {
  console.log('signInWithGoogle called', { authAvailable: !!auth });
  if (typeof window === 'undefined') {
    console.error("Firebase Auth n'est pas disponible côté serveur");
    throw new Error("Firebase Auth n'est pas disponible côté serveur");
  }
  
  const provider = new GoogleAuthProvider();
  try {
    console.log('Tentative de connexion avec Google...');
    const result = await signInWithPopup(auth, provider);
    console.log('Connexion réussie avec Google', { userId: result.user.uid });
    return result.user;
  } catch (error) {
    console.error("Erreur lors de la connexion avec Google:", error);
    throw error;
  }
}

// Configuration Gmail
console.log('Configuration Gmail:', {
  clientIdExists: !!process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID,
  clientIdPrefix: process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID ? process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID.substring(0, 10) + '...' : 'Non défini',
  envVarExists: !!process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID
});

// Exporter toutes les fonctions et variables nécessaires
export { 
  app, 
  auth, 
  db, 
  uploadImage,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
};

// Export par défaut pour compatibilité
export default { signInWithGoogle };
