// Service worker pour les notifications Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuration Firebase
firebase.initializeApp({
  apiKey: "AIzaSyDujTJIyvicJnP-nMgodJs63rU0fDA69Qc",
  authDomain: "etat-des-lieux-arthur-loyd.firebaseapp.com",
  projectId: "etat-des-lieux-arthur-loyd",
  storageBucket: "etat-des-lieux-arthur-loyd.firebasestorage.app",
  messagingSenderId: "602323147221",
  appId: "1:602323147221:web:7a1d976ac0478b593b455c"
});

// Log pour confirmer que le service worker est chargé
console.log('[firebase-messaging-sw.js] Service Worker initialisé - version 1.1');

// Initialisation de Firebase Messaging
const messaging = firebase.messaging();

// Gestionnaire pour les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan:', payload);

  // Extraire les informations de notification
  const notificationTitle = payload.notification?.title || 'Nouvelle notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/images/logo_arthur_loyd.png',
    badge: '/images/logo_arthur_loyd.png',
    data: payload.data
  };

  // Afficher la notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestionnaire pour les clics sur les notifications
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification cliquée:', event);
  
  // Fermer la notification
  event.notification.close();
  
  // Récupérer les données associées à la notification
  const taskId = event.notification.data?.taskId;
  
  // URL vers laquelle rediriger l'utilisateur
  const urlToOpen = taskId 
    ? `/notion-plan?taskId=${taskId}` 
    : '/notion-plan';
    
  // Ouvrir l'URL
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

// Événement d'installation du service worker
self.addEventListener('install', event => {
  console.log('[firebase-messaging-sw.js] Service Worker installé');
  self.skipWaiting(); // Forcer l'activation immédiate
});

// Événement d'activation du service worker
self.addEventListener('activate', event => {
  console.log('[firebase-messaging-sw.js] Service Worker activé');
  return self.clients.claim(); // Prendre le contrôle de tous les clients
}); 