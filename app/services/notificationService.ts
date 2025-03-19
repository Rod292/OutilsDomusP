import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { NOTIFICATION_CONFIG } from '../api/notifications/config';

const NOTIFICATION_COLLECTION = 'notifications';
const TOKEN_COLLECTION = 'notification_tokens';

// Fonction pour enregistrer une notification dans Firestore
export const createNotification = async (notification: {
  userId: string;
  title: string;
  body: string;
  type: 'task_assigned' | 'task_reminder' | 'system';
  taskId?: string;
  read: boolean;
}) => {
  try {
    const notificationsRef = collection(db, NOTIFICATION_COLLECTION);
    await addDoc(notificationsRef, {
      ...notification,
      createdAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la notification:', error);
    return false;
  }
};

// Fonction pour envoyer une notification directement via le navigateur
export const sendLocalNotification = async (notification: {
  title: string;
  body: string;
  icon?: string;
  data?: any;
}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    const { title, body, icon = '/images/logo_arthur_loyd.png', data = {} } = notification;
    const notif = new Notification(title, {
      body, 
      icon,
      badge: '/images/logo_arthur_loyd.png',
      data
    });
    
    notif.onclick = () => {
      const taskId = data?.taskId;
      window.open(taskId ? `/notion-plan?taskId=${taskId}` : '/notion-plan', '_blank');
    };
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de notification locale:', error);
    return false;
  }
};

// Fonction pour enregistrer le token de notification
export const saveNotificationToken = async (userId: string, token: string) => {
  try {
    // Extraire l'email de l'utilisateur et le consultant si présent dans userId
    let userEmail = userId;
    let consultant = null;
    
    if (userId.includes('_')) {
      const parts = userId.split('_');
      userEmail = parts[0];
      consultant = parts[1];
    }
    
    console.log(`Enregistrement du token pour l'utilisateur: ${userEmail}${consultant ? ` (consultant: ${consultant})` : ''}`);
    
    // Vérifier si le token existe déjà
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const q = query(tokensRef, 
      where('userId', '==', userId), 
      where('token', '==', token)
    );
    const snapshot = await getDocs(q);
    
    // Si le token n'existe pas, l'ajouter
    if (snapshot.empty) {
      await addDoc(tokensRef, {
        userId,
        userEmail,
        consultant,
        token,
        createdAt: Timestamp.now()
      });
      console.log('Token de notification enregistré pour l\'utilisateur:', userId);
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
  }
};

/**
 * Vérifie si un consultant spécifique a des notifications activées
 * @param userEmail Email de l'utilisateur connecté
 * @param consultant Nom du consultant à vérifier
 * @returns Promesse qui renvoie true si des tokens existent pour ce consultant
 */
export const checkConsultantPermission = async (userEmail: string, consultant: string): Promise<boolean> => {
  try {
    // Construire l'ID de notification (combinaison email_consultant)
    const notificationId = `${userEmail}_${consultant}`;
    
    // Vérifier si des tokens existent pour ce consultant
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const q = query(tokensRef, where('userId', '==', notificationId));
    const snapshot = await getDocs(q);
    
    // Si au moins un token existe, les notifications sont activées pour ce consultant
    return !snapshot.empty;
  } catch (error) {
    console.error(`Erreur lors de la vérification des permissions pour ${consultant}:`, error);
    return false;
  }
};

// Initialiser Firebase Messaging
export const initializeMessaging = async (userId: string) => {
  // Si les notifications FCM sont désactivées, retourner un "faux token" pour indiquer que ça a fonctionné
  if (!NOTIFICATION_CONFIG.USE_FCM) {
    console.log('Mode FCM désactivé, utilisation des notifications natives');
    return 'local-notifications-mode';
  }

  try {
    if (typeof window === 'undefined' || !window.navigator) {
      return null;
    }
    
    // Vérifier si le navigateur prend en charge les notifications
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne prend pas en charge les notifications web push');
      return null;
    }

    // Vérifier si Firebase est correctement initialisé
    if (!app) {
      console.error('Firebase n\'est pas initialisé');
      return null;
    }

    // Vérifier si la clé VAPID est disponible
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('Clé VAPID manquante. Elle est requise pour FCM.');
      console.log('Assurez-vous que NEXT_PUBLIC_FIREBASE_VAPID_KEY est définie dans .env.local');
      return null;
    }
    
    console.log('Initialisation de FCM avec clé VAPID (premiers caractères):', 
      vapidKey.substring(0, 5) + '...',
      'Longueur:', vapidKey.length);

    // Vérifier si la clé VAPID a le bon format (doit commencer par B)
    if (!vapidKey.startsWith('B')) {
      console.error('Format de clé VAPID incorrect. Elle doit commencer par "B".');
      console.log('Veuillez vérifier votre clé VAPID dans .env.local');
      return null;
    }

    const messaging = getMessaging(app);
    
    // Écouteur pour les messages au premier plan
    onMessage(messaging, (payload) => {
      console.log('Message reçu au premier plan:', payload);
      
      // Afficher la notification via l'API Notification du navigateur
      if (Notification.permission === 'granted' && payload.notification) {
        const { title, body } = payload.notification;
        const notificationOptions = {
          body,
          icon: '/images/logo_arthur_loyd.png',
          badge: '/images/logo_arthur_loyd.png',
          data: payload.data
        };
        
        const notification = new Notification(title || 'Nouvelle notification', notificationOptions);
        
        // Ajouter un gestionnaire de clic
        notification.onclick = () => {
          const taskId = payload.data?.taskId;
          window.open(taskId ? `/notion-plan?taskId=${taskId}` : '/notion-plan', '_blank');
        };
      }
    });

    // Vérifier d'abord si le Service Worker est enregistré
    const serviceWorkerReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (!serviceWorkerReg) {
      console.error('Service Worker non trouvé. Tentative d\'enregistrement...');
      try {
        const newReg = await registerServiceWorker();
        if (!newReg) {
          console.error('Échec de l\'enregistrement du Service Worker');
          // Utiliser les notifications natives comme fallback
          return 'local-notifications-mode';
        }
        console.log('Service Worker enregistré avec succès:', newReg);
      } catch (swError) {
        console.error('Erreur lors de l\'enregistrement du Service Worker:', swError);
        // Utiliser les notifications natives comme fallback
        return 'local-notifications-mode';
      }
    } else {
      console.log('Service Worker trouvé:', serviceWorkerReg);
    }
    
    console.log('Demande du token FCM avec la clé VAPID (partielle):', vapidKey.substring(0, 5) + '...');
    
    // Demander la permission et obtenir le token
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      });

      if (currentToken) {
        console.log('Token FCM obtenu (premiers caractères):', 
          currentToken.substring(0, 10) + '...');
          
        // Enregistrer le token dans Firestore
        await saveNotificationToken(userId, currentToken);
        return currentToken;
      } else {
        console.log('Aucun token d\'inscription disponible. Demander la permission pour générer un token.');
        // Utiliser les notifications natives comme fallback
        return 'local-notifications-mode';
      }
    } catch (tokenError: any) {
      console.error('Erreur spécifique lors de la récupération du token:', tokenError);
      // Ajouter des informations de débogage plus détaillées
      if (tokenError.toString().includes('messaging/permission-blocked')) {
        console.log('Les notifications sont bloquées par l\'utilisateur');
      } else if (tokenError.toString().includes('messaging/token-subscribe-failed')) {
        console.log('Échec de l\'inscription - probablement un problème avec la clé VAPID ou le service worker');
        console.log('Vérifiez que l\'API Cloud Messaging est activée dans votre console Firebase.');
      }
      // Utiliser les notifications natives comme fallback
      return 'local-notifications-mode';
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Firebase Messaging:', error);
    // Utiliser les notifications natives comme fallback
    return 'local-notifications-mode';
  }
};

/**
 * Force l'enregistrement du service worker si nécessaire
 * @returns Promesse qui renvoie l'enregistrement du service worker ou null
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  try {
    if (typeof window === 'undefined' || !window.navigator || !navigator.serviceWorker) {
      console.error('Service Worker non supporté dans ce navigateur');
      return null;
    }
    
    // Vérifier si le service worker est déjà enregistré
    const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (existingReg) {
      console.log('Service Worker déjà enregistré:', existingReg);
      return existingReg;
    }
    
    console.log('Tentative d\'enregistrement du Service Worker...');
    
    // Enregistrer le service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker enregistré avec succès:', registration);
    return registration;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
    return null;
  }
};

// Modifier la fonction requestNotificationPermission pour utiliser registerServiceWorker
export const requestNotificationPermission = async (userId: string): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne prend pas en charge les notifications');
      return false;
    }
    
    // Si la permission est déjà accordée
    if (Notification.permission === 'granted') {
      // Si FCM est désactivé, on simule un succès avec les notifications natives
      if (!NOTIFICATION_CONFIG.USE_FCM) {
        // Enregistrer que l'utilisateur a accepté les notifications pour ce consultant
        const fakeToken = `local-token-${Date.now()}`;
        await saveNotificationToken(userId, fakeToken);
        return true;
      }
      
      // Initialiser les notifications
      const result = await initializeMessaging(userId);
      
      // Si on est en mode notifications locales, simuler un succès
      if (result === 'local-notifications-mode') {
        // Enregistrer que l'utilisateur a accepté les notifications pour ce consultant
        const fakeToken = `local-token-${Date.now()}`;
        await saveNotificationToken(userId, fakeToken);
        return true;
      }
      
      return !!result;
    }
    
    // Si la permission est refusée définitivement
    if (Notification.permission === 'denied') {
      console.warn('L\'utilisateur a refusé la permission pour les notifications');
      return false;
    }
    
    // S'assurer que le service worker est enregistré
    await registerServiceWorker();
    
    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Si FCM est désactivé, on simule un succès avec les notifications natives
      if (!NOTIFICATION_CONFIG.USE_FCM) {
        // Enregistrer que l'utilisateur a accepté les notifications pour ce consultant
        const fakeToken = `local-token-${Date.now()}`;
        await saveNotificationToken(userId, fakeToken);
        return true;
      }
      
      // Initialiser les notifications
      const result = await initializeMessaging(userId);
      
      // Si on est en mode notifications locales, simuler un succès
      if (result === 'local-notifications-mode') {
        // Enregistrer que l'utilisateur a accepté les notifications pour ce consultant
        const fakeToken = `local-token-${Date.now()}`;
        await saveNotificationToken(userId, fakeToken);
        return true;
      }
      
      return !!result;
    }
    
    return false;
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
};

// Fonction pour journaliser l'état des permissions de notification
export const logNotificationPermissionStatus = () => {
  if (typeof window === 'undefined') {
    return 'server-side';
  }
  
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  
  return Notification.permission;
}; 