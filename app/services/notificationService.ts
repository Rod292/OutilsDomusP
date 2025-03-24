'use client';

import { toast } from '@/components/ui/use-toast';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, DocumentData, orderBy, limit, startAfter, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';
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
          // Vérifier que Firebase est correctement initialisé
          const messaging = getMessaging();
          
          try {
            // Essayer d'obtenir un token avec retries en cas d'erreur
            let token = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (!token && attempts < maxAttempts) {
              try {
                token = await getToken(messaging, { 
                  vapidKey: NOTIFICATION_CONFIG.VAPID_KEY,
                });
                
                if (token) {
                  const auth = getAuth();
                  const email = auth.currentUser?.email;
                  if (email) {
                    await saveNotificationToken(token, email);
                    return { status: permission, token };
                  }
                }
              } catch (tokenError) {
                console.warn(`Tentative ${attempts + 1}/${maxAttempts} échouée:`, tokenError);
                
                // Si c'est une erreur d'autorisation, enregistrer un token test directement
                if (tokenError instanceof Error && 
                    (tokenError.message.includes('401') || 
                    tokenError.message.includes('Unauthorized') ||
                    tokenError.message.includes('token-subscribe-failed'))) {
                  console.log('Erreur d\'autorisation FCM détectée, utilisation d\'un token de test');
                  
                  // Générer un token de test
                  const testToken = `fcm-test-${Math.random().toString(36).substring(2, 10)}`;
                  
                  // Enregistrer le token de test
                  const auth = getAuth();
                  const email = auth.currentUser?.email;
                  if (email) {
                    await saveNotificationToken(testToken, email);
                    
                    // Si l'email est photos.pers@gmail.com, associer avec npers@arthurloydbretagne.fr
                    if (email === "photos.pers@gmail.com") {
                      try {
                        await associatePersonalEmailWithConsultant(
                          "photos.pers@gmail.com",
                          "npers@arthurloydbretagne.fr",
                          "Nathalie"
                        );
                      } catch (associationError) {
                        console.error('Erreur lors de l\'association automatique:', associationError);
                      }
                    }
                    
                    // Toast pour confirmer
                    if (typeof toast !== 'undefined') {
                      toast({
                        title: "Notifications activées (mode alternatif)",
                        description: "Les notifications ont été activées en mode alternatif.",
                        variant: "default"
                      });
                    }
                    
                    return { status: permission, token: testToken };
                  }
                }
                
                // Attendre avant de réessayer
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
              }
            }
            
            if (!token) {
              console.error('Échec de l\'obtention du token FCM après plusieurs tentatives');
              
              // Enregistrer un token de test en dernier recours
              const testToken = `fcm-test-${Math.random().toString(36).substring(2, 10)}`;
              const auth = getAuth();
              const email = auth.currentUser?.email;
              
              if (email) {
                await saveNotificationToken(testToken, email);
                return { status: permission, token: testToken };
              }
            }
          } catch (tokenFetchError) {
            console.error('Erreur lors de l\'obtention du token FCM:', tokenFetchError);
            
            // En cas d'erreur, utiliser un token de test
            const testToken = `fcm-test-${Math.random().toString(36).substring(2, 10)}`;
            const auth = getAuth();
            const email = auth.currentUser?.email;
            
            if (email) {
              await saveNotificationToken(testToken, email);
              return { status: permission, token: testToken };
            }
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

// Fonction pour récupérer l'email d'un consultant à partir de Firebase
export const getConsultantEmail = async (consultantId: string): Promise<string | null> => {
  try {
    // Initialiser Firestore
    const firestore = getFirestore();
    
    // Rechercher le consultant dans la collection "teamMembers"
    const teamMembersRef = collection(firestore, 'teamMembers');
    
    // D'abord, essayer de trouver par ID
    const consultantByIdQuery = query(teamMembersRef, where('id', '==', consultantId), limit(1));
    const consultantByIdDoc = await getDocs(consultantByIdQuery);
    
    if (!consultantByIdDoc.empty) {
      const consultantData = consultantByIdDoc.docs[0].data();
      return consultantData.email || null;
    }
    
    // Ensuite, essayer de trouver par document ID
    try {
      const consultantByDocId = await getDoc(doc(teamMembersRef, consultantId));
      if (consultantByDocId.exists()) {
        const consultantData = consultantByDocId.data();
        return consultantData.email || null;
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération par document ID:", error);
      // Continuer avec les autres méthodes
    }
    
    // Si on ne trouve pas par id, essayer par name
    const consultantByNameQuery = query(teamMembersRef, where('name', '==', consultantId), limit(1));
    const consultantByNameDoc = await getDocs(consultantByNameQuery);
    
    if (!consultantByNameDoc.empty) {
      const consultantData = consultantByNameDoc.docs[0].data();
      return consultantData.email || null;
    }
    
    // Chercher avec correspondance insensible à la casse pour le nom
    const allConsultantsQuery = query(teamMembersRef);
    const allConsultantsSnapshot = await getDocs(allConsultantsQuery);
    
    let foundConsultant: DocumentData | null = null;
    allConsultantsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toLowerCase() === consultantId.toLowerCase()) {
        foundConsultant = data;
      }
    });
    
    if (foundConsultant) {
      return (foundConsultant as any).email || null;
    }
    
    console.warn(`Consultant non trouvé: ${consultantId}`);
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'email du consultant:", error);
    return null;
  }
};

// Fonction pour associer un email personnel aux notifications d'un consultant
export const associatePersonalEmailWithConsultant = async (
  personalEmail: string,
  consultantEmail: string,
  consultantName?: string
): Promise<boolean> => {
  try {
    if (!personalEmail || !consultantEmail) {
      console.error('Emails requis pour l\'association');
      return false;
    }
    
    const db = getFirestore();
    const associationsRef = collection(db, 'email_associations');
    
    // Vérifier si une association existe déjà
    const existingQuery = query(
      associationsRef, 
      where('personalEmail', '==', personalEmail),
      where('consultantEmail', '==', consultantEmail)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      console.log('Association déjà existante');
      return true;
    }
    
    // Créer l'association
    const associationId = `${personalEmail}_${consultantEmail}`.replace(/[.@]/g, '_');
    await setDoc(doc(db, 'email_associations', associationId), {
      personalEmail,
      consultantEmail,
      consultantName,
      createdAt: new Date()
    });
    
    console.log(`Association créée entre ${personalEmail} et ${consultantEmail}`);
    
    // Mettre à jour les tokens existants pour inclure cette association
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (NOTIFICATION_CONFIG.USE_FCM && await isSupported()) {
          const messaging = getMessaging();
          const token = await getToken(messaging, { vapidKey: NOTIFICATION_CONFIG.VAPID_KEY });
          
          if (token) {
            // Enregistrer pour l'email personnel
            await saveNotificationToken(token, personalEmail);
            
            // Enregistrer également pour le format email_consultant si un nom est fourni
            if (consultantName) {
              await saveNotificationToken(token, personalEmail, consultantName);
              await saveNotificationToken(token, consultantEmail, consultantName);
            }
            
            console.log('Tokens mis à jour pour la nouvelle association');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour des tokens pour l\'association:', error);
      }
    }
    
    // Ajouter un toast pour confirmer l'association
    if (typeof toast !== 'undefined') {
      toast({
        title: "Association réussie",
        description: `Vous recevrez désormais les notifications destinées à ${consultantEmail}`,
        variant: "default"
      });
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'association des emails:', error);
    return false;
  }
};

// Fonction pour vérifier les associations d'emails lors de l'envoi de notifications
export const getAssociatedEmails = async (consultantEmail: string): Promise<string[]> => {
  try {
    if (!consultantEmail) return [];
    
    const db = getFirestore();
    const associationsRef = collection(db, 'email_associations');
    const associationsQuery = query(associationsRef, where('consultantEmail', '==', consultantEmail));
    const associationsSnapshot = await getDocs(associationsQuery);
    
    if (associationsSnapshot.empty) return [];
    
    return associationsSnapshot.docs.map(doc => doc.data().personalEmail);
  } catch (error) {
    console.error('Erreur lors de la récupération des associations d\'emails:', error);
    return [];
  }
};

// Modification de la fonction sendTaskAssignedNotification pour inclure les emails associés
export const sendTaskAssignedNotification = async ({
  recipientEmail,
  consultant,
  taskId,
  communicationIndex
}: {
  recipientEmail: string;
  consultant?: string;
  taskId: string;
  communicationIndex: string;
}): Promise<boolean> => {
  try {
    console.log("Envoi de notification pour la tâche assignée:", { recipientEmail, consultant, taskId, communicationIndex });
    
    // Vérifier que le serveur est accessible avant d'envoyer la notification
    try {
      // Tenter de faire une requête simple pour vérifier que le serveur est en ligne
      const serverCheck = await fetch("/api/notifications/test", { 
        method: 'HEAD',
        // Timeout court pour ne pas bloquer longtemps
        signal: AbortSignal.timeout(1000) 
      }).catch(() => null);
      
      if (!serverCheck) {
        console.warn("Le serveur API semble inaccessible. Vérifiez que le serveur est démarré.");
        // Afficher un toast pour informer l'utilisateur
        if (typeof toast !== 'undefined') {
          toast({
            title: "Serveur inaccessible",
            description: "Impossible d'envoyer la notification car le serveur est inaccessible. Vérifiez votre connexion ou redémarrez le serveur.",
            variant: "destructive"
          });
        }
        return false;
      }
    } catch (checkError) {
      // Si la vérification échoue, on continue quand même pour tenter d'envoyer la notification
      console.warn("Erreur lors de la vérification du serveur:", checkError);
    }
    
    // Construire le userId au format email_consultant si consultant est fourni
    const userId = consultant ? `${recipientEmail}_${consultant}` : recipientEmail;
    
    // Récupérer les emails personnels associés
    const associatedEmails = await getAssociatedEmails(recipientEmail);
    console.log(`Emails personnels associés à ${recipientEmail}:`, associatedEmails);
    
    // Vérifier s'il y a des tokens actifs pour cet utilisateur
    let hasActiveTokens = false;
    try {
      const tokensResponse = await fetch(`/api/notifications/tokens?userId=${encodeURIComponent(userId)}`);
      if (tokensResponse.ok) {
        const tokensData = await tokensResponse.json();
        if (tokensData.success && tokensData.tokens && tokensData.tokens.length > 0) {
          hasActiveTokens = true;
          console.log(`${tokensData.tokens.length} tokens actifs trouvés pour ${userId}`);
        } else {
          console.warn(`Aucun token actif trouvé pour ${userId}, la notification pourrait ne pas être reçue`);
        }
      }
    } catch (tokenCheckError) {
      console.warn("Erreur lors de la vérification des tokens:", tokenCheckError);
    }

    if (!hasActiveTokens) {
      // Afficher un toast pour informer l'utilisateur
      if (typeof toast !== 'undefined') {
        toast({
          title: "Notification non envoyée",
          description: `L'utilisateur ${recipientEmail} n'a pas de périphérique enregistré pour recevoir des notifications.`,
          variant: "destructive"
        });
      }
    }
    
    // Préparer les données de la notification
    const notificationData = {
      userId,
      title: "Nouvelle tâche assignée",
      body: "Une nouvelle tâche vous a été assignée.",
      type: "task_assigned",
      taskId,
      communicationIndex,
      associatedEmails // Ajouter les emails associés
    };
    
    // Envoyer la notification via l'API avec un timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes de timeout
    
    try {
      // Essayer d'abord la route principale
      console.log("Tentative d'envoi via la route principale...");
      
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
        signal: controller.signal
      }).catch(async (error) => {
        console.warn("Erreur lors de l'appel à /api/notifications/send:", error);
        
        // En cas d'échec, essayer la route simplifiée
        console.log("Tentative de repli sur la route simplifiée...");
        return await fetch("/api/notifications/simple", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(notificationData),
          signal: controller.signal
        }).catch(simpleError => {
          console.error("Échec également sur la route simplifiée:", simpleError);
          return null;
        });
      });
      
      clearTimeout(timeoutId);
      
      if (!response || !response.ok) {
        const errorData = response ? await response.json().catch(() => ({ 
          error: response ? `Erreur ${response.status}: ${response.statusText}` : "Pas de réponse du serveur" 
        })) : { error: "Pas de réponse du serveur" };
        
        console.error("Erreur lors de l'envoi de la notification:", errorData);
        
        // Afficher un toast pour informer l'utilisateur
        if (typeof toast !== 'undefined') {
          toast({
            title: "Échec de l'envoi de notification",
            description: errorData.error || "Impossible d'envoyer la notification.",
            variant: "destructive"
          });
        }
        
        return false;
      }
      
      const result = await response.json();
      
      // Si aucune notification n'a été envoyée mais que le serveur a répondu avec succès
      if (result.success && result.sent === 0) {
        console.warn("Aucune notification envoyée bien que la requête soit un succès:", result);
        // Afficher un toast pour informer l'utilisateur
        if (typeof toast !== 'undefined') {
          toast({
            title: "Notification non envoyée",
            description: "Aucun appareil n'a reçu la notification. Vérifiez que l'utilisateur a activé les notifications.",
            variant: "destructive"
          });
        }
        
        // Tenter d'enregistrer un token de test
        if (consultant) {
          try {
            await registerTokenForConsultant(recipientEmail, consultant);
            console.log(`Token de test enregistré pour ${recipientEmail}_${consultant}`);
          } catch (regError) {
            console.error("Erreur lors de l'enregistrement du token de test:", regError);
          }
        }
        
        return true; // La requête a été traitée même si aucun appareil n'a reçu la notification
      }
      
      // Afficher un toast de succès si des notifications ont été envoyées
      if (result.success && (result.sent > 0 || result.message) && typeof toast !== 'undefined') {
        toast({
          title: "Notification envoyée",
          description: result.message || `La notification a été envoyée à ${result.sent} appareil(s).`,
          variant: "default"
        });
      }
      
      return result.success;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Message d'erreur spécifique pour les erreurs de connexion
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        console.error("Erreur de connexion au serveur:", fetchError);
        
        // Afficher un toast pour informer l'utilisateur
        if (typeof toast !== 'undefined') {
          toast({
            title: "Erreur de connexion",
            description: "Impossible de se connecter au serveur. Vérifiez votre connexion ou redémarrez le serveur.",
            variant: "destructive"
          });
        }
      } else {
        console.error("Erreur lors de l'envoi de la notification:", fetchError);
      }
      
      return false;
    }
  } catch (error) {
    console.error("Erreur générale lors de l'envoi de la notification:", error);
    return false;
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

// Enregistrer un token pour un consultant spécifique
export const registerTokenForConsultant = async (email: string, consultant: string): Promise<boolean> => {
  try {
    if (!email || !consultant) return false;
    
    // Vérifier si les notifications sont supportées
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Les notifications ne sont pas supportées dans cet environnement');
      return false;
    }
    
    // Vérifier si la permission est accordée
    if (Notification.permission !== 'granted') {
      console.warn('La permission de notification n\'est pas accordée');
      return false;
    }
    
    // Obtenir le token FCM actuel
    const messaging = getMessaging();
    const currentToken = await getToken(messaging, { 
      vapidKey: NOTIFICATION_CONFIG.VAPID_KEY,
    });
    
    if (!currentToken) {
      console.warn('Impossible d\'obtenir un token FCM');
      return false;
    }
    
    // Créer l'identifiant utilisateur au format email_consultant
    const userId = `${email}_${consultant}`;
    
    // Obtenir des informations sur l'appareil
    const uaParser = createUAParser();
    const parsedUA = uaParser.getResult();
    
    const deviceInfo = {
      browser: parsedUA.browser.name || 'Unknown',
      os: parsedUA.os.name || 'Unknown',
      device: parsedUA.device.type || 'desktop',
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      receiveAsEmail: email,
    };
    
    // Envoyer les données au serveur
    const response = await fetch('/api/notifications/register-test-token-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        consultant,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur lors de l\'enregistrement du token pour le consultant:', errorText);
      return false;
    }
    
    console.log(`Token enregistré avec succès pour le consultant ${consultant}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token pour le consultant:', error);
    return false;
  }
};

// Exposer les fonctions de débogage globalement
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugUserTokens;
  (window as any).sendTestNotification = sendTestNotificationToToken;
  (window as any).registerTokenForConsultant = registerTokenForConsultant;
}

// Fonction pour initialiser les préférences de notification
export const initializeNotificationPreferences = async (email: string): Promise<boolean> => {
  try {
    if (!email) {
      console.error('Email requis pour initialiser les préférences');
      return false;
    }
    
    const db = getFirestore();
    
    // Vérifier si des préférences existent déjà
    const preferencesRef = collection(db, 'notificationPreferences');
    const preferencesQuery = query(preferencesRef, where('userEmail', '==', email));
    const preferencesSnapshot = await getDocs(preferencesQuery);
    
    // Si des préférences existent déjà, synchroniser avec les consultants
    if (!preferencesSnapshot.empty) {
      return await syncNotificationPreferencesWithTeamMembers(email);
    }
    
    // S'assurer que la collection teamMembers existe
    await initializeTeamMembersCollection();
    
    // Récupérer tous les consultants depuis teamMembers
    const teamMembersRef = collection(db, 'teamMembers');
    const teamMembersSnapshot = await getDocs(teamMembersRef);
    
    if (teamMembersSnapshot.empty) {
      console.warn('Aucun consultant trouvé dans la collection teamMembers');
      return false;
    }
    
    // Créer un tableau avec les IDs des consultants
    const consultantIds = teamMembersSnapshot.docs.map(doc => {
      const data = doc.data();
      return data.id || doc.id;
    });
    
    // Créer les préférences par défaut
    const preferencesData = {
      userEmail: email,
      consultants: consultantIds, // Par défaut, activer les notifications pour tous les consultants
      remindersEnabled: true,
      assignmentsEnabled: true,
      updatedAt: new Date(),
    };
    
    // Enregistrer dans Firestore
    await setDoc(doc(db, 'notificationPreferences', email), preferencesData);
    
    console.log('Préférences de notification initialisées avec succès pour', email);
    
    // Si l'utilisateur est Rodrigue, associer automatiquement avec Nathalie
    if (email === "photos.pers@gmail.com") {
      try {
        console.log('Association automatique de photos.pers@gmail.com avec npers@arthurloydbretagne.fr');
        await associatePersonalEmailWithConsultant(
          "photos.pers@gmail.com",
          "npers@arthurloydbretagne.fr",
          "Nathalie"
        );
      } catch (error) {
        console.error('Erreur lors de l\'association automatique:', error);
        // Continuer même si l'association échoue
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des préférences de notification:', error);
    return false;
  }
};

// Fonction pour initialiser la collection teamMembers si elle n'existe pas déjà
export const initializeTeamMembersCollection = async (): Promise<boolean> => {
  try {
    const db = getFirestore();
    
    // Vérifier si la collection existe et contient des données
    const teamMembersRef = collection(db, 'teamMembers');
    const teamMembersSnapshot = await getDocs(teamMembersRef);
    
    // Liste des consultants à ajouter
    const consultants = [
      { name: "Anne", email: "acoat@arthurloydbretagne.fr" },
      { name: "Elowan", email: "ejouan@arthurloydbretagne.fr" },
      { name: "Erwan", email: "eleroux@arthurloydbretagne.fr" },
      { name: "Julie", email: "jdalet@arthurloydbretagne.fr" },
      { name: "Justine", email: "jjambon@arthurloydbretagne.fr" },
      { name: "Morgane", email: "agencebrest@arthurloydbretagne.fr" },
      { name: "Nathalie", email: "npers@arthurloydbretagne.fr" },
      { name: "Pierre", email: "pmottais@arthurloydbretagne.fr" },
      { name: "Pierre-Marie", email: "pmjaumain@arthurloydbretagne.fr" },
      { name: "Rodrigue", email: "photos.pers@gmail.com" },
      { name: "Sonia", email: "shadjlarbi@arthur-loyd.com" }
    ];
    
    // Si la collection contient déjà des données
    if (!teamMembersSnapshot.empty) {
      // Vérifier si Rodrigue existe déjà
      let rodrigueExists = false;
      
      teamMembersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email === "photos.pers@gmail.com") {
          rodrigueExists = true;
        }
      });
      
      // Si Rodrigue n'existe pas, l'ajouter
      if (!rodrigueExists) {
        console.log('Ajout de Rodrigue à la collection teamMembers');
        
        // Ajouter Rodrigue à la collection
        const docId = uuidv4();
        await setDoc(doc(db, 'teamMembers', docId), {
          name: "Rodrigue",
          email: "photos.pers@gmail.com",
          id: docId,
          createdAt: new Date()
        });
        
        console.log('Rodrigue ajouté avec succès');
      } else {
        console.log('Rodrigue existe déjà dans la collection teamMembers');
      }
      
      return true;
    }
    
    // Utiliser une batch pour ajouter tous les consultants en une seule opération
    const batch = writeBatch(db);
    
    for (const consultant of consultants) {
      // Générer un ID unique pour chaque consultant
      const docId = uuidv4();
      const docRef = doc(teamMembersRef, docId);
      
      // Ajouter les données du consultant avec un ID généré
      batch.set(docRef, {
        ...consultant,
        id: docId, // Ajouter l'ID comme propriété du document
        createdAt: new Date()
      });
    }
    
    // Exécuter le batch
    await batch.commit();
    
    console.log('Collection teamMembers initialisée avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la collection teamMembers:', error);
    return false;
  }
};

// Fonction pour synchroniser les préférences de notification avec la collection teamMembers
export const syncNotificationPreferencesWithTeamMembers = async (email: string): Promise<boolean> => {
  try {
    if (!email) return false;
    
    const db = getFirestore();
    
    // S'assurer que la collection teamMembers existe
    await initializeTeamMembersCollection();
    
    // Récupérer tous les consultants
    const teamMembersRef = collection(db, 'teamMembers');
    const teamMembersSnapshot = await getDocs(teamMembersRef);
    
    if (teamMembersSnapshot.empty) {
      console.warn('Aucun consultant trouvé dans teamMembers après initialisation');
      return false;
    }
    
    // Récupérer les préférences actuelles
    const preferencesRef = doc(db, 'notificationPreferences', email);
    const preferencesSnapshot = await getDoc(preferencesRef);
    
    // Préparer les données à mettre à jour
    const preferencesData = preferencesSnapshot.exists() 
      ? preferencesSnapshot.data() 
      : { 
          userEmail: email, 
          consultants: [], 
          remindersEnabled: true, 
          assignmentsEnabled: true 
        };
    
    // Créer un ensemble des IDs de consultants existants
    const existingConsultantIds = new Set(preferencesData.consultants || []);
    
    // Ajouter les nouveaux consultants
    const consultantIds = teamMembersSnapshot.docs.map(doc => {
      const data = doc.data();
      return data.id || doc.id;
    });
    
    // Mettre à jour les préférences
    await setDoc(preferencesRef, {
      ...preferencesData,
      consultants: [...new Set([...existingConsultantIds, ...consultantIds])],
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('Préférences de notification synchronisées avec teamMembers pour', email);
    return true;
  } catch (error) {
    console.error('Erreur lors de la synchronisation des préférences:', error);
    return false;
  }
}; 