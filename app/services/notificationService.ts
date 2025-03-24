'use client';

import { toast } from '@/components/ui/use-toast';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, DocumentData, orderBy, limit, startAfter, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

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
  ENABLED: false, // Temporairement désactivé pendant la refonte
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
    const isSupported = await areNotificationsSupported();
    if (!isSupported) return false;
    
    // Vérifier si les notifications sont activées
    const permission = checkNotificationPermission();
    if (permission !== 'granted') return false;

    // Créer le userId dans le format email_consultant ou simplement email
    const userId = consultant ? `${email}_${consultant}` : email;
    
    // Initialiser Firestore
    const db = getFirestore();
    
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
export const saveNotificationToken = async (token: string, email?: string, consultant?: string): Promise<boolean> => {
  try {
    // Récupérer l'email de l'utilisateur actuel si non fourni
    if (!email) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user?.email) {
        console.error('Impossible de récupérer l\'email de l\'utilisateur actuel');
        return false;
      }
      email = user.email;
    }
    
    // Créer le userId dans le format email_consultant ou simplement email
    const userId = consultant ? `${email}_${consultant}` : email;
    
    // Obtenir des informations sur l'appareil
    const parser = createUAParser();
    const result = parser.getResult();
    const deviceInfo = {
      browser: result.browser.name,
      os: result.os.name,
      device: result.device.type || 'desktop',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };
    
    // Initialiser Firestore
    const db = getFirestore();
    
    // Vérifier si le token existe déjà
    const tokensRef = collection(db, 'notification_tokens');
    const q = query(tokensRef, where('token', '==', token));
    const querySnapshot = await getDocs(q);
    
    // Si le token existe, mettre à jour le document
    if (!querySnapshot.empty) {
      // Récupérer le premier document correspondant
      const tokenDoc = querySnapshot.docs[0];
      
      // Si le userId a changé, mettre à jour le document
      if (tokenDoc.data().userId !== userId) {
        await setDoc(doc(db, 'notification_tokens', tokenDoc.id), {
          token,
          userId,
          deviceInfo,
          createdAt: tokenDoc.data().createdAt,
          updatedAt: new Date(),
        });
      }
    } else {
      // Si le token n'existe pas, créer un nouveau document
      const tokenId = uuidv4();
      await setDoc(doc(db, 'notification_tokens', tokenId), {
        token,
        userId,
        deviceInfo,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
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