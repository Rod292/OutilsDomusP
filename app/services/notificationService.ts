import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
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
    const { title, body, icon = undefined, data = {} } = notification;
    
    console.log('sendLocalNotification: Création de la notification avec:', { title, body, data });
    
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
    
    // Passer un événement de notification créée à la console
    console.log('sendLocalNotification: Notification envoyée avec succès:', { title, body });
    return true;
  } catch (error) {
    console.error('sendLocalNotification: Erreur lors de l\'envoi de notification locale:', error);
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
    
    // Vérifier l'enregistrement dans Firestore
    try {
      const notificationId = `${email}_${consultantName}`;
      console.log(`ID de notification à vérifier: ${notificationId}`);
      
      // Vérifier si un token existe
      const db = getFirestore();
      const q = query(
        collection(db, 'notificationTokens'),
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
    
    // Tester une notification locale
    console.log('Test de notification locale...');
    const localSuccess = await sendLocalNotification({
      title: 'Test de notification locale',
      body: `Test pour ${consultantName} à ${new Date().toLocaleTimeString()}`,
      data: {
        userId: `${email}_${consultantName}`,
        type: 'system',
        taskId: 'debug-' + Date.now()
      }
    });
    
    console.log(`Résultat notification locale: ${localSuccess ? 'Succès' : 'Échec'}`);
    
    // Tester via l'API de notification
    try {
      console.log('Test via API...');
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          consultantName
        })
      });
      
      const result = await response.json();
      console.log('Résultat du test API:', result);
      
      return true;
    } catch (apiError) {
      console.error('Erreur lors du test via API:', apiError);
      return false;
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

// Ajouter debugNotifications à window pour pouvoir l'appeler depuis la console
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugNotifications;
  (window as any).sendLocalNotification = sendLocalNotification;
}

/**
 * Envoie une notification pour une tâche assignée à un consultant
 * @param task Tâche assignée
 * @param assignee Email du consultant assigné à la tâche
 * @param currentUserEmail Email de l'utilisateur actuellement connecté
 * @param isCommunication Indique s'il s'agit d'une communication
 * @param parentTaskTitle Titre de la tâche parente (pour les communications)
 * @returns Promise<boolean> true si la notification est envoyée avec succès
 */
export const sendTaskAssignedNotification = async (
  task: any, 
  assignee: string, 
  currentUserEmail: string,
  isCommunication: boolean = false,
  parentTaskTitle?: string
): Promise<boolean> => {
  try {
    // Vérifier si nous sommes côté client
    if (typeof window === 'undefined') {
      console.log('Impossible d\'envoyer une notification côté serveur');
      return false;
    }

    // Vérifier que task est défini et qu'il a un ID
    if (!task) {
      console.error('Tâche non définie pour l\'envoi de notification');
      return false;
    }

    // S'assurer que task.id existe
    if (!task.id) {
      console.error('ID de tâche manquant pour l\'envoi de notification');
      return false;
    }

    // Extraire le nom du consultant à partir de l'email
    const consultantName = assignee.split('@')[0] || assignee;
    
    // CORRECTION IMPORTANTE: C'est l'utilisateur connecté qui a activé les notifications qui doit recevoir la notification
    // L'ID de notification doit donc être basé sur l'email de l'utilisateur ET le consultant qu'il surveille
    const notificationId = `${currentUserEmail}_${consultantName}`;
    
    console.log(`CORRECTION: Envoi d'une notification à ${notificationId} pour la tâche assignée à ${consultantName}.`);
    console.log(`Détails : userEmail=${currentUserEmail}, consultantEmail=${assignee}, taskId=${task.id}`);
    
    // Préparer les données de la notification avec un message adapté
    const title = isCommunication 
      ? "📝 Nouvelle communication assignée"
      : "📋 Nouvelle tâche assignée";
    
    // Adapter le message pour indiquer clairement que c'est pour le consultant surveillé
    const body = isCommunication
      ? `${consultantName} a reçu une nouvelle communication "${task.type || 'Communication'}" pour la tâche "${parentTaskTitle || 'principale'}".`
      : `${consultantName} a reçu une nouvelle tâche "${task.title}".`;
    
    // Type de notification
    const notificationType = isCommunication ? "communication_assigned" : "task_assigned";
    
    const notificationData = {
      // IMPORTANT: L'ID de notification contient maintenant l'email de l'utilisateur qui surveille
      userId: notificationId,
      title,
      body,
      type: notificationType as "task_assigned" | "task_reminder" | "system" | "communication_assigned",
      taskId: task.id  // S'assurer que taskId est bien transmis
    };

    console.log(`Préparation de la notification:`, notificationData);
    
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

      // Si l'API échoue, essayer d'envoyer en mode local
      if (!response.ok) {
        console.error(`Erreur API: ${response.status} - ${response.statusText}`);
        
        // Si code 404, essayer mode local automatiquement
        if (response.status === 404) {
          console.log('API non trouvée (404), passage en mode local');
          // Passer en mode local
          const localSuccess = await sendLocalNotification({
            title: notificationData.title,
            body: notificationData.body,
            data: { 
              taskId: notificationData.taskId, 
              type: notificationData.type,
              userId: notificationData.userId
            }
          });
          
          console.log('Résultat de l\'envoi de notification locale suite à 404:', localSuccess);
          return localSuccess;
        }
        
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Résultat de l\'envoi de notification:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Vérifier si le serveur nous suggère d'utiliser le mode local
      if (result.useLocalMode) {
        console.log('Mode local suggéré par le serveur, envoi direct d\'une notification...');
        const success = await sendLocalNotification({
          title: notificationData.title,
          body: notificationData.body,
          data: { 
            taskId: notificationData.taskId, 
            type: notificationData.type,
            userId: notificationData.userId
          }
        });
        
        console.log('Résultat de l\'envoi de notification locale:', success);
        return success;
      }
      
      return true;
    } catch (apiError) {
      console.error('Erreur lors de l\'envoi via API, tentative d\'envoi local:', apiError);
      
      // Fallback: utiliser les notifications locales
      try {
        // S'assurer que la notification est enregistrée dans Firestore
        await createNotification({
          userId: notificationId,
          title: notificationData.title,
          body: notificationData.body,
          type: notificationData.type,
          taskId: notificationData.taskId,
          read: false
        });
        
        console.log('Notification enregistrée dans Firestore manuellement après échec API');
      } catch (firestoreError) {
        console.error('Échec également de l\'enregistrement dans Firestore:', firestoreError);
        // Continue quand même pour essayer d'envoyer la notification locale
      }
      
      // Dernier recours: envoyer une notification locale directement
      console.log('Tentative d\'envoi de notification locale en dernier recours...');
      const localSuccess = await sendLocalNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: { 
          taskId: notificationData.taskId, 
          type: notificationData.type,
          userId: notificationData.userId
        }
      });
      
      console.log('Résultat de l\'envoi de notification locale en dernier recours:', localSuccess);
      return localSuccess;
    }
  } catch (error) {
    console.error('Erreur globale lors de l\'envoi de la notification:', error);
    return false;
  }
}; 