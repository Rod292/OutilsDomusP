// Clé publique VAPID pour les notifications Web Push (à remplacer par votre clé VAPID)
export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Configuration pour le service worker
export const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

// Chemin des icônes de notification
export const NOTIFICATION_ICONS = {
  icon: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
};

// Types de notifications
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_REMINDER = 'task_reminder',
  DAILY_REMINDER = 'daily_reminder',
  SYSTEM = 'system',
}

// Paramètres des notifications
export const NOTIFICATION_SETTINGS = {
  // Intervalle pour les rappels de tâches (en minutes)
  reminderInterval: 30,
  
  // URL de base pour l'API de notifications
  apiUrl: '/api/notifications',
  
  // Titres par défaut pour les différents types de notifications
  defaultTitles: {
    [NotificationType.TASK_ASSIGNED]: '📋 Nouvelle tâche assignée',
    [NotificationType.TASK_REMINDER]: '⏰ Rappel de tâche',
    [NotificationType.DAILY_REMINDER]: '📅 Vos tâches du jour',
    [NotificationType.SYSTEM]: 'Notification système',
  },
}; 