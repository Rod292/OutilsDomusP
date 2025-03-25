import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '../config';

// API route pour déboguer les notifications
export async function POST(request: NextRequest) {
  try {
    const { email, consultantName } = await request.json();
    
    if (!email || !consultantName) {
      return NextResponse.json({ 
        error: 'Paramètres requis manquants',
        success: false
      }, { status: 400 });
    }
    
    // Construire l'ID pour les notifications
    const notificationId = `${email}_${consultantName}`;
    console.log(`Débogage des notifications pour: ${notificationId}`);
    
    // Récupérer les tokens existants
    const tokensQuery = adminDb
      .collection('notificationTokens')
      .where('userId', '==', notificationId);
    
    const snapshot = await tokensQuery.get();
    
    if (snapshot.empty) {
      console.log(`Aucun token trouvé pour ${notificationId}`);
      
      return NextResponse.json({
        success: false,
        error: 'Aucun token trouvé',
        message: `Aucun token trouvé pour ${notificationId}`
      });
    }
    
    // Extraire les tokens
    const tokens: string[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.token && data.token !== 'local-notifications-mode') {
        tokens.push(data.token);
      }
    });
    
    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun token valide',
        message: 'Aucun token FCM valide trouvé'
      });
    }
    
    // Générer un ID unique pour cette notification de test
    const testId = `test-${Date.now()}`;
    
    // Envoyer une notification de test
    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `Test pour ${consultantName}`,
        body: `Notification générée à ${new Date().toLocaleTimeString()}`
      },
      data: {
        type: 'test',
        taskId: testId,
        timestamp: Date.now().toString()
      }
    });
    
    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length,
      message: `Notification de test envoyée à ${response.successCount} appareil(s)`
    });
  } catch (error) {
    console.error('Erreur lors du débogage des notifications:', error);
    
    return NextResponse.json({ 
      error: 'Erreur serveur',
      success: false
    }, { status: 500 });
  }
} 