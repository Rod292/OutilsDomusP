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
        // Créer la notification dans Firestore
        const { createNotification } = await import('@/app/services/notificationService');
        await createNotification({
          userId,
          title,
          body,
          type,
          taskId,
          read: false
        });
        console.log(`Notification enregistrée dans Firestore pour ${userId}`);
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
    const db = admin.firestore();
    const tokensSnapshot = await db.collection('notificationTokens')
      .where('userId', '==', userId)
      .get();
    
    if (tokensSnapshot.empty) {
      console.log(`Aucun token FCM trouvé pour l'utilisateur ${userId}, suggestion du mode local`);
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
    
    // Envoyer la notification avec FCM en utilisant sendEachForMulticast qui est la méthode standard
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`Notification envoyée à ${userId}:`, {
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