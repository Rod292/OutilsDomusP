import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

// Log détaillé pour déboguer
console.log('Environment Variables Check:', {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Log de la configuration complète
console.log('Firebase Config:', firebaseConfig);

let app: FirebaseApp
let db: any
let storage: any
let auth: any

console.log('Initializing Firebase...');

if (!getApps().length) {
  console.log('Creating new Firebase app');
  app = initializeApp(firebaseConfig)
} else {
  console.log('Using existing Firebase app');
  app = getApps()[0]
}

if (typeof window !== "undefined") {
  console.log('Initializing Firebase services');
  db = getFirestore(app)
  storage = getStorage(app)
  auth = getAuth(app)
}

export { app, db, storage, auth, ref, uploadBytes, getDownloadURL }

/**
 * Télécharge une image vers Firebase Storage
 * @param file - Le fichier à télécharger
 * @param path - Chemin dans Firebase Storage (dossier)
 * @returns URL de téléchargement de l'image
 */
export async function uploadImage(file: File, path: string = 'newsletter-pemsud'): Promise<string> {
  try {
    console.log(`Début upload image: ${file.name}, taille: ${file.size}, type: ${file.type}`);
    
    // Créer un nom de fichier unique basé sur un timestamp
    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    console.log(`Référence storage créée: ${path}/${fileName}`);
    
    // Convertir le fichier en ArrayBuffer
    const buffer = await file.arrayBuffer();
    console.log(`Fichier converti en ArrayBuffer, taille: ${buffer.byteLength}`);
    
    // Télécharger le fichier
    console.log('Début téléchargement vers Firebase...');
    const snapshot = await uploadBytes(storageRef, new Uint8Array(buffer));
    console.log(`Upload réussi! Metadata:`, snapshot.metadata);
    
    // Obtenir l'URL de téléchargement
    console.log('Récupération de l\'URL de téléchargement...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`URL obtenue: ${downloadURL.substring(0, 50)}...`);
    
    return downloadURL;
  } catch (error) {
    console.error('Erreur détaillée lors du téléchargement de l\'image:', error);
    // Vérifier le type d'erreur
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

/**
 * Sauvegarde une image temporaire et obtient son URL de téléchargement
 * @param file 
 * @returns 
 */
export async function uploadTemporaryImage(file: File): Promise<string> {
  console.log("Chargement de l'image:", file.name);
  
  // Générer un nom de fichier unique pour l'image temporaire
  const timestamp = Date.now();
  const filename = `temp_uploads/${timestamp}_${file.name}`;
  
  // Référence au fichier dans le stockage
  const storageRef = ref(storage, filename);
  
  try {
    // Téléverser le fichier
    await uploadBytes(storageRef, file);
    
    // Obtenir l'URL de téléchargement
    const downloadURL = await getDownloadURL(storageRef);
    console.log("Image téléchargée avec succès:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("Erreur lors du téléchargement de l'image:", error);
    throw error;
  }
}

