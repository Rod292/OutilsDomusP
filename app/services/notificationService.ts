'use client';

import { toast } from '@/components/ui/use-toast';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, DocumentData, orderBy, limit, startAfter, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { 
  requestNotificationPermissionAndToken, 
  getFirestoreInstance
} from './firebase';

// Type pour le résultat de UAParser
type UAParserResult = {
  browser: { name?: string; version?: string };
  device: { model?: string; type?: string; vendor?: string };
  os: { name?: string; version?: string };
};

// Interface pour le parser
interface UAParser {
  getResult(): UAParserResult;
}

declare global {
  interface NotificationOptions {
    actions?: Array<{ action: string; title: string }>;
  }
  
  interface NotificationEvent extends Event {
    action: string;
  }
}

// Liste des consultants
export const CONSULTANTS = [
  { name: 'npers', email: 'photos.pers@gmail.com' },
  { name: 'rleborgne', email: 'r.leborgne@arthur-loyd.com' },
  { name: 'mchampeil', email: 'm.champeil@arthur-loyd.com' },
  { name: 'vleprovost', email: 'v.leprovost@arthur-loyd.com' },
  { name: 'ahervouet', email: 'a.hervouet@arthur-loyd.com' },
  { name: 'cgaignard', email: 'c.gaignard@arthur-loyd.com' },
  { name: 'mdemeure', email: 'm.demeure@arthur-loyd.com' },
  { name: 'alamarche', email: 'a.lamarche@arthur-loyd.com' },
  { name: 'vsainz', email: 'v.sainz@arthur-loyd.com' },
  { name: 'fjaunet', email: 'f.jaunet@arthur-loyd.com' },
  { name: 'lsiraud', email: 'l.siraud@arthur-loyd.com' },
  { name: 'mleroch', email: 'm.leroch@arthur-loyd.com' },
];

// Configuration pour les notifications
export const NOTIFICATION_CONFIG = {
  ENABLED: true, // Réactivation du système de notifications
  VAPID_KEY: 'BGzPLt8Qmv6lFQDwKZLJzcIqH4cwWJN2P_aPCp8HYXJn7LIXHA5RL9rUd2uxSCnD2XHJZFGVtV11i3n2Ux9JYXM',
  USE_FCM: true,
  USE_API_KEY: false,
  API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
};

// Fonction pour créer un parser UA (remplace l'import)
const createUAParser = (): UAParser => {
  // Version simplifiée pour remplacer la bibliothèque ua-parser-js
  return {
    getResult: () => {
      // Récupération basique des informations du navigateur
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      
      // Détection basique
      const isChrome = /Chrome/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isEdge = /Edg/.test(userAgent);
      const isIOS = /iPhone|iPad|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      
      return {
        browser: {
          name: isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Unknown'
        },
        device: {
          type: isIOS || isAndroid ? 'mobile' : 'desktop'
        },
        os: {
          name: isIOS ? 'iOS' : isAndroid ? 'Android' : /Windows/.test(userAgent) ? 'Windows' : /Mac/.test(userAgent) ? 'macOS' : 'Unknown'
        }
      };
    }
  };
};

// Vérifier si les notifications sont supportées
export const areNotificationsSupported = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false;
    
    // Vérifier si le navigateur supporte les notifications
    if (!('Notification' in window)) return false;
    
    // Vérifier si FCM est supporté
    if (NOTIFICATION_CONFIG.USE_FCM) {
      return await isSupported();
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification du support des notifications:', error);
    return false;
  }
};

// Vérifier l'état actuel de la permission
export const checkNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Demander la permission pour les notifications
export const requestNotificationPermission = async (): Promise<
  { status: NotificationPermission | 'unsupported'; token?: string }
> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { status: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Si FCM est activé, nous essayons d'obtenir un token FCM
      if (NOTIFICATION_CONFIG.USE_FCM && await isSupported()) {
        try {
          const messaging = getMessaging();
          const token = await getToken(messaging, { 
            vapidKey: NOTIFICATION_CONFIG.VAPID_KEY,
          });
          
          if (token) {
            await saveNotificationToken(token);
            return { status: permission, token };
          }
        } catch (error) {
          console.error('Erreur lors de l\'obtention du token FCM:', error);
        }
      }
      
      return { status: permission };
    }
    
    return { status: permission };
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return { status: 'denied' };
  }
};

// Vérifier si un consultant a activé les notifications
export const checkConsultantPermission = async (email: string, consultant?: string): Promise<boolean> => {
  if (!email) return false;
  
  try {
    // Vérifier si les notifications sont supportées
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    // Vérifier si les notifications sont activées
    if (Notification.permission !== 'granted') {
      return false;
    }

    // Créer le userId dans le format email_consultant ou simplement email
    const userId = consultant ? `${email}_${consultant}` : email;
    
    // Initialiser Firestore
    const db = getFirestoreInstance();
    if (!db) return false;
    
    // Vérifier s'il existe des tokens pour cet utilisateur
    const tokensRef = collection(db, 'notification_tokens');
    const q = query(tokensRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions du consultant:', error);
    return false;
  }
};

// Enregistrer le token pour un utilisateur spécifique
export const saveNotificationToken = async (token: string, email: string, consultant?: string): Promise<boolean> => {
  try {
    if (!email) {
      console.error('Email requis pour enregistrer le token');
      return false;
    }
    
    // Créer le userId dans le format email_consultant ou simplement email
    const userId = consultant ? `${email}_${consultant}` : email;
    
    // Obtenir des informations sur l'appareil
    const deviceInfo = {
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
               navigator.userAgent.includes('Firefox') ? 'Firefox' : 
               navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
      os: navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'iOS' :
          navigator.userAgent.includes('Android') ? 'Android' :
          navigator.userAgent.includes('Windows') ? 'Windows' :
          navigator.userAgent.includes('Mac') ? 'macOS' : 'Other',
      device: navigator.userAgent.includes('Mobile') || 
              navigator.userAgent.includes('iPhone') || 
              navigator.userAgent.includes('Android') ? 'mobile' : 'desktop',
      userAgent: navigator.userAgent,
    };
    
    // Envoyer le token au serveur
    const response = await fetch('/api/notifications/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        userId,
        deviceInfo,
      }),
    });
    
    if (!response.ok) {
      console.error('Erreur lors de l\'enregistrement du token:', await response.text());
      return false;
    }
    
    console.log('Token enregistré avec succès pour', userId);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
    return false;
  }
};

// Envoyer une notification locale
export const sendLocalNotification = async (title: string, body: string, options: NotificationOptions = {}): Promise<boolean> => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    // Vérifier la permission
    const permission = Notification.permission;
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }
    
    // Configurer les options de la notification
    const notificationOptions: NotificationOptions = {
      body,
      icon: '/logo.png',
      badge: '/badge.png',
      ...options,
      // Actions personnalisées
      actions: [
        { action: 'view', title: 'Voir' },
        { action: 'close', title: 'Fermer' },
      ],
    };
    
    // Créer et afficher la notification
    const notification = new Notification(title, notificationOptions);
    
    // Gérer les événements de la notification
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      
      // Traitement pour les actions personnalisées
      if ('action' in event) {
        const action = (event as unknown as { action: string }).action;
        switch (action) {
          case 'view':
            // Action personnalisée pour "Voir"
            break;
          case 'close':
            notification.close();
            break;
        }
      }
    };
    
    // Intégration avec le Service Worker si disponible
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.showNotification) {
          registration.showNotification(title, notificationOptions);
          return true;
        }
      } catch (error) {
        console.error('Erreur avec le service worker:', error);
        // Continuer avec la notification standard si le service worker échoue
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification locale:', error);
    return false;
  }
};

// Créer une notification dans Firestore
export const createNotification = async (
  userId: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, any> = {}
): Promise<string | null> => {
  try {
    const db = getFirestore();
    const notificationId = uuidv4();
    
    await setDoc(doc(db, 'notifications', notificationId), {
      userId,
      title,
      body,
      type,
      data,
      read: false,
      delivered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return notificationId;
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    return null;
  }
};

// Marquer une notification comme lue
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const db = getFirestore();
    
    await setDoc(doc(db, 'notifications', notificationId), {
      read: true,
      updatedAt: new Date(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Erreur lors du marquage de la notification comme lue:', error);
    return false;
  }
};

// Type pour les paramètres de notification de tâche assignée
export interface TaskAssignedNotificationParams {
  userId: string;
  title: string;
  body: string;
  taskId: string;
  isCommunication?: boolean;
  communicationIndex?: number;
}

// Trouver le consultant par email
export const findConsultantByEmail = (email: string): string | null => {
  const consultant = CONSULTANTS.find(c => c.email === email);
  return consultant ? consultant.name : null;
};

// Vérifier si un email appartient à un consultant
export const isConsultantEmail = (email: string): boolean => {
  return CONSULTANTS.some(c => c.email === email);
};

// Extraire l'email et le consultant d'un userId
export const extractUserInfo = (userId: string): { email: string; consultant: string | null } => {
  if (userId.includes('_')) {
    const [email, consultant] = userId.split('_');
    return { email, consultant };
  } else {
    return { email: userId, consultant: null };
  }
};

// Créer le userId à partir de l'email et du consultant
export const createUserId = (email: string, consultant?: string): string => {
  if (consultant) {
    return `${email}_${consultant}`;
  } else {
    // Si pas de consultant spécifié, essayer de déduire du nom de domaine
    if (email.includes('@arthur-loyd.com')) {
      // Extraire le nom d'utilisateur de l'email
      const username = email.split('@')[0];
      // Vérifier si un consultant correspond à ce pattern
      const matchingConsultant = CONSULTANTS.find(c => 
        c.email === email || c.email.startsWith(username + '@')
      );
      
      if (matchingConsultant) {
        return `${email}_${matchingConsultant.name}`;
      }
    }
    
    return email;
  }
};

// Envoyer une notification pour une tâche assignée
export const sendTaskAssignedNotification = async (params: TaskAssignedNotificationParams): Promise<any> => {
  try {
    // Extraire l'email et le consultant
    const { email, consultant } = extractUserInfo(params.userId);
    
    // Optimiser le userId si possible
    const optimizedUserId = consultant 
      ? params.userId 
      : isConsultantEmail(email) 
        ? createUserId(email, findConsultantByEmail(email))
        : params.userId;
    
    // Construction des données pour l'API
    const notificationData = {
      userId: optimizedUserId,
      title: params.title,
      body: params.body,
      data: {
        taskId: params.taskId,
        type: params.isCommunication ? 'task_communication_assigned' : 'task_assigned',
        ...(params.isCommunication && params.communicationIndex !== undefined && { communicationIndex: params.communicationIndex }),
      },
    };
    
    console.log('Envoi de notification via l\'API:', notificationData);
    
    // Envoyer la notification via l'API
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    });
    
    if (!response.ok) {
      // Log l'erreur directement sans lancer d'exception pour permettre des tentatives alternatives
      console.error(`Erreur API: ${response.status}`);
      return { success: false, error: `Erreur API: ${response.status}` };
    }
    
    const result = await response.json();
    console.log('Résultat de l\'envoi de notification:', result);
    
    // Si la notification a été envoyée avec succès
    if (result.success) {
      return result;
    } else {
      return { success: false, message: result.error || 'Échec de l\'envoi de notification' };
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
};

// Fonctions de débogage pour les notifications
export const debugUserTokens = async (email: string, consultant?: string): Promise<void> => {
  try {
    const userId = consultant ? `${email}_${consultant}` : email;
    console.log(`Débogage des tokens pour userId: ${userId}`);
    
    // Récupérer les tokens via l'API
    const response = await fetch(`/api/notifications/tokens?userId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      console.error(`Erreur API: ${response.status}`);
      return;
    }
    
    const result = await response.json();
    
    if (result.success && result.tokens) {
      console.log(`${result.tokens.length} tokens trouvés pour ${userId}:`);
      
      result.tokens.forEach((token: any, index: number) => {
        console.log(`Token ${index + 1}:`);
        console.log(`  ID: ${token.id}`);
        console.log(`  Token: ${token.token.substring(0, 10)}...`);
        console.log(`  UserId: ${token.userId}`);
        console.log(`  Device: ${JSON.stringify(token.deviceInfo)}`);
        console.log(`  Créé le: ${token.createdAt ? new Date(token.createdAt._seconds * 1000).toLocaleString() : 'Date inconnue'}`);
      });
    } else {
      console.log(`Aucun token trouvé pour ${userId}`);
    }
  } catch (error) {
    console.error('Erreur lors du débogage des tokens:', error);
  }
};

// Envoyer une notification de test à un token spécifique
export const sendTestNotificationToToken = async (token: string): Promise<any> => {
  try {
    const testData = {
      token,
      title: "Test de notification",
      body: "Ceci est un test de notification envoyé directement à un token spécifique.",
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Envoi de notification de test au token:', token.substring(0, 10) + '...');
    
    const response = await fetch('/api/notifications/send-to-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    if (!response.ok) {
      console.error(`Erreur API: ${response.status}`);
      return { success: false, error: `Erreur API: ${response.status}` };
    }
    
    const result = await response.json();
    console.log('Résultat de l\'envoi de la notification de test:', result);
    
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de test:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
};

// Exposer les fonctions de débogage globalement
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugUserTokens;
  (window as any).sendTestNotification = sendTestNotificationToToken;
} 