import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../config';

// Cette API route vérifie si un utilisateur a activé les notifications pour un consultant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const consultantName = searchParams.get('consultantName');
    
    if (!userEmail || !consultantName) {
      return NextResponse.json({ 
        error: 'Paramètres requis manquants',
        hasPermission: false
      }, { status: 400 });
    }

    // Construire l'identifiant de notification (email_consultant)
    const notificationId = `${userEmail}_${consultantName}`;
    
    // Vérifier dans Firestore si des tokens existent pour cet identifiant
    const tokensQuery = adminDb
      .collection('notificationTokens')
      .where('userId', '==', notificationId);

    const snapshot = await tokensQuery.get();
    const hasPermission = !snapshot.empty;
    
    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      hasPermission: false
    }, { status: 500 });
  }
} 