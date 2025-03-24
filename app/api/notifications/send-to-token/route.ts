import { NextRequest, NextResponse } from 'next/server';
import admin from '@/app/firebase-admin';
import { NOTIFICATION_CONFIG } from '../config';

// Initialiser l'application Firebase Admin si nécessaire
// (déjà fait dans l'import)

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification si l'API key est activée
    if (NOTIFICATION_CONFIG.USE_API_KEY) {
      const authHeader = request.headers.get('Authorization');
      const apiKey = process.env.NOTIFICATIONS_API_KEY;
      
      // Vérifier si c'est une requête locale
      const origin = request.headers.get('origin') || '';
      const referer = request.headers.get('referer') || '';
      const host = request.headers.get('host') || '';
      const isLocalRequest = host.includes('localhost') || 
                             origin.includes('localhost') ||
                             referer.includes('localhost');
      
      if (!isLocalRequest && (!authHeader || authHeader !== apiKey)) {
        return NextResponse.json(
          { error: 'Non autorisé: API key invalide ou manquante' },
          { status: 401 }
        );
      }
    }
    
    const { token, title, body, data = {} } = await request.json();

    // Valider les paramètres requis
    if (!token || !title || !body) {
      return NextResponse.json(
        { error: 'Paramètres requis manquants: token, title, body' },
        { status: 400 }
      );
    }
    
    // Journaliser la demande de test
    console.log(`Test d'envoi direct de notification:`, {
      token: token.substring(0, 10) + '...',
      title,
      body
    });
    
    // Si FCM est désactivé, on retourne une réponse spéciale
    if (!NOTIFICATION_CONFIG.USE_FCM) {
      return NextResponse.json({
        success: false,
        message: 'Mode FCM désactivé',
        useLocalMode: true,
        fcmStatus: 'disabled'
      });
    }
    
    try {
      // Initialiser Firebase Cloud Messaging
      const messaging = admin.messaging();
      
      // Construire le message FCM
      const message: any = {
        notification: {
          title,
          body
        },
        data: {
          type: 'test',
          timestamp: Date.now().toString(),
          ...data
        },
        token
      };

      // Envoyer la notification
      const response = await messaging.send(message);

      console.log(`Test notification envoyée, réponse:`, response);
      
      // Enregistrer la notification dans Firestore pour garder une trace
      try {
        const db = admin.firestore();
        await db.collection('notifications').add({
          token,
          title,
          body, 
          timestamp: new Date(),
          success: true,
          type: 'test',
          read: false
        });
      } catch (dbError) {
        console.warn('Erreur lors de l\'enregistrement de la notification de test:', dbError);
        // Ne pas échouer pour cette erreur
      }

      return NextResponse.json({
        success: true,
        messageId: response,
        message: 'Test notification envoyée avec succès'
      });

    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du test de notification:', error);
      
      let errorMessage = 'Erreur lors de l\'envoi de la notification';
      let errorCode = 'unknown_error';
      
      // Vérifier si le token est valide
      if (error.code === 'messaging/invalid-argument' || 
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-recipient') {
        
        // Marquer le token comme obsolète dans Firestore
        try {
          const db = admin.firestore();
          const tokenQuery = await db.collection('notificationTokens')
            .where('token', '==', token)
            .get();
          
          if (!tokenQuery.empty) {
            await db.collection('notificationTokens')
              .doc(tokenQuery.docs[0].id)
              .update({
                obsolete: true,
                lastUpdated: new Date()
              });
            
            console.log('Token marqué comme obsolète');
          }
        } catch (dbError) {
          console.warn('Erreur lors du marquage du token comme obsolète:', dbError);
        }
        
        errorMessage = 'Token FCM invalide ou expiré. Il sera supprimé automatiquement.';
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          errorCode: error.code || 'unknown_error',
          details: error.message || 'Pas de détails disponibles'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erreur lors du traitement de la requête:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur interne du serveur',
        details: error.message || 'Pas de détails disponibles'
      },
      { status: 500 }
    );
  }
} 