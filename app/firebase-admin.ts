import * as admin from 'firebase-admin';

// Initialiser Firebase Admin si ce n'est pas déjà fait
let adminApp: admin.app.App;

try {
  adminApp = admin.app();
} catch {
  // Charger les credentials du service account Firebase Admin
  let serviceAccount;
  
  try {
    // Vérifier si les credentials sont disponibles comme JSON
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      console.log("Credentials Firebase Admin chargées avec succès");
    } else {
      // Configuration de secours utilisant les variables d'environnement individuelles
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '3bfd946945e4b04c31083b3f8bdd95d729845597',
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || '104053556823662383817',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
          process.env.FIREBASE_CLIENT_EMAIL || ''
        )}`
      };
      console.log("Utilisation des variables d'environnement pour les credentials Firebase Admin");
    }
    
    console.log(`Initialisation de Firebase Admin avec le projet: ${serviceAccount.project_id}`);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase Admin:", error);
    throw error;
  }
}

export default adminApp; 