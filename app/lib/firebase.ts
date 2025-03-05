import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getFirestore, Firestore } from "firebase/firestore"
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

// Vérifier que les variables d'environnement essentielles sont définies
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.error('NEXT_PUBLIC_FIREBASE_API_KEY n\'est pas défini');
}

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('NEXT_PUBLIC_FIREBASE_PROJECT_ID n\'est pas défini');
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
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
let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    console.log('Creating new Firebase app');
    app = initializeApp(firebaseConfig);
  } else {
    console.log('Using existing Firebase app');
    app = getApp();
  }

  // Initialize Firestore
  console.log('Initializing Firestore...');
  db = getFirestore(app);
  console.log('Firestore initialized:', {
    dbType: typeof db,
    dbExists: !!db,
    dbProperties: Object.keys(db)
  });

  // Initialize Auth only in browser environment
  if (typeof window !== 'undefined') {
    console.log('Initializing Auth in browser environment...');
    auth = getAuth(app);
    console.log('Auth initialized (browser environment)', { 
      authInitialized: !!auth,
      authType: typeof auth,
      authProperties: Object.keys(auth)
    });
  } else {
    // Créer un objet factice pour SSR
    console.log('Creating Auth mock for SSR...');
    auth = {} as Auth;
    console.log('Auth mock created for SSR');
  }
} catch (error) {
  console.error('Erreur lors de l\'initialisation de Firebase:', error);
  // Créer des objets factices en cas d'erreur
  app = {} as FirebaseApp;
  db = {} as Firestore;
  auth = {} as Auth;
}

// Fonction utilitaire pour uploader une image
const uploadImage = async (file: File, path: string) => {
  console.log('uploadImage called', { fileSize: file.size, path });
  try {
    const storage = getStorage(app);
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image:', error);
    throw error;
  }
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
