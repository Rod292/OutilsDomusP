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
import { collection, query, where, getDocs } from 'firebase/firestore';

// Collections
const TOKEN_COLLECTION = 'notificationTokens';
const NOTIFICATION_COLLECTION = 'notifications';
const PREFERENCES_COLLECTION = 'notificationPreferences';

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

// Fonction pour vérifier les préférences de notifications d'un utilisateur
async function checkNotificationPreferences(
  db: FirebaseFirestore.Firestore,
  userId: string,
  type: string
): Promise<boolean> {
  try {
    // Extraire l'email de l'utilisateur et le consultant depuis l'ID
    const [userEmail, consultantName] = userId.split('_');
    if (!userEmail || !consultantName) {
      console.log(`Format d'ID utilisateur incorrect: ${userId}`);
      return true; // Par défaut, autoriser l'envoi
    }
    
    // Mapper le nom du consultant à son email réel
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
    
    const consultant = CONSULTANTS.find(c => c.name.toLowerCase() === consultantName.toLowerCase());
    const consultantEmail = consultant ? consultant.email : `${consultantName.toLowerCase()}@arthurloydbretagne.fr`;
    
    // Rechercher les préférences avec l'API admin
    const prefsQuery = db.collection(PREFERENCES_COLLECTION)
      .where('userId', '==', userEmail)
      .where('consultantEmail', '==', consultantEmail);
    
    const prefsSnapshot = await prefsQuery.get();
    
    // Si aucune préférence n'est trouvée, autoriser par défaut
    if (prefsSnapshot.empty) {
      console.log(`Aucune préférence trouvée pour ${userId}, autorisation par défaut`);
      return true;
    }
    
    // Vérifier le type de notification
    const prefs = prefsSnapshot.docs[0].data();
    
    // Vérifier le type correspondant
    switch (type) {
      case 'task_assigned':
        return prefs.taskAssigned !== false;
      case 'communication_assigned':
        return prefs.communicationAssigned !== false;
      case 'task_reminder':
        return prefs.taskReminders !== false;
      default:
        return true; // Types non gérés sont autorisés par défaut
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des préférences:', error);
    return true; // En cas d'erreur, autoriser par défaut
  }
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
    
    const { 
      userId, 
      title, 
      body, 
      type = 'system',
      taskId = '',
      communicationIndex,
      mode = 'auto',
      data = {}
    } = await request.json();

    // Valider les paramètres requis
    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Paramètres requis manquants: userId, title, body' },
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
    
    // Initialiser Firestore
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Erreur d\'initialisation Firebase Admin'
      }, { status: 500 });
    }
    
    // Vérifier si la notification doit être envoyée selon les préférences utilisateur
    const shouldSendNotification = await checkNotificationPreferences(db, userId, type);
    
    if (!shouldSendNotification) {
      console.log(`Notification non envoyée car l'utilisateur ${userId} a désactivé les notifications de type ${type}`);
      return NextResponse.json({
        success: false,
        message: 'Notification non envoyée (désactivée dans les préférences)',
        notificationStatus: 'disabled'
      });
    }

    // Enregistrement de la notification dans Firestore
    const notificationData = {
      userId,
      title,
      body,
      type,
      taskId: taskId || null,
      communicationIndex: communicationIndex || null,
      read: false,
      timestamp: new Date(),
      data: sanitizeFirestoreData(data)
    };
    
    await db.collection(NOTIFICATION_COLLECTION).add(notificationData);
    console.log(`Notification enregistrée dans Firestore pour ${userId}`);
    
    // Extraire l'email utilisateur et le consultant à partir de l'ID
    const [userEmail, consultantName] = userId.split('_');
    console.log(`Extraction de l'email utilisateur: ${userEmail} et consultant: ${consultantName}`);

    // Si FCM est désactivé, on retourne une réponse spéciale pour le mode local
    if (!NOTIFICATION_CONFIG.USE_FCM) {
      return NextResponse.json({
        success: true,
        message: 'Notification enregistrée (mode FCM désactivé)',
        useLocalMode: true,
        notification: {
          title,
          body,
          taskId,
          type
        },
        fcmStatus: 'disabled'
      });
    }
    
    // IMPORTANTE MODIFICATION: Chercher tous les tokens pour cet email utilisateur
    // et pour la combinaison spécifique email_consultant
    let tokensQuery;
    if (consultantName) {
      // Format spécifique email_consultant
      console.log(`Recherche de tokens pour userId spécifique: ${userId} (email: ${userEmail}, consultant: ${consultantName})`);
      tokensQuery = db.collection(TOKEN_COLLECTION)
        .where('userId', '==', userId)
        .get();
    } else {
      // Dans le cas d'une notification sans consultant spécifique, utiliser seulement l'email
      console.log(`Recherche de tokens pour email: ${userEmail} (sans consultant spécifique)`);
      tokensQuery = db.collection(TOKEN_COLLECTION)
        .where('email', '==', userEmail)
        .get();
    }

    let tokensSnapshot = await tokensQuery;

    if (tokensSnapshot.empty) {
      console.log(`Aucun token trouvé pour l'utilisateur ${userId} avec la recherche principale`);
      
      // Si aucun token n'est trouvé avec userId, essayer de chercher par email
      if (consultantName) {
        console.log(`Tentative de recherche de tokens par email: ${userEmail}`);
        const emailTokensQuery = db.collection(TOKEN_COLLECTION)
          .where('email', '==', userEmail)
          .get();
          
        const emailTokensSnapshot = await emailTokensQuery;
        
        if (emailTokensSnapshot.empty) {
          console.log(`Aucun token trouvé par email pour ${userEmail}`);
          return NextResponse.json({
            success: false,
            error: 'Aucun token trouvé',
            useLocalMode: true
          });
        } else {
          console.log(`${emailTokensSnapshot.size} token(s) trouvé(s) par email pour ${userEmail}`);
          // Utiliser ces tokens à la place
          tokensSnapshot = emailTokensSnapshot;
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Aucun token trouvé',
          useLocalMode: true
        });
      }
    } else {
      console.log(`${tokensSnapshot.size} token(s) trouvé(s) pour l'utilisateur ${userId}`);
    }

    // Récupérer les tokens en évitant les doublons
    const tokens: string[] = [];
    const uniqueDeviceTokens = new Set<string>();
    const tokensWithDeviceInfo: Array<{token: string, platform: string, isAppleDevice: boolean, timestamp: number}> = [];
    
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
            isAppleDevice,
            timestamp: tokenData.timestamp || Date.now()
          });
        }
      }
    });

    // Trier les tokens Apple par timestamp (le plus récent d'abord)
    const sortedAppleTokens = tokensWithDeviceInfo
      .filter(t => t.isAppleDevice)
      .sort((a, b) => b.timestamp - a.timestamp);

    // Récupérer les tokens non-Apple
    const nonAppleTokens = tokensWithDeviceInfo
      .filter(t => !t.isAppleDevice)
      .map(t => t.token);

    // Pour les appareils Apple, ne garder que le token le plus récent
    const tokensToNotify = [
      ...(sortedAppleTokens.length > 0 ? [sortedAppleTokens[0].token] : []),
      ...nonAppleTokens
    ];

    if (tokensToNotify.length === 0) {
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
      // Initialiser Firebase Cloud Messaging
      const messaging = admin.messaging();
      
      // Construire le message FCM avec les options spécifiques pour iOS
      const message = {
        notification: {
          title,
          body
        },
        data: {
          type,
          taskId: taskId || '',
          userId,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        // Options spécifiques pour iOS pour améliorer le regroupement
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'thread-id': `${type || 'default'}_${taskId || Date.now()}`
            }
          }
        }
      };

      // Envoyer les notifications avec les tokens filtrés
      const response = await messaging.sendEachForMulticast({
        tokens: tokensToNotify,
        ...message
      });

      console.log(`Notification envoyée (${tokensToNotify.length} appareils):`, {
        success: response.successCount,
        failure: response.failureCount,
        appleDevices: sortedAppleTokens.length,
        nonAppleDevices: nonAppleTokens.length
      });

      return NextResponse.json({
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        total: tokensToNotify.length
      });

    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
      return NextResponse.json(
        { 
          error: 'Erreur interne du serveur lors de l\'envoi de la notification',
          useLocalMode: true
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
    const notificationsSnapshot = await admin.firestore().collection(NOTIFICATION_COLLECTION)
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