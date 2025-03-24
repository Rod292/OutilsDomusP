import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

let firebaseApp: App | undefined;
let firestoreInstance: Firestore | undefined;

function getServiceAccount(): ServiceAccount {
  // Essayer d'abord de charger les credentials complets
  const serviceAccountStr = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (serviceAccountStr) {
    try {
      // Vérifier que le string est valide avant de le parser
      if (serviceAccountStr.startsWith('{') && serviceAccountStr.endsWith('}')) {
        return JSON.parse(serviceAccountStr);
      } else {
        // Tenter de décoder depuis base64 si applicable
        try {
          const decoded = Buffer.from(serviceAccountStr, 'base64').toString('utf-8');
          if (decoded.startsWith('{') && decoded.endsWith('}')) {
            return JSON.parse(decoded);
          }
        } catch (decodeError) {
          console.error('Erreur lors du décodage base64 des credentials:', decodeError);
        }
      }
    } catch (error) {
      console.error('Erreur lors du parsing des credentials Firebase:', error);
    }
  }

  // Fallback sur les credentials individuels
  const serviceAccount: ServiceAccount = {
    type: 'service_account',
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CERT_URL || '',
    universe_domain: 'googleapis.com'
  };

  // Vérifier les champs requis
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Configuration Firebase Admin incomplète');
  }

  return serviceAccount;
}

export function initAdmin(): App {
  if (!firebaseApp) {
    if (getApps().length === 0) {
      try {
        const serviceAccount = getServiceAccount();
        // Cast pour la compatibilité avec les types firebase-admin
        const certCredential = cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key
        });
        
        firebaseApp = initializeApp({
          credential: certCredential,
          projectId: serviceAccount.project_id,
        });
        console.log('Firebase Admin initialisé avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
        throw error;
      }
    } else {
      firebaseApp = getApps()[0];
    }
  }
  return firebaseApp;
}

export function db(): Firestore {
  if (!firestoreInstance) {
    if (!firebaseApp) {
      initAdmin();
    }
    firestoreInstance = getFirestore();
  }
  return firestoreInstance;
} 