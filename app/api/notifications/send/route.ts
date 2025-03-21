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
      console.log(`Aucun token trouvé pour l'utilisateur ${userId}`);
      return NextResponse.json({
        success: false,
        error: 'Aucun token trouvé',
        useLocalMode: true
      });
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
      const response = await messaging.sendEachForMulticast({
        tokens: tokensToNotify,
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
              // Utiliser un thread-id qui restera constant pour toutes les notifications destinées au même userId
              // Cela forcera iOS à remplacer/regrouper les notifications plutôt que les afficher séparément
              'thread-id': userId,
              // Ajouter le paramètre content-available pour réveiller l'app
              'content-available': 1,
              // Ajouter un identifiant de catégorie pour aider au regroupement
              'category': type || 'default',
              // Forcer le mode de présentation alert pour les notifications
              'mutable-content': 1
            }
          },
          headers: {
            // Ajouter des en-têtes pour le déduplication
            "apns-collapse-id": taskId || userId
          }
        }
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