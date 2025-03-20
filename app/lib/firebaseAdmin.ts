import * as admin from 'firebase-admin';

// Vérifie si Firebase Admin est déjà initialisé pour éviter les initialisations multiples
// qui peuvent se produire avec le hot-reloading en développement
let firebaseApp: admin.app.App;

if (!admin.apps.length) {
  try {
    // Initialisation de Firebase Admin avec les informations d'identification du service
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
    );

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    
    console.log('Firebase Admin initialisé avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
    throw new Error('Impossible d\'initialiser Firebase Admin');
  }
} else {
  firebaseApp = admin.app();
}

// Exporter les services Firebase Admin
export const firestore = firebaseApp.firestore();
export const auth = firebaseApp.auth();
export const messaging = firebaseApp.messaging();

export default admin; 