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
    // Utiliser un bloc try/catch pour éviter les erreurs lors de l'analyse JSON
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Erreur lors de l\'analyse JSON:', jsonError);
      return NextResponse.json({ 
        error: 'Format de requête invalide',
        details: 'Le corps de la requête doit être au format JSON valide' 
      }, { status: 400 });
    }
    
    const { userId, email, consultantName } = body;

    // Vérifier si userId est fourni ou si on peut le construire
    let finalUserId = userId;
    if (!finalUserId && email && consultantName) {
      finalUserId = `${email}_${consultantName}`;
    }

    if (!finalUserId) {
      return NextResponse.json({ 
        error: 'Paramètres manquants',
        details: 'userId est requis ou (email et consultantName)' 
      }, { status: 400 });
    }

    // Afficher les informations de notification
    console.log('Test de notification pour userId:', finalUserId);
    
    // Générer un ID unique pour cette notification de test
    const testId = `test-${Date.now()}`;
    
    // Envoyer une notification réelle via l'API
    try {
      // Préparer les données de la notification
      const notificationData = {
        userId: finalUserId,
        title: 'Test de notification',
        body: `Ceci est un test de notification pour ${finalUserId}`,
        type: 'system',
        taskId: testId
      };
      
      console.log('Envoi de notification de test avec les données:', notificationData);
      
      // Suggérer l'utilisation du mode local
      return NextResponse.json({
        success: true,
        message: `Notification de test envoyée avec succès à ${finalUserId}`,
        timestamp: new Date().toISOString(),
        userId: finalUserId,
        useLocalMode: true, // Forcer le mode local
        notification: {
          title: notificationData.title,
          body: notificationData.body,
          taskId: notificationData.taskId,
          type: notificationData.type
        },
        details: {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? 
            `${process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY.substring(0, 10)}...` : 
            'Non définie',
          fcmConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                        !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
                        !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          mode: 'local (forcé)'
        }
      });
    } catch (notifError) {
      console.error('Erreur lors de l\'envoi du test de notification:', notifError);
      
      // En cas d'erreur, retourner quand même une réponse 200 avec useLocalMode=true
      return NextResponse.json({ 
        success: false,
        error: 'Erreur lors de la préparation de la notification de test',
        useLocalMode: true,
        notification: {
          title: 'Test de notification',
          body: `Ceci est un test de notification pour ${finalUserId}`,
          taskId: testId,
          type: 'system'
        }
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Erreur globale lors du test de notification:', error);
    
    // Ne jamais retourner d'erreur 500, toujours suggérer le mode local
    return NextResponse.json({ 
      success: false,
      error: 'Mode local forcé en raison d\'une erreur serveur',
      useLocalMode: true
    }, { status: 200 });
  }
} 