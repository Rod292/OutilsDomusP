import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDujTJIyvicJnP-nMgodJs63rU0fDA69Qc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'etat-des-lieux-arthur-loyd.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'etat-des-lieux-arthur-loyd',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'etat-des-lieux-arthur-loyd.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '602323147221',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:602323147221:web:7a1d976ac0478b593b455c',
};

// Clé VAPID pour les notifications Web Push
export const VAPID_KEY = 'BGzPLt8Qmv6lFQDwKZLJzcIqH4cwWJN2P_aPCp8HYXJn7LIXHA5RL9rUd2uxSCnD2XHJZFGVtV11i3n2Ux9JYXM';

// Initialiser Firebase seulement côté client
export const initializeFirebase = () => {
  if (typeof window !== 'undefined' && !getApps().length) {
    try {
      console.log('Initialisation de Firebase...');
      return initializeApp(firebaseConfig);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firebase:', error);
      return null;
    }
  }
  return getApps().length > 0 ? getApps()[0] : null;
};

// Obtenir une instance de Firebase Messaging
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const app = initializeFirebase();
    if (!app) return null;
    
    const isSupportedMessaging = await isSupported();
    if (!isSupportedMessaging) {
      console.log('Firebase Messaging n\'est pas supporté sur ce navigateur');
      return null;
    }
    
    return getMessaging(app);
  } catch (error) {
    console.error('Erreur lors de l\'obtention de Firebase Messaging:', error);
    return null;
  }
};

// Obtenir une instance de Firestore
export const getFirestoreInstance = () => {
  try {
    const app = initializeFirebase();
    if (!app) return null;
    
    return getFirestore(app);
  } catch (error) {
    console.error('Erreur lors de l\'obtention de Firestore:', error);
    return null;
  }
};

// Demander la permission pour les notifications et obtenir un token
export const requestNotificationPermissionAndToken = async () => {
  try {
    console.log('Demande de permission pour les notifications...');
    
    // Demander la permission Notification
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permission refusée pour les notifications');
      return { status: permission };
    }
    
    console.log('Permission accordée pour les notifications');
    
    // Au lieu d'essayer d'obtenir un token FCM (qui échoue avec 401),
    // utiliser notre API server-side pour créer un token simulé
    try {
      const response = await fetch('/api/notifications/register-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: getAuth()?.currentUser?.email || 'unknown@user.com',
          consultant: new URLSearchParams(window.location.search).get('consultant') || undefined,
          userAgent: navigator.userAgent,
          platform: navigator.platform
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Token enregistré avec succès:', result);
        return { 
          status: permission, 
          token: 'server-generated-token', // Valeur symbolique car le vrai token est géré côté serveur
          success: true 
        };
      } else {
        const error = await response.json();
        console.error('Échec de l\'enregistrement du token:', error);
        return { status: permission, error };
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du token côté serveur:', error);
      return { status: permission, error };
    }
  } catch (error) {
    console.error('Erreur lors de la demande de permission pour les notifications:', error);
    return { status: 'denied', error };
  }
};

// Écouter les messages entrants lorsque l'application est au premier plan
export const onMessageListener = async (callback: (payload: any) => void) => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};
    
    return onMessage(messaging, (payload) => {
      console.log('Message reçu au premier plan:', payload);
      callback(payload);
    });
  } catch (error) {
    console.error('Erreur lors de l\'écoute des messages:', error);
    return () => {};
  }
};

// Vérifier si les notifications sont supportées
export const checkNotificationsSupport = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  // Vérifier si le navigateur supporte les notifications
  if (!('Notification' in window)) {
    console.log('Les notifications ne sont pas supportées par ce navigateur');
    return false;
  }
  
  // Vérifier si FCM est supporté
  try {
    const supported = await isSupported();
    console.log('Firebase Messaging est ' + (supported ? 'supporté' : 'non supporté'));
    return supported;
  } catch (error) {
    console.error('Erreur lors de la vérification du support de Firebase Messaging:', error);
    return false;
  }
}; 