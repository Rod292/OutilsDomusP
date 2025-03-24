// Firebase Messaging Service Worker
// Ce service worker gère la réception des notifications en arrière-plan

// Version du service worker - à incrémenter pour forcer la mise à jour
const SW_VERSION = 'v2.0.0';
console.log(`[Firebase Messaging SW] Initialisation (${SW_VERSION})`);

// Configuration Firebase (doit correspondre à celle du client)
const firebaseConfig = {
  apiKey: 'AIzaSyDujTJIyvicJnP-nMgodJs63rU0fDA69Qc',
  authDomain: 'etat-des-lieux-arthur-loyd.firebaseapp.com',
  projectId: 'etat-des-lieux-arthur-loyd',
  storageBucket: 'etat-des-lieux-arthur-loyd.firebasestorage.app',
  messagingSenderId: '602323147221',
  appId: '1:602323147221:web:7a1d976ac0478b593b455c',
};

// Cache pour stocker les informations utilisateur
let userInfo = {
  email: null,
  lastUpdated: null
};

self.addEventListener('install', (event) => {
  console.log('[Firebase Messaging SW] Service Worker installé');
  
  // Activer immédiatement le nouveau service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Firebase Messaging SW] Service Worker activé');
  
  // Prendre le contrôle immédiatement des clients
  event.waitUntil(clients.claim());
  
  // Essayer de récupérer l'email depuis le localStorage
  event.waitUntil(
    (async () => {
      try {
        const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
        if (allClients.length > 0) {
          console.log(`[Firebase Messaging SW] ${allClients.length} clients trouvés`);
          
          // Demander l'email à tous les clients
          allClients.forEach(client => {
            client.postMessage({
              type: 'GET_USER_EMAIL'
            });
          });
        }
      } catch (error) {
        console.error('[Firebase Messaging SW] Erreur lors de la récupération des clients:', error);
      }
    })()
  );
});

// Écouter les messages du client
self.addEventListener('message', (event) => {
  console.log('[Firebase Messaging SW] Message reçu du client:', event.data);
  
  if (event.data && event.data.type === 'STORE_USER_EMAIL' && event.data.email) {
    userInfo = {
      email: event.data.email,
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`[Firebase Messaging SW] Email utilisateur stocké: ${userInfo.email}`);
  }
});

// Importer les scripts Firebase dynamiquement lorsque Firebase Messaging est nécessaire
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

// Initialiser l'application Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gérer les messages de notification en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase Messaging SW] Message reçu en arrière-plan:', payload);
  
  // Personnaliser la notification pour qu'elle apparaisse même lorsque l'application est en arrière-plan
  const notificationTitle = payload.notification?.title || 'Arthur Loyd';
  const notificationOptions = {
    body: payload.notification?.body || 'Nouvelle notification',
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data,
    tag: payload.data?.notificationId || 'default-tag', // Utiliser un tag pour regrouper les notifications
    actions: [
      { action: 'view', title: 'Voir' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  
  // Afficher la notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer le clic sur une notification
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase Messaging SW] Notification cliquée:', event);
  
  event.notification.close();
  
  // Gérer l'action spécifique
  if (event.action === 'view') {
    // Rediriger vers l'application avec les données
    const notificationData = event.notification.data;
    let url = '/';
    
    // Rediriger vers la page appropriée en fonction du type de notification
    if (notificationData?.taskId) {
      url = `/notion-plan?taskId=${notificationData.taskId}`;
      
      // Si c'est une communication spécifique
      if (notificationData?.communicationIndex !== undefined) {
        url += `&communicationIndex=${notificationData.communicationIndex}`;
      }
    }
    
    // Ouvrir ou focaliser sur la fenêtre existante
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Vérifier si une fenêtre est déjà ouverte
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Si aucune fenêtre n'est ouverte, en ouvrir une nouvelle
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
}); 