// Configuration du service Firebase pour les notifications

export const FIREBASE_CONFIG = {
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || 'etat-des-lieux-arthur-loyd',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
};

// Configuration des options de notification
export const NOTIFICATION_OPTIONS = {
  USE_FCM: true, // Utilisation de Firebase Cloud Messaging
  TOKENS_COLLECTION: 'notification_tokens', // Nom de la collection Firestore pour les tokens
  NOTIFICATIONS_COLLECTION: 'notifications', // Nom de la collection Firestore pour les notifications
  MAX_TOKENS_PER_USER: 5, // Nombre maximum de tokens par utilisateur
  TOKEN_CLEANUP_INTERVAL: 7 * 24 * 60 * 60 * 1000, // Nettoyer les tokens inactifs après 7 jours
};

// Fonction pour vérifier la disponibilité du service Firebase Admin
export const checkFirebaseAdmin = async (): Promise<boolean> => {
  try {
    // Dynamic import pour éviter les erreurs côté client
    const admin = await import('firebase-admin');
    return !!admin;
  } catch (error) {
    console.error('Firebase Admin n\'est pas disponible:', error);
    return false;
  }
}; 