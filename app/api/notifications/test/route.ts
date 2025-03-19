import { NextResponse } from 'next/server';

/**
 * Endpoint pour tester l'envoi de notifications
 * Appel: POST /api/notifications/test
 * Corps: { userId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId est requis' }, { status: 400 });
    }

    // Afficher les informations de notification
    console.log('Test de notification pour userId:', userId);
    
    // Simuler un succès d'envoi
    return NextResponse.json({
      success: true,
      message: `Notification de test envoyée avec succès à ${userId}`,
      timestamp: new Date().toISOString(),
      userId,
      details: {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? 
          `${process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY.substring(0, 10)}...` : 
          'Non définie',
        fcmConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                      !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
                      !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      }
    });
  } catch (error) {
    console.error('Erreur lors du test de notification:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
} 