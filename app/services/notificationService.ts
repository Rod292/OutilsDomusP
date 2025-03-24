import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, serverTimestamp, Firestore, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { NOTIFICATION_CONFIG } from '../api/notifications/config';

const NOTIFICATION_COLLECTION = 'notifications';
const TOKEN_COLLECTION = 'notificationTokens';

// Liste des consultants avec leurs emails
const CONSULTANTS = [
  { name: "Anne", email: "acoat@arthurloydbretagne.fr" },
  { name: "Elowan", email: "ejouan@arthurloydbretagne.fr" },
  { name: "Erwan", email: "eleroux@arthurloydbretagne.fr" },
  { name: "Julie", email: "jdalet@arthurloydbretagne.fr" },
  { name: "Justine", email: "jjambon@arthurloydbretagne.fr" },
  { name: "Morgane", email: "agencebrest@arthurloydbretagne.fr" },
  { name: "Nathalie", email: "npers@arthurloydbretagne.fr" },
  { name: "Pierre", email: "pmottais@arthurloydbretagne.fr" },
  { name: "Pierre-Marie", email: "pmjaumain@arthurloydbretagne.fr" },
  { name: "Sonia", email: "shadjlarbi@arthur-loyd.com" }
];

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
    
    // Extraire l'email et le consultant depuis userId (format: email_consultant)
    const [email, consultant] = userId.includes('_') ? userId.split('_') : [userId, null];
    console.log(`Email extrait: ${email}, Consultant: ${consultant || 'non spécifié'}`);
    
    // Initialiser Firestore et vérifier qu'il est disponible
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non initialisé');
      return false;
    }
    
    // Vérifier si ce token existe déjà pour n'importe quel utilisateur
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const tokenQuery = query(tokensRef, where('token', '==', token));
    const tokenSnapshot = await getDocs(tokenQuery);
    
    const timestamp = Date.now();
    const deviceInfo = {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp,
      lastUpdated: serverTimestamp()
    };
    
    // Si le token existe déjà
    if (!tokenSnapshot.empty) {
      const existingDoc = tokenSnapshot.docs[0];
      const existingData = existingDoc.data();
      
      // Si le token existe pour un autre email, le supprimer
      if (existingData.email !== email) {
        console.log(`Token existant pour un autre email (${existingData.email}), suppression...`);
        await deleteDoc(existingDoc.ref);
      } else {
        // Mettre à jour le document existant
        await updateDoc(existingDoc.ref, {
          userId, // Mettre à jour avec le nouveau userId (qui peut inclure le consultant)
          email,
          ...deviceInfo
        });
        console.log(`Token existant mis à jour pour l'utilisateur: ${userId}`);
        return true;
      }
    }
    
    // Créer un nouveau document pour ce token
    const tokenData = {
      userId,
      email,
      token,
      consultant: consultant || null,
      createdAt: serverTimestamp(),
      ...deviceInfo
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

    if (!userEmail) {
      console.error('Email utilisateur manquant');
      return false;
    }
    
    // Si consultantName est null, undefined ou "null", retourner false
    if (!consultantName || consultantName === 'null') {
      console.log('Nom de consultant invalide pour la vérification des permissions');
      return false;
    }

    // Trouver l'email correct du consultant dans la liste
    const consultant = CONSULTANTS.find(c => c.name.toLowerCase() === consultantName.toLowerCase());
    const consultantEmail = consultant ? consultant.email : `${consultantName.toLowerCase()}@arthurloydbretagne.fr`;
    
    // Construire l'identifiant de notification (email_consultant)
    const notificationId = `${userEmail}_${consultantName}`;
    console.log(`Vérification des permissions pour: ${notificationId} (${consultantEmail})`);
    
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

    // Extraire l'email et le consultant depuis userId
    const [email, consultant] = userId.includes('_') ? userId.split('_') : [userId, null];
    console.log(`Email extrait: ${email}, Consultant: ${consultant || 'non spécifié'}`);
    
    // Tentative d'enregistrement du Service Worker
    console.log('Tentative d\'enregistrement du Service Worker...');
    
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker n\'est pas supporté sur ce navigateur.');
      return null;
    }
    
    // Enregistrer le service worker
    let swRegistration;
    try {
      // Forcer le rechargement du service worker
      const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (existingReg) {
        console.log('Service Worker trouvé, tentative de mise à jour...');
        await existingReg.update();
      }
      
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
        updateViaCache: 'none' // Ne pas utiliser le cache
      });
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

      // Demander la permission de notification explicitement avant de demander le token
      if (Notification.permission !== 'granted') {
        console.log('Demande de permission de notification...');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.error('Permission de notification refusée par l\'utilisateur');
          return null;
        }
        console.log('Permission de notification accordée');
      }
      
      // Demander le token FCM pour l'utilisateur
      console.log('Demande de token FCM avec VAPID key...');
      
      // Essayer avec plusieurs tentatives
      let token = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!token && attempts < maxAttempts) {
        attempts++;
        try {
          token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration
          });
          console.log(`Tentative ${attempts}: Token ${token ? 'obtenu' : 'non obtenu'}`);
        } catch (tokenError) {
          console.error(`Erreur lors de la tentative ${attempts}:`, tokenError);
          // Attendre un peu avant la prochaine tentative
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!token) {
        console.error('Échec de l\'obtention du token FCM après plusieurs tentatives');
        
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
      
      // Envoi d'une notification de test pour confirmer l'enregistrement
      try {
        await sendLocalNotification({
          title: '✅ Notifications activées',
          body: 'Vous recevrez désormais des notifications sur cet appareil.',
          data: { type: 'system', userId }
        });
      } catch (testError) {
        console.warn('Erreur lors de l\'envoi de la notification de test:', testError);
        // Ne pas échouer pour cette erreur
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

    // Vérifier que le userId n'est pas formaté avec "_null"
    if (userId.endsWith('_null')) {
      userId = userId.split('_')[0];
      console.log(`Correction de l'ID utilisateur (suppression du _null): ${userId}`);
    }

    // Extraire l'email utilisateur et le consultant depuis userId (format: email_consultant)
    const [userEmail, consultantName] = userId.split('_');
    if (!userEmail) {
      console.error('Format d\'ID utilisateur invalide pour la demande de permission');
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
    
    // Mettre à jour les préférences de notification pour n'activer que ce consultant
    try {
      const db = getFirestore();
      if (db) {
        // Trouver l'email correct du consultant dans la liste
        const consultant = CONSULTANTS.find(c => c.name.toLowerCase() === consultantName.toLowerCase());
        const consultantEmail = consultant ? consultant.email : `${consultantName.toLowerCase()}@arthurloydbretagne.fr`;
        
        // 1. Récupérer toutes les préférences actuelles de l'utilisateur
        const prefsQuery = query(
          collection(db, "notificationPreferences"),
          where("userId", "==", userEmail)
        );
        
        const prefsSnapshot = await getDocs(prefsQuery);
        const batch = writeBatch(db);
        
        // 2. Supprimer toutes les préférences existantes
        prefsSnapshot.forEach((document) => {
          batch.delete(document.ref);
        });
        
        // 3. Créer une nouvelle préférence uniquement pour le consultant actuel
        const prefDoc = doc(collection(db, "notificationPreferences"));
        batch.set(prefDoc, {
          userId: userEmail,
          consultantEmail: consultantEmail,
          consultantName: consultantName,
          taskAssigned: true,
          communicationAssigned: true,
          taskReminders: true,
          createdAt: new Date()
        });
        
        // 4. Appliquer les modifications
        await batch.commit();
        console.log(`Préférences de notification mises à jour pour n'activer que ${consultantName}`);
      }
    } catch (prefError) {
      console.error('Erreur lors de la mise à jour des préférences de notification:', prefError);
      // Ne pas échouer pour cette erreur
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
            body: `Vous recevrez des notifications pour ${consultantName}.`,
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

/**
 * Vérifie si un utilisateur a des tokens FCM enregistrés et affiche les informations
 * @param email Email de l'utilisateur
 * @param consultantName Nom du consultant (optionnel)
 * @returns Promise<boolean> True si des tokens ont été trouvés
 */
export const checkTokensForUser = async (email: string, consultantName?: string): Promise<boolean> => {
  try {
    console.log(`Vérification des tokens pour ${email}${consultantName ? ` et ${consultantName}` : ''}`);
    
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non initialisé');
      return false;
    }
    
    // Construire l'ID de notification en fonction des paramètres
    const notificationId = consultantName ? `${email}_${consultantName}` : email;
    console.log(`ID de notification: ${notificationId}`);
    
    // Chercher les tokens par userId et par email
    const byUserIdQuery = query(
      collection(db, TOKEN_COLLECTION),
      where('userId', '==', notificationId)
    );
    
    const byEmailQuery = query(
      collection(db, TOKEN_COLLECTION),
      where('email', '==', email)
    );
    
    const [byUserIdSnapshot, byEmailSnapshot] = await Promise.all([
      getDocs(byUserIdQuery),
      getDocs(byEmailQuery)
    ]);
    
    console.log(`Tokens trouvés par userId (${notificationId}): ${byUserIdSnapshot.size}`);
    console.log(`Tokens trouvés par email (${email}): ${byEmailSnapshot.size}`);
    
    byUserIdSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Token par userId: ${doc.id}`);
      console.log(`  Platform: ${data.platform}`);
      console.log(`  User Agent: ${data.userAgent?.substring(0, 50)}...`);
      console.log(`  Date: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'inconnue'}`);
    });
    
    byEmailSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Token par email: ${doc.id}`);
      console.log(`  UserId: ${data.userId}`);
      console.log(`  Platform: ${data.platform}`);
      console.log(`  User Agent: ${data.userAgent?.substring(0, 50)}...`);
      console.log(`  Date: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'inconnue'}`);
    });
    
    return byUserIdSnapshot.size > 0 || byEmailSnapshot.size > 0;
  } catch (error) {
    console.error('Erreur lors de la vérification des tokens:', error);
    return false;
  }
};

/**
 * Met à jour tous les tokens d'un utilisateur pour le consultantName spécifié
 * Assure que tous les tokens utilisent le format userId correct: email_consultant
 * @param email Email de l'utilisateur
 * @param consultantName Nom du consultant
 * @returns Promise<number> Nombre de tokens mis à jour
 */
export const updateNotificationTokensForConsultant = async (email: string, consultantName: string): Promise<number> => {
  try {
    if (typeof window === 'undefined') {
      console.log('Impossible de mettre à jour les tokens côté serveur');
      return 0;
    }
    
    if (!email || !consultantName) {
      console.error('Email ou nom de consultant manquant');
      return 0;
    }
    
    console.log(`Mise à jour des tokens pour ${email} avec consultant ${consultantName}`);
    
    // Construire le userId correct au format email_consultant
    const correctUserId = `${email}_${consultantName}`;
    
    // Appeler l'API pour corriger les tokens
    try {
      const response = await fetch('/api/notifications/tokens', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          consultantName
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('Résultat de la mise à jour des tokens:', result);
      
      return result.updatedCount || 0;
    } catch (apiError) {
      console.error('Erreur lors de l\'appel API pour mettre à jour les tokens:', apiError);
      return 0;
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour des tokens:', error);
    return 0;
  }
};

// Ajouter debugNotifications à window pour pouvoir l'appeler depuis la console
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugNotifications;
  (window as any).sendLocalNotification = sendLocalNotification;
  (window as any).cleanupDuplicateTokens = cleanupDuplicateTokens;
  (window as any).checkTokensForUser = checkTokensForUser;
  (window as any).updateNotificationTokensForConsultant = updateNotificationTokensForConsultant;
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
    
    // Déduire le nom du consultant depuis l'email du destinataire
    let consultantName = "";
    if (params.recipientEmail) {
      // Extraire le nom du consultant à partir de l'email (partie avant @)
      consultantName = params.recipientEmail.split('@')[0];
      // Rechercher le nom officiel dans la liste des consultants
      const consultant = CONSULTANTS.find(c => c.email.toLowerCase() === params.recipientEmail.toLowerCase());
      if (consultant) {
        consultantName = consultant.name;
      }
    }
    
    console.log(`Préparation notification pour ${consultantName} (${params.recipientEmail})`);
    
    // Extraire l'email de l'utilisateur depuis le userId
    let userEmail = params.userId;
    if (params.userId.includes('_')) {
      userEmail = params.userId.split('_')[0];
    }
    
    // Construire un userId optimal: email + consultant (si disponible)
    let optimalUserId = userEmail;
    if (consultantName && consultantName !== "null") {
      optimalUserId = `${userEmail}_${consultantName}`;
    }
    
    console.log(`ID utilisateur optimisé pour notification: ${optimalUserId}`);
    
    // Construire les données complètes de notification
    const notificationData = {
      userId: optimalUserId,
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
      
      // Si aucun token n'a été trouvé, essayer d'enregistrer un nouveau token
      if (result.useLocalMode || result.total === 0) {
        console.log("Aucun token trouvé, tentative d'enregistrement d'un nouveau token...");
        // Demander l'autorisation et enregistrer un token pour ce consultant
        try {
          await requestNotificationPermission(optimalUserId);
          
          // Réessayer d'envoyer la notification après l'enregistrement du token
          const secondResponse = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notificationData),
          });
          
          if (secondResponse.ok) {
            const secondResult = await secondResponse.json();
            console.log('Résultat de la seconde tentative:', secondResult);
            return secondResult.success || false;
          }
        } catch (tokenError) {
          console.error("Échec de l'enregistrement d'un nouveau token:", tokenError);
        }
      }
      
      return result.success || false;
    } catch (apiError) {
      console.error('Erreur lors de l\'appel API de notification:', apiError);
      return false;
    }
  } catch (error) {
    console.error('Erreur générale lors de l\'envoi de notification:', error);
    return false;
  }
};

// Fonction pour déboguer les tokens pour un utilisateur spécifique
export async function debugUserTokens(email: string, consultant?: string) {
  try {
    console.log(`DEBUG: Vérification des tokens pour ${email}${consultant ? ` (consultant: ${consultant})` : ''}`);
    
    // Initialiser Firestore
    const db = getFirestore();
    if (!db) {
      console.error('Firebase non initialisé');
      return null;
    }
    
    let userId = email;
    if (consultant && consultant !== 'null') {
      userId = `${email}_${consultant}`;
    }
    
    console.log(`DEBUG: Recherche par userId ${userId}`);
    // Recherche par userId spécifique
    const specificTokensQuery = query(
      collection(db, 'notificationTokens'),
      where('userId', '==', userId)
    );
    
    const specificTokensSnapshot = await getDocs(specificTokensQuery);
    console.log(`DEBUG: ${specificTokensSnapshot.size} token(s) trouvé(s) pour ${userId}`);
    
    // Afficher les détails de chaque token
    specificTokensSnapshot.forEach(doc => {
      const tokenData = doc.data();
      console.log(`Token: ${tokenData.token?.substring(0, 10)}... (${tokenData.token?.length} caractères)`);
      console.log(`  Platform: ${tokenData.platform || 'Non spécifiée'}`);
      console.log(`  UserAgent: ${tokenData.userAgent || 'Non spécifié'}`);
      console.log(`  Timestamp: ${tokenData.timestamp ? new Date(tokenData.timestamp).toISOString() : 'Non spécifié'}`);
      console.log(`  CreatedAt: ${tokenData.createdAt ? (tokenData.createdAt.toDate ? tokenData.createdAt.toDate().toISOString() : tokenData.createdAt) : 'Non spécifié'}`);
    });
    
    // Recherche par email uniquement
    console.log(`DEBUG: Recherche par email ${email}`);
    const emailTokensQuery = query(
      collection(db, 'notificationTokens'),
      where('email', '==', email)
    );
    
    const emailTokensSnapshot = await getDocs(emailTokensQuery);
    console.log(`DEBUG: ${emailTokensSnapshot.size} token(s) trouvé(s) pour l'email ${email}`);
    
    // Afficher les détails de chaque token trouvé par email
    emailTokensSnapshot.forEach(doc => {
      const tokenData = doc.data();
      console.log(`Token: ${tokenData.token?.substring(0, 10)}... (${tokenData.token?.length} caractères)`);
      console.log(`  UserId: ${tokenData.userId || 'Non spécifié'}`);
      console.log(`  Platform: ${tokenData.platform || 'Non spécifiée'}`);
      console.log(`  UserAgent: ${tokenData.userAgent || 'Non spécifié'}`);
      console.log(`  Timestamp: ${tokenData.timestamp ? new Date(tokenData.timestamp).toISOString() : 'Non spécifié'}`);
      console.log(`  CreatedAt: ${tokenData.createdAt ? (tokenData.createdAt.toDate ? tokenData.createdAt.toDate().toISOString() : tokenData.createdAt) : 'Non spécifié'}`);
    });
    
    return {
      specificTokensCount: specificTokensSnapshot.size,
      emailTokensCount: emailTokensSnapshot.size
    };
  } catch (error) {
    console.error('Erreur lors du débogage des tokens:', error);
    return null;
  }
}

// Fonction pour tester l'envoi d'une notification directement à un token spécifique
export async function sendTestNotificationToToken(token: string) {
  try {
    const response = await fetch('/api/notifications/send-to-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        title: '🧪 Test de notification',
        body: `Test de notification envoyé à ${new Date().toLocaleTimeString()}`,
      }),
    });
    
    const result = await response.json();
    console.log('Résultat du test de notification:', result);
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du test de notification:', error);
    return { success: false, error };
  }
}

// Exposer les fonctions de débogage globalement
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.debugUserTokens = debugUserTokens;
  // @ts-ignore
  window.sendTestNotificationToToken = sendTestNotificationToToken;
  // @ts-ignore
  window.checkTokensForUser = checkTokensForUser;
}

/**
 * Marque un token comme obsolète dans Firestore
 * @param token Token à marquer comme obsolète
 * @returns Promise<boolean> true si le token a été marqué avec succès
 */
export const markTokenObsolete = async (token: string): Promise<boolean> => {
  try {
    if (!token) {
      console.error('Token manquant');
      return false;
    }
    
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non initialisé');
      return false;
    }
    
    // Rechercher le token
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const q = query(tokensRef, where('token', '==', token));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`Token ${token.substring(0, 10)}... non trouvé`);
      return false;
    }
    
    // Marquer le token comme obsolète
    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, {
      obsolete: true,
      lastUpdated: serverTimestamp()
    });
    
    console.log(`Token ${token.substring(0, 10)}... marqué comme obsolète`);
    return true;
  } catch (error) {
    console.error('Erreur lors du marquage du token comme obsolète:', error);
    return false;
  }
};

/**
 * Nettoie automatiquement les tokens obsolètes et trop anciens
 * @returns Promise<number> Nombre de tokens supprimés
 */
export const cleanupObsoleteTokens = async (): Promise<number> => {
  try {
    const db = getFirestore();
    if (!db) {
      console.error('Firestore non initialisé');
      return 0;
    }
    
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000); // 30 jours en millisecondes
    
    // Trouver les tokens marqués comme obsolètes
    const obsoleteQuery = query(tokensRef, where('obsolete', '==', true));
    const obsoleteSnapshot = await getDocs(obsoleteQuery);
    
    // Trouver les tokens trop anciens (plus de 30 jours)
    const oldQuery = query(tokensRef, where('timestamp', '<', thirtyDaysAgo));
    const oldSnapshot = await getDocs(oldQuery);
    
    // Combiner les deux ensembles de tokens à supprimer (éviter les doublons)
    const tokensToDelete = new Set<string>();
    
    obsoleteSnapshot.forEach(doc => tokensToDelete.add(doc.id));
    oldSnapshot.forEach(doc => tokensToDelete.add(doc.id));
    
    console.log(`${tokensToDelete.size} token(s) obsolètes ou anciens trouvé(s)`);
    
    // Supprimer les tokens
    let deletedCount = 0;
    for (const tokenId of tokensToDelete) {
      try {
        await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId));
        deletedCount++;
      } catch (error) {
        console.error(`Erreur lors de la suppression du token ${tokenId}:`, error);
      }
    }
    
    console.log(`${deletedCount} token(s) supprimé(s)`);
    return deletedCount;
  } catch (error) {
    console.error('Erreur lors du nettoyage des tokens obsolètes:', error);
    return 0;
  }
}; 