// Firebase Messaging Service Worker
// Ce service worker gère la réception des notifications en arrière-plan

// Version du service worker - à incrémenter pour forcer la mise à jour
const SW_VERSION = 'v2.0.0';
console.log(`[Firebase Messaging SW] Initialisation (${SW_VERSION})`);

// Configuration Firebase (doit correspondre à celle du client)
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || 'AIzaSyA9AEJKD0Cf30LCrNbw9buhVMoiN_Mb1f4',
  authDomain: "etat-des-lieux-arthur-loyd.firebaseapp.com",
  projectId: "etat-des-lieux-arthur-loyd",
  storageBucket: "etat-des-lieux-arthur-loyd.firebasestorage.app",
  messagingSenderId: "602323147221",
  appId: "1:602323147221:web:7a1d976ac0478b593b455c"
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
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Initialiser l'application Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gérer les messages de notification en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase Messaging SW] Message reçu en arrière-plan:', payload);
  
  const notificationTitle = payload.notification.title || 'Nouvelle notification';
  const notificationOptions = {
    body: payload.notification.body || 'Vous avez une nouvelle notification',
    icon: '/icons/arthur-loyd-logo-192.png',
    badge: '/icons/arthur-loyd-badge-96.png',
    tag: payload.data && payload.data.taskId ? payload.data.taskId : 'notification',
    data: payload.data || {},
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Voir la tâche'
      }
    ]
  };
  
  // Ajouter des informations sur l'utilisateur à la notification
  if (userInfo.email) {
    console.log(`[Firebase Messaging SW] Ajout de l'email ${userInfo.email} aux données de notification`);
    notificationOptions.data.userEmail = userInfo.email;
  }
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer le clic sur une notification
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase Messaging SW] Clic sur notification:', event);
  
  event.notification.close();
  
  // Extraire les informations de la notification
  const taskId = event.notification.data && event.notification.data.taskId;
  const notificationType = event.notification.data && event.notification.data.type;
  
  // URL à ouvrir au clic
  let urlToOpen;
  
  if (taskId) {
    // Ouvrir la page de la tâche spécifique
    urlToOpen = `/notion-plan?taskId=${taskId}`;
  } else {
    // Ouvrir la page principale des tâches
    urlToOpen = '/notion-plan';
  }
  
  const urlToOpenWithOrigin = self.location.origin + urlToOpen;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Vérifier si une fenêtre existe déjà avec l'URL
      const existingClient = windowClients.find(
        (client) => client.url === urlToOpenWithOrigin && 'focus' in client
      );
      
      if (existingClient) {
        // Si un client existe, le mettre au premier plan
        return existingClient.focus();
      }
      
      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
}); 