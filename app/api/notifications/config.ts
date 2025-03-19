/**
 * Configuration globale pour le système de notifications
 * Ce fichier permet de centraliser les paramètres pour le fonctionnement
 * du système de notifications dans l'application.
 */

export const NOTIFICATION_CONFIG = {
  /**
   * Active ou désactive l'utilisation de Firebase Cloud Messaging
   * Si défini à false, les notifications seront gérées en local uniquement
   */
  USE_FCM: false, // Mettre à true pour utiliser FCM, false pour le mode local uniquement
  
  /**
   * Active ou désactive l'authentification API pour les endpoints de notification
   */
  USE_API_KEY: true,
  
  /**
   * Enregistre les notifications dans Firestore même si FCM est désactivé
   */
  STORE_NOTIFICATIONS: true,
  
  /**
   * Textes utilisés dans l'interface pour les notifications
   */
  MESSAGES: {
    PERMISSION_TITLE: "Activer les notifications",
    PERMISSION_TEXT: "Recevez des alertes pour les tâches assignées et les rappels importants.",
    PERMISSION_DENIED: "Vous avez refusé les notifications. Vous pouvez les activer dans les paramètres de votre navigateur.",
    PERMISSION_DEFAULT: "Merci d'autoriser les notifications pour être informé des nouvelles tâches.",
    ACTIVATED: "Notifications activées avec succès!",
    ERROR: "Erreur lors de l'activation des notifications.",
  }
}; 