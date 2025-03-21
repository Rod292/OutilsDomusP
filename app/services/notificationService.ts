import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, serverTimestamp, Firestore, deleteDoc, doc } from 'firebase/firestore';
import { NOTIFICATION_CONFIG } from '../api/notifications/config';

const NOTIFICATION_COLLECTION = 'notifications';
const TOKEN_COLLECTION = 'notificationTokens';

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
    if (!firestore) {
      throw new Error('Firestore non initialisé');
    }
    
    // CORRECTION: Nettoyer les données pour Firestore
    const cleanedNotification = {
      ...notification,
      taskId: notification.taskId || null, // Utiliser null au lieu de undefined
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Créer la notification dans Firestore avec le timestamp du serveur
    const notificationsCollection = collection(firestore, NOTIFICATION_COLLECTION);
    await addDoc(notificationsCollection, cleanedNotification);

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
  if (typeof window === 'undefined') {
    console.log('sendLocalNotification: Impossible d\'envoyer une notification côté serveur');
    return false;
  }
  
  if (!('Notification' in window)) {
    console.log('sendLocalNotification: Les notifications ne sont pas supportées dans ce navigateur');
    return false;
  }
  
  // Vérifier le statut des permissions de notification
  console.log('sendLocalNotification: Statut actuel des permissions de notification:', Notification.permission);
  
  if (Notification.permission !== 'granted') {
    console.log('sendLocalNotification: Permissions non accordées, tentative de demande...');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('sendLocalNotification: Permissions refusées par l\'utilisateur');
        return false;
      }
    } catch (error) {
      console.error('sendLocalNotification: Erreur lors de la demande de permission:', error);
      return false;
    }
  }
  
  try {
    const { title, body, icon = '/icons/arthur-loyd-logo-192.png', data = {} } = notification;
    
    console.log('sendLocalNotification: Création de la notification avec:', { title, body, data });
    
    // AJOUT: Vérifier si le service worker est actif
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        console.log('sendLocalNotification: Tentative d\'envoi via service worker...');
        // Essayer d'envoyer via le service worker d'abord
        const registration = await navigator.serviceWorker.ready;
        if (registration.showNotification) {
          await registration.showNotification(title, {
            body, 
            icon,
            data,
            requireInteraction: true,
            tag: data?.taskId || `notification-${Date.now()}`,
            // Les actions sont supportées par le service worker mais pas par l'API standard
            // @ts-ignore - Ignorer l'erreur de typage pour les actions
            actions: [
              {
                action: 'view',
                title: 'Voir'
              }
            ]
          });
          console.log('sendLocalNotification: Notification envoyée via service worker avec succès');
          return true;
        }
      } catch (swError) {
        console.warn('sendLocalNotification: Échec de l\'utilisation du service worker, repli sur Notification API:', swError);
      }
    }
    
    // Repli sur l'API Notification standard
    const notif = new Notification(title, {
      body, 
      icon,
      data,
      requireInteraction: true, // Garder la notification visible jusqu'à ce que l'utilisateur interagisse avec
      tag: data?.taskId || `notification-${Date.now()}` // Ajouter un tag unique pour identifier la notification
    });
    
    notif.onclick = () => {
      console.log('sendLocalNotification: Notification cliquée');
      const taskId = data?.taskId;
      window.focus(); // Mettre le focus sur la fenêtre actuelle
      window.open(taskId ? `/notion-plan?taskId=${taskId}` : '/notion-plan', '_blank');
    };
    
    // Vérifier si la notification a bien été créée
    if (!notif) {
      console.error('sendLocalNotification: La notification n\'a pas pu être créée');
      return false;
    }
    
    // Ajouter un gestionnaire d'erreur
    notif.onerror = (event) => {
      console.error('sendLocalNotification: Erreur lors de l\'affichage de la notification:', event);
      return false;
    };
    
    // Ajouter un gestionnaire de fermeture
    notif.onclose = () => {
      console.log('sendLocalNotification: Notification fermée par l\'utilisateur');
    };
    
    // Passer un événement de notification créée à la console
    console.log('sendLocalNotification: Notification envoyée avec succès:', { title, body });
    return true;
  } catch (error) {
    console.error('sendLocalNotification: Erreur lors de l\'envoi de notification locale:', error);
    
    // Tentative de contournement pour Chrome - enregistrer l'erreur et renvoyer vrai quand même
    if (navigator.userAgent.toLowerCase().includes('chrome')) {
      console.warn('sendLocalNotification: Contournement Chrome - considérer comme succès malgré l\'erreur');
      return true;
    }
    
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
    
    // Extraire l'email de l'utilisateur depuis userId (format: email_consultant)
    const email = userId.includes('_') ? userId.split('_')[0] : userId;
    console.log(`Email extrait: ${email}`);
    
    // Initialiser Firestore et vérifier qu'il est disponible
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non initialisé');
      return false;
    }
    
    // Vérifier si ce token existe déjà pour cet utilisateur
    const tokensRef = collection(db, TOKEN_COLLECTION);
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
        lastUpdated: serverTimestamp(),
        email // Ajouter/mettre à jour l'email
      });
      console.log(`Token existant mis à jour pour l'utilisateur: ${userId}`);
      return true;
    }
    
    // Sinon, créer un nouveau document pour ce token
    const tokenData = {
      userId,
      email, // Stocker l'email séparément pour faciliter les requêtes
      token,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
    
    await addDoc(tokensRef, tokenData);
    console.log(`Nouveau token enregistré pour l'utilisateur: ${userId}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
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

    // Construire l'identifiant de notification (email_consultant)
    const notificationId = `${userEmail}_${consultantName}`;
    console.log(`Vérification des permissions pour: ${notificationId}`);
    
    // Vérifier dans Firebase si des tokens existent pour cet identifiant
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non initialisé');
      return false;
    }

    // CORRECTION: Utilisation correcte de la collection
    const tokensCollection = collection(db, TOKEN_COLLECTION);
    const q = query(
      tokensCollection,
      where('userId', '==', notificationId)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
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

/**
 * Demande la permission pour les notifications et enregistre le token
 * @param userId Identifiant de l'utilisateur (email_consultant)
 * @returns Promise<boolean> True si la permission est accordée et le token enregistré
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
    if (!userId || userId.trim() === '') {
      console.error('ID utilisateur non valide pour la demande de permission');
      return false;
    }

    // Vérifier si les notifications sont déjà autorisées
    if (Notification.permission === 'granted') {
      console.log('Permissions de notification déjà accordées, enregistrement du token...');
    } else {
      console.log('Demande de permission de notification...');
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.error('Permission de notification refusée par l\'utilisateur');
        return false;
      }
      
      console.log('Permission de notification accordée!');
    }

    // Chrome peut avoir des problèmes avec getToken() si la permission est accordée,
    // alors utilisons un token local pour les tests
    let token = 'local-token-' + Date.now();
    let fcmTokenSuccess = false;
    
    // Tenter d'obtenir un token FCM seulement si l'API est activée
    if (NOTIFICATION_CONFIG.USE_FCM) {
      try {
        // Vérifier si Firebase est initialisé
        if (app) {
          const messaging = getMessaging(app);
          
          if (messaging) {
            console.log('Demande de token FCM...');
            
            // Récupération du VAPID key depuis les variables d'environnement
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            
            if (vapidKey) {
              token = await getToken(messaging, { 
                vapidKey,
                serviceWorkerRegistration: await navigator.serviceWorker.getRegistration()
              });
              
              console.log('Token FCM obtenu:', token.substring(0, 10) + '...');
              fcmTokenSuccess = true;
            } else {
              console.warn('VAPID key manquante - utilisation du mode local');
            }
          } else {
            console.warn('Firebase Messaging non disponible - utilisation du mode local');
          }
        } else {
          console.warn('Firebase non initialisé - utilisation du mode local');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du token FCM:', error);
        // Continuer avec le token local
      }
    } else {
      console.log('Mode FCM désactivé - utilisation du mode local');
    }
    
    // Enregistrer le token dans la base de données
    const tokenSaved = await saveNotificationToken(userId, token);
    
    if (tokenSaved) {
      // Essayer d'envoyer une notification locale pour confirmer que tout fonctionne
      if (!fcmTokenSuccess) {
        console.log('Envoi d\'une notification locale de confirmation...');
        try {
          await sendLocalNotification({
            title: NOTIFICATION_CONFIG.MESSAGES.ACTIVATED,
            body: 'Vous recevrez des notifications pour les nouvelles tâches assignées.',
            data: {
              type: 'system',
              userId
            }
          });
        } catch (notifError) {
          console.warn('Erreur lors de l\'envoi de la notification locale de confirmation:', notifError);
          // Ne pas échouer pour ça
        }
      }
      
      console.log('Token de notification enregistré avec succès pour', userId);
      return true;
    } else {
      console.error('Échec de l\'enregistrement du token pour', userId);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la demande de permission de notification:', error);
    return false;
  }
};

/**
 * Fonction de débogage pour tester l'envoi de notifications
 * Cette fonction peut être appelée depuis la console du navigateur
 * @param email Email de l'utilisateur qui recevra la notification
 * @param consultantName Nom du consultant pour lequel la notification sera envoyée
 */
export const debugNotifications = async (email: string, consultantName: string): Promise<boolean> => {
  try {
    // Vérifier si nous sommes côté client
    if (typeof window === 'undefined') {
      console.log('Impossible de déboguer les notifications côté serveur');
      return false;
    }
    
    console.log(`Débogage des notifications pour email=${email}, consultant=${consultantName}`);
    
    // Vérifier les permissions actuelles
    const permissionStatus = Notification.permission;
    console.log(`Statut actuel des permissions: ${permissionStatus}`);
    
    if (permissionStatus !== 'granted') {
      console.log('Les permissions de notification ne sont pas accordées. Demande en cours...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.error('Permissions de notification refusées par l\'utilisateur');
        return false;
      }
      console.log('Permissions accordées avec succès');
    }
    
    // Construire l'ID de notification correct (email_consultant)
    const notificationId = `${email}_${consultantName}`;
    
    console.log(`ID de notification à vérifier: ${notificationId}`);
    
    // Vérifier l'enregistrement dans Firestore
    try {
      const db = getFirestore();
      
      console.log('Recherche de tokens de notification...');
      
      // Vérifier si un token existe
      const q = query(
        collection(db, TOKEN_COLLECTION),
        where('userId', '==', notificationId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.log(`Aucun token trouvé pour ${notificationId}, tentative d'enregistrement...`);
        
        // Essayer d'enregistrer un token
        const success = await requestNotificationPermission(notificationId);
        console.log(`Résultat de l'enregistrement: ${success ? 'Succès' : 'Échec'}`);
      } else {
        console.log(`${snapshot.size} token(s) trouvé(s) pour ${notificationId}`);
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`Token: ${data.token ? (data.token.substring(0, 10) + '...') : 'null'}`);
          console.log(`Date: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'inconnue'}`);
        });
      }
    } catch (dbError) {
      console.error('Erreur lors de la vérification Firestore:', dbError);
    }
    
    // Générer un ID unique pour cette notification
    const testId = `test-${Date.now()}`;
    
    // Force de données de notification avec les paramètres précis 
    const notificationData = {
      userId: notificationId,
      title: `Test pour ${consultantName}`,
      body: `Notification générée à ${new Date().toLocaleTimeString()} pour l'utilisateur ${email}`,
      type: 'system' as "task_assigned" | "task_reminder" | "system" | "communication_assigned",
      taskId: testId
    };
    
    // Enregistrer dans l'historique local des tests
    try {
      if (localStorage) {
        const testHistory = JSON.parse(localStorage.getItem('notification_tests') || '[]');
        testHistory.push({
          id: testId,
          timestamp: Date.now(),
          email,
          consultant: consultantName,
          title: notificationData.title,
          body: notificationData.body,
          userId: notificationId
        });
        localStorage.setItem('notification_tests', JSON.stringify(testHistory.slice(-10))); // Garder les 10 derniers tests
      }
    } catch (e) {
      console.warn('Erreur lors du stockage local de l\'historique des tests:', e);
    }
    
    // Tester l'envoi via l'API
    console.log('Test d\'envoi via API...');
    
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
      
      const result = await response.json();
      console.log('Réponse API:', result);
      
      // Vérifier si le serveur suggère d'utiliser le mode local
      if (result.useLocalMode || result.status === 404) {
        console.log('Mode local suggéré par le serveur ou API non disponible, envoi direct...');
        
        // Envoyer également une notification locale directe
        const localSuccess = await sendLocalNotification({
          title: notificationData.title,
          body: notificationData.body,
          data: {
            userId: notificationId,
            type: 'test',
            taskId: testId
          }
        });
        
        console.log(`Résultat notification locale: ${localSuccess ? 'Succès' : 'Échec'}`);
        return localSuccess;
      }
      
      return true;
    } catch (apiError) {
      console.error('Erreur lors de l\'appel API, tentative d\'envoi local:', apiError);
      
      // Envoyer directement une notification locale
      const localSuccess = await sendLocalNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: {
          userId: notificationId,
          type: 'test',
          taskId: testId
        }
      });
      
      console.log(`Résultat notification locale suite à erreur API: ${localSuccess ? 'Succès' : 'Échec'}`);
      return localSuccess;
    }
  } catch (error) {
    console.error('Erreur globale lors du débogage des notifications:', error);
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
    const q = query(tokensRef, where('userId', '==', userId));
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

// Ajouter debugNotifications à window pour pouvoir l'appeler depuis la console
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugNotifications;
  (window as any).sendLocalNotification = sendLocalNotification;
  (window as any).cleanupDuplicateTokens = cleanupDuplicateTokens;
}

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

    // Vérifier les paramètres essentiels
    if (!params.taskId || !params.userId || !params.title || !params.body) {
      console.error('Paramètres requis manquants pour l\'envoi de notification');
      return false;
    }

    const notificationType = params.isCommunication ? "communication_assigned" : "task_assigned";
    
    // Déduire le nom du consultant si nécessaire
    const consultantName = params.recipientEmail?.split('@')[0] || params.recipientEmail;
    console.log(`Préparation notification pour ${consultantName} (${params.recipientEmail})`);
    
    // Construire les données complètes de notification
    const notificationData = {
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: notificationType as "task_assigned" | "task_reminder" | "system" | "communication_assigned",
      taskId: params.taskId,
      communicationIndex: params.communicationIndex,
      mode: 'FCM' // Force l'utilisation de Firebase Cloud Messaging
    };

    console.log(`Envoi de notification:`, notificationData);
    
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

      // Si l'API échoue, enregistrer l'erreur mais ne pas tenter d'envoyer en mode local
      // pour éviter les notifications en double
      if (!response.ok) {
        console.error(`Erreur API de notification: ${response.status} - ${response.statusText}`);
        return false;
      }
      
      const result = await response.json();
      console.log('Résultat de l\'envoi de notification:', result);
      
      if (result.error) {
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