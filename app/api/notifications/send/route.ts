/**
 * @route POST /api/notifications/send
 * @description Endpoint pour envoyer une notification à un utilisateur spécifique
 * @body {
 *   userId: string, // ID de l'utilisateur au format "email_consultant"
 *   title: string, // Titre de la notification
 *   body: string, // Corps de la notification
 *   type: "task_assigned" | "task_reminder" | "system", // Type de notification
 *   taskId?: string // ID de la tâche (optionnel)
 * }
 * @headers {
 *   Authorization?: string // Clé API pour l'authentification (requise en production)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/app/firebase-admin';
import { NOTIFICATION_CONFIG } from '../config';

// Vérifier si l'admin est correctement initialisé
const getAdminFirestore = () => {
  try {
    return admin.firestore();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
    return null;
  }
};

// CORRECTION: Ajouter cette fonction pour nettoyer les données avant de les envoyer à Firestore
function sanitizeFirestoreData(data: any): any {
  // Si null ou undefined, retourner null (Firestore accepte null mais pas undefined)
  if (data === undefined || data === null) {
    return null;
  }
  
  // Si c'est un objet (mais pas un tableau), nettoyer chaque propriété
  if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
    const result: any = {};
    
    // Parcourir toutes les propriétés de l'objet
    Object.keys(data).forEach(key => {
      // Récursivité pour nettoyer les sous-objets
      const value = sanitizeFirestoreData(data[key]);
      
      // Ne pas inclure les propriétés undefined
      if (value !== undefined) {
        result[key] = value;
      }
    });
    
    return result;
  }
  
  // Si c'est un tableau, nettoyer chaque élément
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item));
  }
  
  // Retourner la valeur telle quelle pour les types primitifs
  return data;
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification si l'API key est activée
    if (NOTIFICATION_CONFIG.USE_API_KEY) {
      const authHeader = request.headers.get('Authorization');
      const apiKey = process.env.NOTIFICATIONS_API_KEY;
      
      // Vérifier si c'est une requête locale ou du même domaine
      const origin = request.headers.get('origin') || '';
      const referer = request.headers.get('referer') || '';
      const host = request.headers.get('host') || '';
      
      // Autoriser les requêtes locales (localhost) ou du même domaine que le serveur
      const isLocalRequest = host.includes('localhost') || 
                             origin.includes('localhost') ||
                             referer.includes('localhost');
      
      // Autoriser les requêtes du même domaine
      const currentDomain = host.replace(/:\d+$/, ''); // Enlever le port éventuel
      const isSameDomain = (origin && origin.includes(currentDomain)) || 
                          (referer && referer.includes(currentDomain));
      
      if (!isLocalRequest && !isSameDomain && (!authHeader || authHeader !== apiKey)) {
        console.error('Erreur d\'authentification pour les notifications:', { 
          authHeader,
          origin,
          referer,
          host,
          currentDomain,
          isLocalRequest,
          isSameDomain
        });
        
        return NextResponse.json(
          { error: 'Non autorisé: API key invalide ou manquante' },
          { status: 401 }
        );
      }
    }
    
    // Extraire les données de la notification
    const data = await request.json();
    const { userId, title, body, type, taskId } = data;
    
    // Vérifier les paramètres requis
    if (!userId || !title || !body || !type) {
      return NextResponse.json(
        { error: 'Paramètres manquants: userId, title, body et type sont requis' },
        { status: 400 }
      );
    }
    
    // Journaliser la demande de notification
    console.log(`Demande d'envoi de notification:`, {
      userId,
      title,
      body,
      type,
      taskId: taskId || 'non spécifié',
      mode: NOTIFICATION_CONFIG.USE_FCM ? 'FCM' : 'local'
    });
    
    // Enregistrer la notification dans Firestore
    if (NOTIFICATION_CONFIG.STORE_NOTIFICATIONS) {
      try {
        // On n'utilise plus l'import dynamique ici car il cause des problèmes d'initialisation
        // Utiliser directement Firestore Admin
        const db = getAdminFirestore();
        
        if (db) {
          // CORRECTION: Nettoyer les données avant de les ajouter à Firestore
          const cleanedData = sanitizeFirestoreData({
            userId,
            title,
            body,
            type,
            taskId: taskId || null, // Utiliser null au lieu de undefined
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Créer la notification directement dans Firestore
          await db.collection('notifications').add(cleanedData);
          
          console.log(`Notification enregistrée dans Firestore pour ${userId}`);
        } else {
          console.warn('Impossible d\'enregistrer la notification dans Firestore: Admin non initialisé');
        }
      } catch (firestoreError) {
        console.error('Erreur lors de l\'enregistrement de la notification dans Firestore:', firestoreError);
        // Continuer malgré l'erreur, car on peut toujours essayer d'envoyer la notification
      }
    }
    
    // Si FCM est désactivé, on retourne une réponse spéciale pour le mode local
    if (!NOTIFICATION_CONFIG.USE_FCM) {
      return NextResponse.json({
        success: true,
        message: 'Notification enregistrée (mode FCM désactivé)',
        useLocalMode: true, // Indique au client qu'il doit utiliser le mode local
        notification: {
          title,
          body,
          taskId,
          type
        },
        fcmStatus: 'disabled'
      });
    }
    
    // Chercher les tokens FCM pour cet utilisateur dans Firestore
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({
        success: false,
        useLocalMode: true,
        notification: {
          title,
          body,
          taskId,
          type
        },
        warning: 'Firebase Admin non initialisé, utilisation du mode local'
      });
    }
    
    // MODIFICATION: Extraire l'email de l'utilisateur depuis userId (format: email_consultant)
    const userEmail = userId.includes('_') ? userId.split('_')[0] : userId;
    const consultantName = userId.includes('_') ? userId.split('_')[1] : '';

    console.log(`Extraction de l'email utilisateur: ${userEmail} et consultant: ${consultantName}`);

    // IMPORTANTE MODIFICATION: Chercher tous les tokens pour cet email utilisateur
    // et pour la combinaison spécifique email_consultant
    let tokensQuery;
    if (consultantName) {
      // Format spécifique email_consultant
      tokensQuery = db.collection('notificationTokens')
        .where('userId', '==', userId)
        .get();
    } else {
      // Dans le cas d'une notification sans consultant spécifique, utiliser seulement l'email
      tokensQuery = db.collection('notificationTokens')
        .where('email', '==', userEmail)
        .get();
    }

    const tokensSnapshot = await tokensQuery;

    if (tokensSnapshot.empty) {
      console.log(`Aucun token FCM trouvé pour l'utilisateur ${userId}, recherche de tokens par email: ${userEmail}`);
      
      // Si aucun token trouvé pour la combinaison spécifique, essayer de trouver des tokens pour l'email
      // Cela permettra d'envoyer des notifications à tous les appareils de l'utilisateur
      if (consultantName) {
        const emailTokensQuery = await db.collection('notificationTokens')
          .where('email', '==', userEmail)
          .get();
        
        if (emailTokensQuery.empty) {
          console.log(`Aucun token trouvé pour l'email ${userEmail}, suggestion du mode local`);
          return NextResponse.json({
            success: false,
            useLocalMode: true,
            notification: {
              title,
              body,
              taskId,
              type
            },
            warning: `Aucun token FCM trouvé pour l'utilisateur ${userEmail}`
          }, { status: 404 });
        }
        
        // Utiliser les tokens trouvés par email
        const tokens: string[] = [];
        emailTokensQuery.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const tokenData = doc.data();
          if (tokenData.token && tokenData.token !== 'local-notifications-mode') {
            tokens.push(tokenData.token);
          }
        });
        
        if (tokens.length === 0) {
          console.log(`Aucun token FCM valide trouvé pour l'email ${userEmail}, suggestion du mode local`);
          return NextResponse.json({
            success: false,
            useLocalMode: true,
            notification: {
              title,
              body,
              taskId,
              type
            },
            warning: `Aucun token FCM valide trouvé pour l'email ${userEmail}`
          }, { status: 404 });
        }
        
        // Construire le message FCM
        const message = {
          notification: {
            title,
            body,
          },
          data: {
            type,
            userId,
            ...(taskId ? { taskId } : {})
          },
          tokens
        };
        
        // Envoyer la notification avec FCM
        const messaging = admin.messaging();
        if (!messaging) {
          return NextResponse.json({
            success: false, 
            useLocalMode: true,
            notification: {
              title,
              body,
              taskId,
              type
            },
            warning: 'Firebase Messaging non initialisé, utilisation du mode local'
          });
        }
        
        const response = await messaging.sendEachForMulticast(message);
        
        console.log(`Notification envoyée à tous les appareils de ${userEmail} (${tokens.length} appareils):`, {
          success: response.successCount,
          failure: response.failureCount,
          tokens: tokens.length
        });
        
        // Si l'envoi a échoué pour tous les tokens, suggérer le mode local
        if (response.successCount === 0 && response.failureCount > 0) {
          return NextResponse.json({
            success: false,
            sent: 0,
            failed: response.failureCount,
            useLocalMode: true,
            notification: {
              title,
              body,
              taskId,
              type
            },
            warning: 'Tous les envois FCM ont échoué, essayez le mode local'
          });
        }
        
        return NextResponse.json({
          success: true,
          sent: response.successCount,
          failed: response.failureCount,
          total: tokens.length,
        });
      }
      
      return NextResponse.json({
        success: false,
        useLocalMode: true,
        notification: {
          title,
          body,
          taskId,
          type
        },
        warning: `Aucun token FCM trouvé pour l'utilisateur ${userId}`
      }, { status: 404 });
    }
    
    // Récupérer les tokens en évitant les doublons
    const tokens: string[] = [];
    const uniqueDeviceTokens = new Set<string>();
    const tokensWithDeviceInfo: Array<{token: string, platform: string, isAppleDevice: boolean}> = [];
    
    tokensSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const tokenData = doc.data();
      if (tokenData.token && tokenData.token !== 'local-notifications-mode') {
        // Vérifier si nous avons déjà ce token
        if (!uniqueDeviceTokens.has(tokenData.token)) {
          uniqueDeviceTokens.add(tokenData.token);
          tokens.push(tokenData.token);
          
          // Ajouter des infos sur la plateforme pour faire des ajustements par appareil
          const isAppleDevice = tokenData.userAgent?.toLowerCase().includes('iphone') || 
                              tokenData.userAgent?.toLowerCase().includes('ipad') || 
                              tokenData.userAgent?.toLowerCase().includes('mac') ||
                              tokenData.platform?.toLowerCase().includes('iphone') ||
                              tokenData.platform?.toLowerCase().includes('ipad') ||
                              tokenData.platform?.toLowerCase().includes('mac');
                              
          tokensWithDeviceInfo.push({
            token: tokenData.token,
            platform: tokenData.platform || 'unknown',
            isAppleDevice
          });
        }
      }
    });
    
    if (tokens.length === 0) {
      console.log(`Aucun token FCM valide trouvé pour l'utilisateur ${userId}, suggestion du mode local`);
      return NextResponse.json({
        success: false,
        useLocalMode: true,
        notification: {
          title,
          body,
          taskId,
          type
        },
        warning: `Aucun token FCM valide trouvé pour l'utilisateur ${userId}`
      }, { status: 404 });
    }
    
    try {
      // Vérifier si la notification concerne Instagram et si c'est un appareil Apple
      const isInstagramNotification = 
        (body?.toLowerCase().includes('instagram') || 
         title?.toLowerCase().includes('instagram') ||
         type?.toLowerCase().includes('instagram') ||
         data?.communicationType?.toLowerCase() === 'post_instagram');
      
      // Initialiser Firebase Cloud Messaging si ce n'est pas déjà fait
      const messaging = admin.messaging();
      
      // Ajuster le titre et le corps de la notification pour les appareils iOS
      const notificationTitle = title;
      const notificationBody = body;
      
      // Constuire les données de la notification
      // CORRECTION: Utiliser sanitizeFirestoreData pour éliminer les undefined
      const sanitizedData = sanitizeFirestoreData({
        type,
        taskId: taskId || null,
        ...data // Inclure les autres données (comme communicationIndex)
      });
      
      // Pour éviter les notifications en double sur iOS pour tous les types de notifications
      let tokensToNotify = tokens;
      
      // Récupérer les tokens pour les appareils Apple et non-Apple
      const appleDeviceTokens = tokensWithDeviceInfo.filter(t => t.isAppleDevice).map(t => t.token);
      const nonAppleDeviceTokens = tokensWithDeviceInfo.filter(t => !t.isAppleDevice).map(t => t.token);
      
      // Si l'utilisateur a des appareils Apple, n'en notifier qu'un seul pour éviter les doublons
      if (appleDeviceTokens.length > 0) {
        // Prendre seulement le token de l'appareil Apple le plus récent
        tokensToNotify = [appleDeviceTokens[0], ...nonAppleDeviceTokens];
        console.log(`Notification: Limitation à un seul appareil Apple (${appleDeviceTokens.length} disponibles)`);
      }
      
      // Envoyer les notifications avec les tokens filtrés
      const response = await messaging.sendEachForMulticast({
        tokens: tokensToNotify,
        notification: {
          title: notificationTitle,
          body: notificationBody
        },
        data: sanitizedData,
        // Options spécifiques pour iOS
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              // Utiliser un thread-id constant pour chaque type de notification
              // pour éviter les doublons et améliorer le regroupement
              'thread-id': isInstagramNotification ? 'instagram' : type || 'default'
            }
          }
        }
      });
      
      console.log(`Notification envoyée à tous les appareils de ${userEmail} (${tokensToNotify.length} appareils):`, {
        success: response.successCount,
        failure: response.failureCount,
        tokens: tokensToNotify.length
      });
      
      // Si l'envoi a échoué pour tous les tokens, suggérer le mode local
      if (response.successCount === 0 && response.failureCount > 0) {
        return NextResponse.json({
          success: false,
          sent: 0,
          failed: response.failureCount,
          useLocalMode: true,
          notification: {
            title,
            body,
            taskId,
            type
          },
          warning: 'Tous les envois FCM ont échoué, essayez le mode local'
        });
      }
      
      return NextResponse.json({
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        total: tokensToNotify.length,
      });
    } catch (error) {
      console.error('Erreur lors de la vérification de la notification:', error);
      return NextResponse.json(
        { 
          error: 'Erreur interne du serveur lors de la vérification de la notification',
          useLocalMode: true, // Suggérer le mode local en cas d'erreur
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur lors de l\'envoi de la notification',
        useLocalMode: true, // Suggérer le mode local en cas d'erreur
      },
      { status: 500 }
    );
  }
}

// Endpoint pour récupérer les notifications d'un utilisateur
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      );
    }

    // Récupérer les notifications de l'utilisateur
    const notificationsSnapshot = await admin.firestore().collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const notifications: any[] = [];
    notificationsSnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
} 