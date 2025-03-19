import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { NOTIFICATION_CONFIG } from '../api/notifications/config';
import { getFirestore } from 'firebase/firestore';

const NOTIFICATION_COLLECTION = 'notifications';
const TOKEN_COLLECTION = 'notification_tokens';

/**
 * Enregistre une notification dans la base de données
 * @param notification Notification à enregistrer
 * @returns Promise<void>
 */
export const createNotification = async (notification: {
  userId: string;
  title: string;
  body: string;
  type: string;
  taskId?: string;
  read: boolean;
}): Promise<void> => {
  try {
    // Vérifier si les paramètres requis sont présents
    if (!notification.userId || !notification.title || !notification.body) {
      throw new Error('Paramètres requis manquants pour l\'enregistrement de la notification');
    }

    // Utilisez getFirestore() qui retourne l'instance correcte de Firestore
    const firestore = getFirestore();
    
    // Créer la notification dans Firestore avec le timestamp du serveur
    await addDoc(collection(firestore, 'notifications'), {
      ...notification,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`Notification enregistrée dans Firestore pour ${notification.userId}`);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la notification:', error);
    throw error;
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

/**
 * Enregistre le token de notification pour un utilisateur
 * @param userId Identifiant de l'utilisateur (email_consultant)
 * @param token Token de notification
 * @returns Promise<boolean> True si le token a été enregistré avec succès
 */
export const saveNotificationToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    if (!userId || !token) {
      console.error('ID utilisateur ou token manquant:', { userId, token });
      return false;
    }

    console.log(`Enregistrement du token pour l'utilisateur: ${userId}`);
    
    // Vérifier si ce token existe déjà pour cet utilisateur
    const db = getFirestore();
    const tokensRef = collection(db, 'notificationTokens');
    const q = query(tokensRef, 
      where('userId', '==', userId),
      where('token', '==', token)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Si le token existe déjà, mettre à jour le timestamp
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        timestamp: Date.now(),
        lastUpdated: serverTimestamp()
      });
      console.log(`Token existant mis à jour pour l'utilisateur: ${userId}`);
      return true;
    }
    
    // Sinon, créer un nouveau document pour ce token
    const tokenData = {
      userId,
      token,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      // Extraire l'email et le consultant depuis userId (format: email_consultant)
      consultant: userId.includes('_') ? userId.split('_')[1] : null,
      email: userId.includes('_') ? userId.split('_')[0] : userId
    };
    
    await addDoc(tokensRef, tokenData);
    console.log(`Token de notification enregistré pour l'utilisateur: ${userId}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
    return false;
  }
};

/**
 * Vérifie si un consultant a les notifications activées
 * @param userEmail Email de l'utilisateur
 * @param consultantName Nom du consultant
 * @returns Promise<boolean> True si les notifications sont activées
 */
export const checkConsultantPermission = async (userEmail: string, consultantName: string): Promise<boolean> => {
  try {
    if (!userEmail || !consultantName) {
      return false;
    }
    
    // Construire l'identifiant utilisateur
    const userId = `${userEmail}_${consultantName}`;
    
    // Vérifier si les notifications du navigateur sont autorisées
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return false;
    }
    
    // Vérifier si le token existe dans Firestore
    const db = getFirestore();
    const tokensRef = collection(db, 'notificationTokens');
    const q = query(tokensRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    // Vérifier si le token est valide (pas vide ou null)
    let hasValidToken = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token && data.token !== 'null' && data.token !== 'undefined' && 
          data.token !== 'local-notifications-mode' && 
          data.timestamp && (Date.now() - data.timestamp) < 30 * 24 * 60 * 60 * 1000) { // Token de moins de 30 jours
        hasValidToken = true;
      }
    });
    
    return hasValidToken;
  } catch (error) {
    console.error("Erreur lors de la vérification des permissions:", error);
    return false;
  }
};

/**
 * Initialise Firebase Messaging et gère les permissions de notification
 * @param userId Identifiant de l'utilisateur pour lequel activer les notifications
 * @returns Promise<string|null> Token FCM ou null en cas d'erreur
 */
export const initializeMessaging = async (userId: string): Promise<string | null> => {
  try {
    console.log('Tentative d\'initialisation de Firebase Messaging...');
    
    // Si FCM est désactivé, utiliser le mode local
    if (!NOTIFICATION_CONFIG.USE_FCM) {
      console.log('Mode FCM désactivé, utilisation des notifications locales.');
      await saveNotificationToken(userId, 'local-notifications-mode');
      return 'local-notifications-mode';
    }
    
    // Vérifier si Firebase est disponible (côté client)
    if (typeof window === 'undefined') {
      console.error('Impossible d\'initialiser Firebase Messaging côté serveur.');
      return null;
    }
    
    // Tentative d'enregistrement du Service Worker
    console.log('Tentative d\'enregistrement du Service Worker...');
    
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker n\'est pas supporté sur ce navigateur.');
      return null;
    }
    
    // Enregistrer le service worker
    let swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker enregistré avec succès:', swRegistration);
    } catch (swError) {
      console.error('Erreur lors de l\'enregistrement du Service Worker:', swError);
      
      // Fallback au mode local si le service worker ne peut pas être enregistré
      console.log('Utilisation des notifications locales suite à l\'erreur de Service Worker.');
      await saveNotificationToken(userId, 'local-notifications-mode');
      return 'local-notifications-mode';
    }
    
    try {
      // Importer dynamiquement Firebase/messaging
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { app } = await import('../lib/firebase');

      // Vérifier si l'app Firebase a été correctement importée
      if (!app) {
        console.error('Application Firebase non disponible');
        await saveNotificationToken(userId, 'local-notifications-mode');
        return 'local-notifications-mode';
      }
      
      const messaging = getMessaging(app);
      
      // Obtenir le token VAPID de l'environnement
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      
      if (!vapidKey) {
        console.error('Clé VAPID manquante, impossible d\'initialiser Firebase Messaging');
        
        // Fallback au mode local si la VAPID key est manquante
        console.log('Utilisation des notifications locales - VAPID key manquante.');
        await saveNotificationToken(userId, 'local-notifications-mode');
        return 'local-notifications-mode';
      }
      
      // Demander le token FCM pour l'utilisateur
      console.log('Demande de token FCM avec VAPID key...');
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration
      });
      
      if (!token) {
        console.error('Échec de l\'obtention du token FCM');
        
        // Fallback au mode local si le token est vide
        console.log('Utilisation des notifications locales - Token FCM vide.');
        await saveNotificationToken(userId, 'local-notifications-mode');
        return 'local-notifications-mode';
      }
      
      // Enregistrer le token dans Firestore
      console.log('Token FCM obtenu, enregistrement...');
      const success = await saveNotificationToken(userId, token);
      
      if (!success) {
        console.error('Échec de l\'enregistrement du token FCM dans Firestore');
        return null;
      }
      
      return token;
    } catch (fcmError) {
      console.error('Erreur lors de l\'initialisation de Firebase Messaging:', fcmError);
      
      // Fallback au mode local en cas d'erreur
      console.log('Utilisation des notifications locales suite à une erreur FCM.');
      await saveNotificationToken(userId, 'local-notifications-mode');
      return 'local-notifications-mode';
    }
  } catch (error) {
    console.error('Erreur globale lors de l\'initialisation des notifications:', error);
    return null;
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