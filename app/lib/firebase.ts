import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getFirestore, Firestore } from "firebase/firestore"
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUser,
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
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
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
let storage: any;

if (typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Firebase:', error);
    throw error;
  }
}

// Liste des domaines d'email autorisés
const ALLOWED_EMAIL_DOMAINS = [
  'arthurloydbretagne.fr',
  'arthur-loyd.com',
  'arthur-loyd.fr'
];

// Fonction pour vérifier si un email a un domaine autorisé
export function hasAllowedEmailDomain(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  
  const domain = email.split('@')[1].toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

// Fonction pour créer un utilisateur avec vérification du domaine
export async function createUserWithEmailAndPassword(auth: any, email: string, password: string) {
  if (!hasAllowedEmailDomain(email)) {
    throw new Error('Seuls les emails @arthurloydbretagne.fr et @arthur-loyd.com sont autorisés à s\'inscrire.');
  }
  
  return await firebaseCreateUser(auth, email, password);
}

// Fonction pour uploader une image dans Firebase Storage
export async function uploadImage(file: File, folder = 'uploads'): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage n\'est pas initialisé');
  }
  
  try {
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
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
    
    // Vérifier si l'email a un domaine autorisé
    if (!hasAllowedEmailDomain(result.user.email || '')) {
      // Déconnecter l'utilisateur immédiatement
      await auth.signOut();
      throw new Error('Seuls les emails @arthurloydbretagne.fr et @arthur-loyd.com sont autorisés à se connecter.');
    }
    
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
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
};

// Export par défaut pour compatibilité
export default { signInWithGoogle, hasAllowedEmailDomain };
