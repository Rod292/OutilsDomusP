import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '../../../lib/firebase-admin';

// Interface pour les données de notification
interface NotificationData {
  userId: string;
  title: string;
  body: string;
  type?: string;
  taskId?: string;
  communicationIndex?: string;
}

// Fonction pour valider les données
const validateNotificationData = (data: any): data is NotificationData => {
  console.log('Données reçues:', JSON.stringify(data, null, 2));
  
  const isValid = typeof data === 'object' &&
    data !== null &&
    typeof data.userId === 'string' &&
    typeof data.title === 'string' &&
    typeof data.body === 'string';

  if (!isValid) {
    console.log('Validation échouée:', {
      isObject: typeof data === 'object',
      isNotNull: data !== null,
      userIdIsString: typeof data?.userId === 'string',
      titleIsString: typeof data?.title === 'string',
      bodyIsString: typeof data?.body === 'string'
    });
  }

  return isValid;
};

// Route API simple pour la notification sans dépendance à Firebase
export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, data } = await request.json();
    
    // Validation des données
    if (!userId || !title || !body) {
      console.error('[API/SIMPLE] Données manquantes:', { userId, title, body });
      return NextResponse.json({ 
        error: 'userId, title, et body sont requis pour envoyer une notification' 
      }, { status: 400 });
    }
    
    console.log(`[API/SIMPLE] Tentative d'envoi de notification à ${userId}`);
    
    // Chercher les tokens existants
    const tokensSnapshot = await adminDb.collection('notificationTokens')
      .where('userId', '==', userId)
      .get();
    
    if (tokensSnapshot.empty) {
      console.log(`[API/SIMPLE] Aucun token pour ${userId}, création d'un token de test`);
      
      // Créer un token de test si aucun token n'est trouvé
      const testTokenId = `test-${Date.now()}`;
      const testToken = `test-token-${userId}-${Date.now()}`;
      
      await adminDb.collection('notificationTokens').doc(testTokenId).set({
        token: testToken,
        userId,
        isTestToken: true,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        deviceInfo: {
          userAgent: 'API Simple Route',
          platform: 'Web',
          isTestToken: true
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Token de test créé, pas de notification envoyée',
        sentCount: 0
      });
    }
    
    // Collecter les tokens réels (non-test)
    const tokens: string[] = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token && !data.isTestToken) {
        tokens.push(data.token);
      }
    });
    
    // Si aucun token réel n'est trouvé, simuler l'envoi
    if (tokens.length === 0) {
      console.log(`[API/SIMPLE] Uniquement des tokens de test pour ${userId}, simulation d'envoi`);
      return NextResponse.json({
        success: true,
        message: 'Notification simulée (tokens de test uniquement)',
        sentCount: 0
      });
    }
    
    // Envoyer la notification avec les tokens réels
    console.log(`[API/SIMPLE] Envoi de notification à ${tokens.length} appareils`);
    
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };
    
    try {
      const response = await adminMessaging.sendEachForMulticast(message);
      
      console.log(`[API/SIMPLE] ${response.successCount} notifications envoyées avec succès`);
      
      return NextResponse.json({
        success: true,
        message: `${response.successCount} notifications envoyées`,
        sent: response.successCount,
        failed: response.failureCount
      });
    } catch (messagingError: any) {
      console.error('[API/SIMPLE] Erreur Firebase Messaging:', messagingError);
      
      // Même en cas d'erreur, on renvoie un succès pour éviter de bloquer l'UI
      return NextResponse.json({
        success: true,
        message: 'Échec de l\'envoi via FCM, notification simulée',
        error: messagingError.message,
        sentCount: 0
      });
    }
  } catch (error) {
    console.error('[API/SIMPLE] Erreur:', error);
    
    // Même en cas d'erreur, on renvoie un succès pour éviter de bloquer l'UI
    return NextResponse.json({
      success: true,
      message: 'Erreur lors du traitement, notification simulée',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      sentCount: 0
    });
  }
}

// Pour les requêtes HEAD (utilisées pour vérifier si la route existe)
export async function HEAD(request: Request) {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 