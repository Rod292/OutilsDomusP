import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getFirestore, Firestore } from "firebase/firestore"
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUser,
  sendPasswordResetEmail,
  browserPopupRedirectResolver
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

// Configuration Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Not set'
});

console.log('Initializing Firebase...');

// Initialiser l'application Firebase uniquement côté client et éviter la double initialisation
const apps = getApps();
const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];

// Initialiser Firestore
const db = getFirestore(app);

// Initialiser Auth
const auth = getAuth(app);

// Initialiser Storage
const storage = getStorage(app);

// Liste des domaines d'email autorisés
const ALLOWED_EMAIL_DOMAINS = [
  'arthurloydbretagne.fr',
  'arthur-loyd.com',
  'arthur-loyd.fr'
];

// Liste des emails spécifiques autorisés
const ALLOWED_SPECIFIC_EMAILS = [
  'photos.pers@gmail.com',
  'rodrigue.pers29@gmail.com'
];

// Fonction pour vérifier si un email a un domaine autorisé
export function hasAllowedEmailDomain(email: string): boolean {
  if (!email || !email.includes('@')) {
    console.log('Email invalide ou ne contient pas @:', email);
    return false;
  }
  
  // Normaliser l'email (trim et lowercase)
  const normalizedEmail = email.trim().toLowerCase();
  
  console.log('Vérification de l\'email:', normalizedEmail);
  console.log('Emails spécifiques autorisés:', ALLOWED_SPECIFIC_EMAILS);
  
  // Vérifier si l'email est dans la liste des emails spécifiques autorisés
  if (ALLOWED_SPECIFIC_EMAILS.includes(normalizedEmail)) {
    console.log('Email spécifique autorisé trouvé:', normalizedEmail);
    return true;
  }
  
  // Vérifier si le domaine est autorisé
  const domain = normalizedEmail.split('@')[1];
  const isDomainAllowed = ALLOWED_EMAIL_DOMAINS.includes(domain);
  
  console.log('Domaine de l\'email:', domain);
  console.log('Domaines autorisés:', ALLOWED_EMAIL_DOMAINS);
  console.log('Domaine autorisé?', isDomainAllowed);
  
  return isDomainAllowed;
}

// Fonction pour créer un utilisateur avec vérification du domaine
export async function createUserWithEmailAndPassword(auth: any, email: string, password: string) {
  if (!hasAllowedEmailDomain(email)) {
    throw new Error('Seuls les emails @arthurloydbretagne.fr, @arthur-loyd.com et certains emails spécifiques sont autorisés à s\'inscrire.');
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
  // Forcer la sélection du compte même si l'utilisateur n'a qu'un seul compte
  provider.setCustomParameters({
    prompt: 'select_account',
    login_hint: ''
  });
  
  try {
    console.log('Tentative de connexion avec Google par popup...');
    // Utiliser signInWithPopup avec le resolver explicite
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    console.log('Résultat de popup Google obtenu, email:', result.user.email);
    
    // Vérifier si l'email a un domaine autorisé
    const isAllowed = hasAllowedEmailDomain(result.user.email || '');
    console.log('Email autorisé?', isAllowed);
    
    if (!isAllowed) {
      // Déconnecter l'utilisateur immédiatement
      console.log('Email non autorisé, déconnexion de l\'utilisateur');
      await auth.signOut();
      throw new Error('Seuls les emails @arthurloydbretagne.fr, @arthur-loyd.com et certains emails spécifiques sont autorisés à se connecter.');
    }
    
    console.log('Connexion réussie avec Google', { userId: result.user.uid });
    return result.user;
  } catch (error) {
    console.error("Erreur lors de la connexion avec Google:", error);
    throw error;
  }
}

// Fonction pour récupérer le résultat de la redirection Google
export async function getGoogleRedirectResult() {
  if (typeof window === 'undefined' || !auth) {
    console.log('getGoogleRedirectResult: window undefined ou auth non disponible');
    return null;
  }
  
  try {
    console.log('Tentative de récupération du résultat de redirection Google...');
    const result = await getRedirectResult(auth);
    
    if (result) {
      const userEmail = result.user.email || '';
      console.log('Résultat de redirection Google obtenu, email:', userEmail);
      
      // Vérifier si l'email a un domaine autorisé
      const isAllowed = hasAllowedEmailDomain(userEmail);
      console.log('Email autorisé?', isAllowed);
      
      if (!isAllowed) {
        // Déconnecter l'utilisateur immédiatement
        console.log('Email non autorisé, déconnexion de l\'utilisateur');
        await auth.signOut();
        throw new Error('Seuls les emails @arthurloydbretagne.fr, @arthur-loyd.com et certains emails spécifiques sont autorisés à se connecter.');
      }
      
      console.log('Connexion réussie avec Google', { userId: result.user.uid });
      return result.user;
    } else {
      console.log('Aucun résultat de redirection Google');
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération du résultat de redirection Google:", error);
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
