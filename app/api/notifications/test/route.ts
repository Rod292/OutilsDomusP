import { NextResponse } from 'next/server';
import { sendLocalNotification } from '@/app/services/notificationService';
import { NOTIFICATION_CONFIG } from '../config';

/**
 * Endpoint pour tester l'envoi de notifications
 * Appel: POST /api/notifications/test
 * Corps: { userId: string, email?: string, consultantName?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, consultantName } = body;

    // Vérifier si userId est fourni ou si on peut le construire
    let finalUserId = userId;
    if (!finalUserId && email && consultantName) {
      finalUserId = `${email}_${consultantName}`;
    }

    if (!finalUserId) {
      return NextResponse.json({ error: 'userId est requis ou (email et consultantName)' }, { status: 400 });
    }

    // Afficher les informations de notification
    console.log('Test de notification pour userId:', finalUserId);
    
    // Envoyer une notification réelle
    try {
      // Envoyer via l'API de notification
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: finalUserId,
          title: 'Test de notification',
          body: `Ceci est un test de notification pour ${finalUserId}`,
          type: 'system',
          taskId: 'test-' + Date.now()
        })
      });

      const apiResult = await response.json();
      
      // Si l'API suggère le mode local, envoyer une notification locale
      if (apiResult.useLocalMode) {
        const localResult = await sendLocalNotification({
          title: 'Test de notification locale',
          body: `Ceci est un test de notification locale pour ${finalUserId}`,
          data: {
            userId: finalUserId,
            type: 'system',
            taskId: 'test-' + Date.now()
          }
        });
        
        console.log('Résultat notification locale:', localResult);
      }
      
      return NextResponse.json({
        success: true,
        message: `Notification de test envoyée avec succès à ${finalUserId}`,
        timestamp: new Date().toISOString(),
        userId: finalUserId,
        apiResult,
        details: {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? 
            `${process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY.substring(0, 10)}...` : 
            'Non définie',
          fcmConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                        !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
                        !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          mode: NOTIFICATION_CONFIG.USE_FCM ? 'FCM' : 'local'
        }
      });
    } catch (notifError) {
      console.error('Erreur lors de l\'envoi du test de notification:', notifError);
      return NextResponse.json({ 
        error: 'Erreur lors de l\'envoi de la notification de test',
        details: notifError
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erreur lors du test de notification:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
} 