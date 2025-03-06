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
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
let auth: Auth | undefined;
if (typeof window !== 'undefined') {
  auth = getAuth(app);
  console.log('Auth initialized (browser environment)', { authInitialized: !!auth });
}

// Fonction utilitaire pour uploader une image
const uploadImage = async (file: File, path: string) => {
  console.log('uploadImage called', { fileSize: file.size, path });
  if (!auth) {
    throw new Error("Firebase Auth n'est pas initialisé")
  }
  const storage = getStorage(app);
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

// Fonction pour se connecter avec Google
const signInWithGoogle = async () => {
  console.log('signInWithGoogle called', { authAvailable: !!auth });
  if (!auth) {
    console.error("Firebase Auth n'est pas initialisé");
    throw new Error("Firebase Auth n'est pas initialisé");
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
};

// Exporter toutes les fonctions et variables nécessaires
export { 
  app, 
  auth, 
  db, 
  uploadImage, 
  signInWithGoogle,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
}; 