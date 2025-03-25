// Ce fichier est créé pour séparer les fonctions côté client de celles côté serveur
// pour éviter des erreurs d'importation de firebase-admin côté client

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Timestamp } from 'firebase/firestore';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, serverTimestamp, Firestore, deleteDoc, doc } from 'firebase/firestore';
import { clientApp } from '../api/client-config';
import { initializeFirebase } from '../services/firebase';

// Configuration des notifications
export const NOTIFICATION_CONFIG = {
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  USE_FCM: process.env.NEXT_PUBLIC_USE_FCM !== 'false',
  MESSAGES: {
    taskAssigned: 'Vous avez une nouvelle tâche assignée',
    communicationAssigned: 'Vous avez une nouvelle communication assignée',
    reminderSent: 'Rappel: vous avez une tâche à compléter',
    ACTIVATED: 'Notifications activées pour'
  }
};

const NOTIFICATION_COLLECTION = 'notifications';
const TOKEN_COLLECTION = 'notificationTokens';

/**
 * Enregistre un token de notification dans Firestore
 * @param userId Identifiant de l'utilisateur
 * @param token Token FCM
 * @returns Promise<boolean> True si l'enregistrement est réussi
 */
export const saveNotificationToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      console.error('Impossible d\'enregistrer un token côté serveur');
      return false;
    }
    
    console.log(`Enregistrement du token FCM pour ${userId}...`);
    
    // Vérifier que userId est valide
    if (!userId) {
      console.error('ID utilisateur manquant pour l\'enregistrement du token');
      return false;
    }
    
    // Récupérer l'email à partir de l'identifiant
    const [email, consultant] = userId.split('_');
    
    // Obtenir le consultant depuis l'URL (pour permettre la réception des notifications de différents consultants)
    const urlParams = new URLSearchParams(window.location.search);
    const urlConsultant = urlParams.get('consultant');
    
    // Obtenir une instance Firestore
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non disponible');
      return false;
    }
    
    // Vérifier si le token existe déjà pour cet utilisateur
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const q = query(
      tokensRef,
      where('userId', '==', userId),
      where('token', '==', token)
    );
    
    const snapshot = await getDocs(q);
    
    // Si le token existe déjà, mise à jour du timestamp
    if (!snapshot.empty) {
      console.log('Token existant, mise à jour du timestamp...');
      
      const docId = snapshot.docs[0].id;
      await updateDoc(doc(db, TOKEN_COLLECTION, docId), {
        timestamp: Date.now(),
        lastActive: serverTimestamp()
      });
      
      return true;
    }
    
    // Enregistrer le nouveau token avec des métadonnées
    const tokenData = {
      userId,
      email,
      consultant,
      urlConsultant,  // Ajouter le consultant de l'URL comme métadonnée
      token,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    };
    
    // Ajouter le document à la collection
    await addDoc(collection(db, TOKEN_COLLECTION), tokenData);
    
    console.log(`Token FCM enregistré avec succès pour ${userId}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token FCM:', error);
    return false;
  }
};

/**
 * Enregistre le service worker pour Firebase Cloud Messaging
 * @returns Promise<ServiceWorkerRegistration | null> L'enregistrement du service worker ou null en cas d'erreur
 */
export const registerFCMServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    console.error('Les Service Workers ne sont pas supportés dans ce navigateur');
    return null;
  }

  try {
    console.log('Tentative d\'enregistrement du Service Worker pour FCM...');
    
    // Vérifier si le service worker est déjà enregistré
    const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (existingReg && existingReg.active) {
      console.log('Service Worker pour FCM déjà enregistré:', existingReg);
      return existingReg;
    }
    
    // Enregistrer le service worker
    console.log('Enregistrement du Service Worker pour FCM...');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    
    // Attendre que le service worker soit activé
    if (registration.installing) {
      console.log('Service Worker pour FCM en cours d\'installation...');
      
      // Attendre que l'installation soit terminée
      await new Promise<void>((resolve) => {
        registration.installing?.addEventListener('statechange', (event) => {
          if ((event.target as ServiceWorker).state === 'activated') {
            console.log('Service Worker pour FCM activé');
            resolve();
          }
        });
      });
    }
    
    console.log('Service Worker pour FCM enregistré avec succès');
    return registration;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du Service Worker pour FCM:', error);
    return null;
  }
};

/**
 * Récupère un token FCM en utilisant le service worker
 * @param userId Identifiant de l'utilisateur
 * @returns Promise<string | null> Token FCM ou null en cas d'erreur
 */
export const getFCMToken = async (userId: string): Promise<string | null> => {
  try {
    if (typeof window === 'undefined') {
      console.error('Impossible d\'obtenir un token FCM côté serveur');
      return null;
    }
    
    console.log(`Tentative d'obtention de token FCM pour ${userId}...`);
    
    // Vérifier que Firebase est initialisé
    if (!clientApp) {
      console.error('Firebase n\'est pas initialisé');
      return null;
    }
    
    // Enregistrer le service worker
    const swRegistration = await registerFCMServiceWorker();
    if (!swRegistration) {
      console.error('Service Worker non enregistré, impossible d\'obtenir un token FCM');
      return null;
    }
    
    // Initialiser Firebase Messaging
    const messaging = getMessaging(clientApp);
    if (!messaging) {
      console.error('Firebase Messaging non disponible');
      return null;
    }
    
    // Vérifier la présence de la VAPID key
    if (!NOTIFICATION_CONFIG.vapidKey) {
      console.error('VAPID key manquante dans la configuration');
      return null;
    }
    
    console.log(`Demande de token FCM avec la VAPID key: ${NOTIFICATION_CONFIG.vapidKey.substring(0, 10)}...`);
    
    // Obtenir le token
    const token = await getToken(messaging, {
      vapidKey: NOTIFICATION_CONFIG.vapidKey,
      serviceWorkerRegistration: swRegistration
    });
    
    if (!token) {
      console.error('Aucun token FCM obtenu');
      return null;
    }
    
    console.log(`Token FCM obtenu: ${token.substring(0, 10)}...`);
    
    // Enregistrer le token dans la base de données
    const success = await saveNotificationToken(userId, token);
    if (!success) {
      console.error('Échec de l\'enregistrement du token FCM dans la base de données');
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token FCM:', error);
    return null;
  }
};

/**
 * Demande la permission pour les notifications et enregistre un token FCM
 * @param userId Identifiant de l'utilisateur
 * @returns Promise<boolean> True si la permission est accordée et le token est enregistré
 */
export const requestNotificationPermission = async (userId: string): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      console.error('Impossible de demander des permissions côté serveur');
      return false;
    }

    if (!('Notification' in window)) {
      console.error('Les notifications ne sont pas supportées dans ce navigateur');
      return false;
    }

    // Vérifier si userId est valide
    if (!userId) {
      console.error('ID utilisateur manquant pour la demande de permission');
      return false;
    }

    console.log(`Demande de permission de notification pour ${userId}...`);

    // Vérifier le statut actuel
    const currentPermission = Notification.permission;
    console.log(`Statut actuel des permissions: ${currentPermission}`);
    
    // Si les notifications sont bloquées, ouvrir les paramètres de notification du navigateur
    if (currentPermission === 'denied') {
      console.log('Les notifications sont bloquées par le navigateur');
      
      // Afficher un message à l'utilisateur
      alert('Les notifications sont bloquées dans votre navigateur. Veuillez les autoriser dans les paramètres de votre navigateur puis réessayer.');
      
      // Essayer d'ouvrir les paramètres (fonctionne sur Chrome)
      try {
        if (navigator.userAgent.includes('Chrome')) {
          window.open('chrome://settings/content/notifications', '_blank');
        } else {
          // Pour Firefox et autres navigateurs
          window.open('/help/notifications', '_blank');
        }
      } catch (error) {
        console.warn('Impossible d\'ouvrir les paramètres automatiquement:', error);
      }
      
      return false;
    }

    // Vérifier si les notifications sont déjà autorisées
    if (currentPermission !== 'granted') {
      console.log('Demande de permission de notification au navigateur...');
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.error('Permission de notification refusée par l\'utilisateur');
        return false;
      }
      
      console.log('Permission de notification accordée!');
    } else {
      console.log('Les notifications sont déjà autorisées');
    }

    // Essayer d'obtenir un token FCM
    let token = null;
    if (NOTIFICATION_CONFIG.USE_FCM) {
      console.log('Tentative d\'obtention d\'un token FCM...');
      token = await getFCMToken(userId);
    }

    // Si aucun token FCM obtenu, utiliser un token local
    if (!token) {
      console.log('Utilisation d\'un token local comme solution de repli');
      token = 'local-notifications-mode';
      
      // Enregistrer le token local
      await saveNotificationToken(userId, token);
      
      // Envoyer une notification locale de confirmation
      try {
        await sendLocalNotification({
          title: `${NOTIFICATION_CONFIG.MESSAGES.ACTIVATED} ${userId.split('_')[1] || ''}`,
          body: 'Vous recevrez des notifications pour les nouvelles tâches assignées.',
          data: { userId, type: 'system' }
        });
      } catch (error) {
        console.warn('Erreur lors de l\'envoi de la notification de confirmation:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la demande de permission de notification:', error);
    return false;
  }
};

/**
 * Vérifie l'état réel des permissions de notification dans le navigateur
 * et tente de détecter les incohérences
 * @returns Le statut réel des notifications
 */
export const checkRealNotificationPermission = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    return 'server-side';
  }
  
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  
  // Essayer de demander une permission pour détecter si le navigateur est réellement bloqué
  if (Notification.permission === 'default') {
    try {
      // Demander la permission uniquement pour vérifier, sans afficher la boîte de dialogue
      // Cette technique permet de détecter si le site est bloqué dans les paramètres du navigateur
      // même si l'API indique 'default'
      const testRequest = await navigator.permissions.query({ name: 'notifications' as PermissionName });
      if (testRequest.state === 'denied') {
        return 'denied';
      }
    } catch (error) {
      console.warn('Impossible de vérifier les permissions avancées:', error);
    }
  }
  
  return Notification.permission;
};

/**
 * Envoie une notification locale à l'utilisateur
 * @param notification Détails de la notification à envoyer
 * @returns Promise<boolean> True si la notification a été envoyée avec succès
 */
export const sendLocalNotification = async (notification: {
  title: string;
  body: string;
  icon?: string;
  data?: any;
}): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      console.error('Impossible d\'envoyer une notification côté serveur');
      return false;
    }

    if (!('Notification' in window)) {
      console.error('Les notifications ne sont pas supportées dans ce navigateur');
      return false;
    }

    // Vérifier si les notifications sont autorisées
    if (Notification.permission !== 'granted') {
      console.error('Permission de notification non accordée');
      return false;
    }

    // Utiliser le service worker si disponible
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      try {
        console.log('Tentative d\'envoi de notification via Service Worker...');
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.showNotification) {
          await registration.showNotification(notification.title, {
            body: notification.body,
            icon: notification.icon || '/images/icons/icon-192x192.png',
            data: notification.data || {},
            badge: '/images/icons/badge-128x128.png',
            tag: 'notification-' + Date.now(),
            requireInteraction: true
          });
          console.log('Notification envoyée via Service Worker');
          return true;
        }
      } catch (error) {
        console.warn('Erreur lors de l\'envoi de notification via Service Worker:', error);
        // Continuer pour essayer l'API Notification standard
      }
    }

    // Utiliser l'API Notification standard comme solution de repli
    console.log('Envoi de notification via l\'API Notification standard...');
    const notif = new Notification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/images/icons/icon-192x192.png',
      data: notification.data || {}
    });

    notif.onclick = (event) => {
      event.preventDefault();
      console.log('Notification cliquée:', notification);
      window.focus();
      notif.close();
    };

    notif.onerror = (error) => {
      console.error('Erreur de notification:', error);
    };

    console.log('Notification standard envoyée');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification locale:', error);
    return false;
  }
};

/**
 * Vérifie si un utilisateur a activé les notifications pour un consultant spécifique
 * @param userEmail Email de l'utilisateur qui a activé la notification
 * @param consultantName Nom du consultant pour lequel les notifications sont activées
 * @returns Promise<boolean> True si les notifications sont activées
 */
export const checkConsultantPermission = async (userEmail: string, consultantName: string): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    if (!userEmail || !consultantName) {
      console.error('Email utilisateur ou nom consultant manquant');
      return false;
    }

    // Vérifier d'abord le statut réel des permissions dans le navigateur
    const realPermission = await checkRealNotificationPermission();
    if (realPermission === 'denied') {
      console.log('Les notifications sont bloquées par le navigateur');
      return false;
    }

    // Construire l'identifiant de notification (email_consultant)
    const notificationId = `${userEmail}_${consultantName}`;
    console.log(`Vérification des permissions pour: ${notificationId}`);
    
    // Appeler l'API pour vérifier les permissions
    try {
      const response = await fetch(`/api/notifications/check-permission?userEmail=${encodeURIComponent(userEmail)}&consultantName=${encodeURIComponent(consultantName)}`);
      
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      return result.hasPermission === true;
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    return false;
  }
};

/**
 * Nettoie les tokens dupliqués pour un utilisateur donné
 * Ne garde que le token le plus récent pour chaque appareil Apple
 * @param userId Identifiant de l'utilisateur pour lequel nettoyer les tokens
 * @returns Promise<number> Nombre de tokens supprimés
 */
export const cleanupDuplicateTokens = async (userId: string): Promise<number> => {
  try {
    if (typeof window === 'undefined') {
      console.log('Impossible de nettoyer les tokens côté serveur');
      return 0;
    }
    
    console.log(`Nettoyage des tokens dupliqués pour l'utilisateur ${userId}...`);
    
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non initialisé');
      return 0;
    }
    
    // Récupérer tous les tokens de l'utilisateur
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const q = query(tokensRef, where('email', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`Aucun token trouvé pour l'utilisateur ${userId}`);
      return 0;
    }
    
    // Mapper les tokens par plateforme
    const tokensByPlatform: Record<string, {id: string, timestamp: number, isApple: boolean}[]> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const userAgent = (data.userAgent || '').toLowerCase();
      const platform = data.platform || 'unknown';
      
      // Déterminer si c'est un appareil Apple
      const isApple = userAgent.includes('iphone') || 
                       userAgent.includes('ipad') || 
                       userAgent.includes('macintosh') ||
                       platform.toLowerCase().includes('iphone') ||
                       platform.toLowerCase().includes('ipad') ||
                       platform.toLowerCase().includes('mac');
      
      // Utiliser une clé simplifiée pour regrouper les appareils similaires
      let deviceKey = 'other';
      if (userAgent.includes('iphone')) deviceKey = 'iphone';
      else if (userAgent.includes('ipad')) deviceKey = 'ipad';
      else if (userAgent.includes('macintosh')) deviceKey = 'mac';
      else if (userAgent.includes('android')) deviceKey = 'android';
      
      if (!tokensByPlatform[deviceKey]) {
        tokensByPlatform[deviceKey] = [];
      }
      
      tokensByPlatform[deviceKey].push({
        id: doc.id,
        timestamp: data.timestamp || 0,
        isApple
      });
    });
    
    // Pour chaque plateforme, garder uniquement le token le plus récent
    const tokensToDelete: string[] = [];
    
    Object.keys(tokensByPlatform).forEach(platform => {
      const tokens = tokensByPlatform[platform];
      
      // Trier par timestamp décroissant (le plus récent d'abord)
      tokens.sort((a, b) => b.timestamp - a.timestamp);
      
      // Garder le premier (plus récent) et marquer les autres pour suppression
      if (tokens.length > 1) {
        // Garder uniquement le token le plus récent
        const tokensToRemove = tokens.slice(1);
        tokensToRemove.forEach(token => {
          tokensToDelete.push(token.id);
        });
      }
    });
    
    // Supprimer les tokens marqués
    let deletedCount = 0;
    for (const tokenId of tokensToDelete) {
      try {
        await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId));
        deletedCount++;
      } catch (error) {
        console.error(`Erreur lors de la suppression du token ${tokenId}:`, error);
      }
    }
    
    console.log(`${deletedCount} token(s) dupliqué(s) supprimé(s) pour l'utilisateur ${userId}`);
    return deletedCount;
  } catch (error) {
    console.error('Erreur lors du nettoyage des tokens dupliqués:', error);
    return 0;
  }
};

/**
 * Envoie une notification pour une tâche assignée à un consultant
 * @param params Paramètres de la notification
 * @returns Promise<boolean> true si la notification est envoyée avec succès
 */
export const sendTaskAssignedNotification = async (params: {
  userId: string;
  title: string;
  body: string;
  taskId: string;
  isCommunication?: boolean;
  communicationIndex?: number;
  recipientEmail: string;
}): Promise<boolean> => {
  try {
    // Vérifier si nous sommes côté client
    if (typeof window === 'undefined') {
      console.log('Impossible d\'envoyer une notification côté serveur');
      return false;
    }

    // Vérifier les paramètres essentiels de manière plus flexible
    // Auparavant nous vérifions tous les paramètres, mais certains peuvent être omis selon le contexte
    if (!params.taskId) {
      console.error('ID de tâche manquant pour l\'envoi de notification');
      return false;
    }
    
    // Utiliser des valeurs par défaut pour les champs manquants
    const userId = params.userId || '';
    const title = params.title || 'Nouvelle notification';
    const body = params.body || 'Vous avez une nouvelle notification';
    const notificationType = params.isCommunication ? "communication_assigned" : "task_assigned";
    
    // Log plus détaillé des paramètres reçus pour le débogage
    console.log(`Préparation notification - Paramètres reçus:`, {
      userId,
      taskId: params.taskId,
      isCommunication: params.isCommunication,
      communicationIndex: params.communicationIndex,
      recipientEmail: params.recipientEmail,
      title,
      body
    });
    
    // Construction des données pour l'API
    const notificationData = {
      userId,
      title,
      body,
      type: notificationType,
      taskId: params.taskId,
      communicationIndex: params.communicationIndex,
      mode: 'FCM' // Force l'utilisation de Firebase Cloud Messaging
    };

    console.log(`Envoi de notification avec données:`, notificationData);
    
    try {
      // Utiliser une URL relative pour éviter les problèmes de domaine
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      // Afficher les détails de la réponse pour le débogage
      console.log(`Réponse API notifications/send:`, {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        console.error(`Erreur API de notification: ${response.status} - ${response.statusText}`);
        return false;
      }
      
      const result = await response.json();
      console.log('Résultat de l\'envoi de notification:', result);
      
      // Vérifier si le service FCM a échoué à envoyer la notification même si l'API a réussi
      if (result.success === true && result.sent === 0 && result.failed > 0) {
        console.log('FCM a échoué à envoyer la notification, utilisation du mode local comme solution de repli');
        
        // Envoyer une notification locale en cas d'échec FCM
        try {
          await sendLocalNotification({
            title,
            body,
            data: {
              userId,
              taskId: params.taskId,
              type: notificationType
            }
          });
          console.log('Notification locale envoyée avec succès comme solution de repli');
        } catch (localError) {
          console.warn('Échec de l\'envoi de notification locale:', localError);
        }
      }
      
      // Modification pour traiter le cas du mode local comme un succès
      if (result.success === false && result.useLocalMode === true) {
        console.log(`Notification enregistrée en mode local pour ${userId} (aucun token FCM trouvé)`);
        return true; // Considérer comme un succès même sans token FCM
      } else if (result.error) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (apiError) {
      console.error('Erreur lors de l\'appel API de notification:', apiError);
      return false;
    }
  } catch (error) {
    console.error('Erreur générale lors de l\'envoi de notification:', error);
    return false;
  }
};

/**
 * Fonction pour journaliser l'état des permissions de notification
 * @returns Le statut actuel des permissions
 */
export const logNotificationPermissionStatus = () => {
  if (typeof window === 'undefined') {
    return 'server-side';
  }
  
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  
  return Notification.permission;
};

/**
 * Fonction de débogage pour tester l'envoi de notifications
 * @param email Email de l'utilisateur qui recevra la notification
 * @param consultantName Nom du consultant pour lequel la notification sera envoyée
 * @returns Promise<boolean> True si la notification a été envoyée avec succès
 */
export const debugNotifications = async (email: string, consultantName: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications/debug', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, consultantName }),
    });
    
    if (!response.ok) {
      console.error(`Erreur API de debug: ${response.status} - ${response.statusText}`);
      return false;
    }
    
    const result = await response.json();
    console.log('Résultat débogage:', result);
    return result.success === true;
  } catch (error) {
    console.error('Erreur lors du débogage des notifications:', error);
    return false;
  }
};

/**
 * Régénère et enregistre un token FCM pour un utilisateur connecté et un consultant spécifique
 * @param userEmail Email de l'utilisateur connecté
 * @param consultantName Nom du consultant (optionnel)
 * @returns Promise<boolean> Succès de l'opération
 */
export const regenerateAndSaveToken = async (userEmail: string, consultantName?: string): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      console.error('Impossible de régénérer un token côté serveur');
      return false;
    }

    // Vérifier si l'utilisateur a autorisé les notifications
    if (Notification.permission !== 'granted') {
      console.log('Demande de permission pour les notifications...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.error('Permission refusée pour les notifications');
        return false;
      }
    }

    // Construire l'ID utilisateur
    const userId = consultantName ? `${userEmail}_${consultantName}` : userEmail;
    console.log(`Régénération du token FCM pour ${userId}...`);

    // S'assurer que Firebase est initialisé
    const app = initializeFirebase();
    if (!app) {
      console.error('Échec de l\'initialisation de Firebase');
      return false;
    }

    // Enregistrer le service worker
    const swRegistration = await registerFCMServiceWorker();
    if (!swRegistration) {
      console.error('Échec de l\'enregistrement du Service Worker');
      return false;
    }

    try {
      // Générer un nouveau token
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: NOTIFICATION_CONFIG.vapidKey,
        serviceWorkerRegistration: swRegistration
      });

      if (!token) {
        console.error('Échec de l\'obtention du token FCM');
        return false;
      }

      console.log(`Nouveau token FCM obtenu: ${token.substring(0, 10)}...`);

      // Sauvegarder le token dans Firestore
      const success = await saveNotificationToken(userId, token);
      if (!success) {
        console.error('Échec de l\'enregistrement du token FCM');
        return false;
      }

      console.log(`Token FCM régénéré et enregistré avec succès pour ${userId}`);
      
      // Afficher une notification locale pour confirmer que tout fonctionne
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Notifications activées', {
          body: consultantName 
            ? `Vous recevrez désormais les notifications pour ${consultantName}`
            : 'Vous recevrez désormais les notifications',
          icon: '/icons/arthur-loyd-logo-192.png'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la génération du token:', error);
      return false;
    }
  } catch (error) {
    console.error('Erreur générale lors de la régénération du token:', error);
    return false;
  }
};

// Ajouter la fonction à window pour pouvoir l'appeler depuis la console
if (typeof window !== 'undefined') {
  (window as any).regenerateAndSaveToken = regenerateAndSaveToken;
} 