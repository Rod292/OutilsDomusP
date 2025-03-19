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
          // Créer la notification directement dans Firestore
          await db.collection('notifications').add({
            userId,
            title,
            body,
            type,
            taskId: taskId || null,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
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
    
    // Récupérer les tokens actifs
    const tokens: string[] = [];
    tokensSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const tokenData = doc.data();
      if (tokenData.token && tokenData.token !== 'local-notifications-mode') {
        tokens.push(tokenData.token);
      }
    });

    // Chercher également tous les tokens liés à l'email de l'utilisateur
    // pour envoyer la notification à tous ses appareils
    let allTokens = [...tokens];
    if (consultantName) {
      const emailTokensQuery = await db.collection('notificationTokens')
        .where('email', '==', userEmail)
        .get();
      
      if (!emailTokensQuery.empty) {
        emailTokensQuery.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const tokenData = doc.data();
          if (tokenData.token && 
              tokenData.token !== 'local-notifications-mode' && 
              !tokens.includes(tokenData.token)) {
            allTokens.push(tokenData.token);
          }
        });
      }
    }

    if (allTokens.length === 0) {
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
      tokens: allTokens
    };
    
    // Envoyer la notification avec FCM en utilisant sendEachForMulticast qui est la méthode standard
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
    
    console.log(`Notification envoyée à tous les appareils de ${userEmail} (${allTokens.length} appareils):`, {
      success: response.successCount,
      failure: response.failureCount,
      tokens: allTokens.length
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
      total: allTokens.length,
    });
    
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