// Configuration des notifications
export const NOTIFICATION_CONFIG = {
  // Si les notifications sont activées
  ENABLED: true,
  
  // Activer/désactiver Firebase Cloud Messaging
  USE_FCM: process.env.NEXT_PUBLIC_USE_FCM === 'true',
  
  // Clé VAPID pour les notifications push Web
  VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BGzPLt8Qmv6lFQDwKZLJzcIqH4cwWJN2P_aPCp8HYXJn7LIXHA5RL9rUd2uxSCnD2XHJZFGVtV11i3n2Ux9JYXM',
  
  // Si on utilise la clé API Firebase
  USE_API_KEY: false,
  
  // Clé API Firebase
  API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  
  // Délai d'attente pour FCM (en millisecondes)
  FCM_TIMEOUT: 3000,
  
  // Activer les tokens de test en développement
  USE_TEST_TOKENS_IN_DEV: true,
  
  // Préfixe pour les tokens de test
  TEST_TOKEN_PREFIX: 'test-token',
}; 