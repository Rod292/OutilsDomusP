// Service worker pour les notifications Firebase Cloud Messaging
// Ce fichier doit être à la racine du domaine

// Version du service worker
const SW_VERSION = '1.4.1';

// Configuration Firebase pour le service worker
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || "AIzaSyDujTJIyvicJnP-nMgodJs63rU0fDA69Qc",
  authDomain: self.FIREBASE_AUTH_DOMAIN || "etat-des-lieux-arthur-loyd.firebaseapp.com",
  projectId: self.FIREBASE_PROJECT_ID || "etat-des-lieux-arthur-loyd",
  storageBucket: self.FIREBASE_STORAGE_BUCKET || "etat-des-lieux-arthur-loyd.firebasestorage.app",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "602323147221",
  appId: self.FIREBASE_APP_ID || "1:602323147221:web:7a1d976ac0478b593b455c"
};

// Configuration de la clé VAPID pour les Web Push API
const VAPID_KEY = "BH4d9fbB2K03fd3E-WTtull3cTODxrtVhFQ94FKQgtt_grFm4QQkV6FzC6LlFNttXFCve5CKvDYlplXX1YbzHDo";

// Import des scripts Firebase
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.17.2/firebase-messaging-compat.js');

// Log de démarrage
console.log(`[Firebase SW] Service Worker v${SW_VERSION} initialisation...`);

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);

// Récupération de l'instance de messaging
const messaging = firebase.messaging();

// Définir la clé VAPID pour le service worker
if (messaging.vapidKey === undefined) {
  try {
    messaging.vapidKey = VAPID_KEY;
    console.log('[Firebase SW] VAPID Key configurée avec succès');
  } catch (error) {
    console.error('[Firebase SW] Erreur lors de la configuration de la VAPID Key:', error);
  }
}

// Gestionnaire de messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase SW] Message reçu en arrière-plan:', payload);
  
  // Extraire les données de la notification
  const notification = payload.notification || {};
  const data = payload.data || {};
  
  // Titre et corps par défaut
  const title = notification.title || 'Nouvelle notification';
  const body = notification.body || 'Vous avez reçu une nouvelle notification.';
  
  // Options pour la notification
  const options = {
    body: body,
    icon: notification.icon || '/images/icons/icon-192x192.png',
    badge: '/images/icons/badge-128x128.png',
    data: data,
    tag: data.threadId || data.taskId || `notification-${Date.now()}`,
    requireInteraction: true, // Garder la notification jusqu'à ce que l'utilisateur interagisse avec
    actions: [
      {
        action: 'view',
        title: 'Voir'
      }
    ]
  };
  
  // Afficher la notification
  return self.registration.showNotification(title, options);
});

// Gestionnaire pour recevoir des messages du client (page web)
self.addEventListener('message', (event) => {
  console.log('[Firebase SW] Message reçu du client:', event.data);
  
  // Si le message contient une clé VAPID, l'utiliser
  if (event.data && event.data.type === 'SET_VAPID_KEY' && event.data.vapidKey) {
    try {
      const vapidKey = event.data.vapidKey;
      console.log('[Firebase SW] Clé VAPID reçue du client:', vapidKey.substring(0, 10) + '...');
      
      // Mettre à jour la clé VAPID
      if (messaging && typeof messaging.getToken === 'function') {
        messaging.vapidKey = vapidKey;
        console.log('[Firebase SW] VAPID Key mise à jour depuis le client');
      }
    } catch (error) {
      console.error('[Firebase SW] Erreur lors de la mise à jour de la clé VAPID:', error);
    }
  }
});

// Gestionnaire de clic sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification cliquée:', event);
  
  // Fermer la notification
  event.notification.close();
  
  // Récupérer les données de la notification
  const data = event.notification.data || {};
  const taskId = data.taskId;
  const comunicationId = data.communicationId;
  
  // URL à ouvrir lorsque l'utilisateur clique sur la notification
  let url = '/notion-plan';
  
  // Si on a un ID de tâche, ajouter à l'URL
  if (taskId) {
    url = `/notion-plan?taskId=${taskId}`;
  }
  
  // Créer une promesse pour ouvrir l'URL
  const promiseChain = clients.openWindow(url);
  
  // Attendre que la promesse soit résolue avant de terminer l'événement
  event.waitUntil(promiseChain);
});

// Log de fin d'initialisation
console.log(`[Firebase SW] Service Worker v${SW_VERSION} initialisé avec succès`);

// Afficher un message lors de l'installation
self.addEventListener('install', (event) => {
  console.log(`[Firebase SW] Service Worker v${SW_VERSION} installé`);
  self.skipWaiting();
});

// Afficher un message lors de l'activation
self.addEventListener('activate', (event) => {
  console.log(`[Firebase SW] Service Worker v${SW_VERSION} activé`);
  return self.clients.claim();
}); 