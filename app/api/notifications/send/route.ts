import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, data } = await request.json();
    
    if (!userId || !title || !body) {
      return NextResponse.json({ 
        error: 'userId, title, et body sont requis pour envoyer une notification' 
      }, { status: 400 });
    }
    
    // Recherche des tokens de l'utilisateur
    console.log(`[API] Recherche des tokens pour l'utilisateur: ${userId}`);
    const tokensRef = adminDb.collection('notificationTokens');
    
    // Requête pour trouver des tokens avec le userId exact OU qui commencent par l'email (si userId est un email)
    let querySnapshot;
    try {
      querySnapshot = await tokensRef
        .where('userId', '>=', userId)
        .where('userId', '<=', userId + '\uf8ff')
        .get();
    } catch (error) {
      console.error('[API] Erreur lors de la recherche de tokens:', error);
      throw error;
    }
    
    if (querySnapshot.empty) {
      console.log(`[API] Aucun token trouvé pour l'utilisateur: ${userId}`);
      return NextResponse.json({ 
        error: 'Aucun appareil enregistré pour cet utilisateur' 
      }, { status: 404 });
    }
    
    // Collecter tous les tokens valides
    const tokens: string[] = [];
    querySnapshot.forEach((doc) => {
      const tokenData = doc.data();
      
      if (!tokenData.token) {
        console.warn('[API] Token manquant dans le document:', doc.id);
        return; // Continuer la boucle
      }
      
      // Si c'est un token de test, on l'enregistre à part
      if (tokenData.isTestToken) {
        console.log(`[API] Token de test trouvé pour ${userId}: ${tokenData.token}`);
      } else {
        tokens.push(tokenData.token);
      }
    });
    
    console.log(`[API] ${tokens.length} tokens FCM trouvés pour l'envoi de notification`);
    
    if (tokens.length === 0) {
      console.log('[API] Uniquement des tokens de test, simulation d\'envoi...');
      return NextResponse.json({ 
        success: true, 
        info: 'Notification simulée avec tokens de test',
        sentCount: 0
      });
    }
    
    // Préparation du message
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };
    
    // Envoi des notifications - utiliser la méthode correcte de l'API Firebase Admin
    const response = await adminMessaging.sendEachForMulticast(message);
    
    console.log(`[API] Notification envoyée avec succès à ${response.successCount} appareils`);
    return NextResponse.json({ 
      success: true, 
      sent: response.successCount,
      failed: response.failureCount,
      responses: response.responses
    });
  } catch (error) {
    console.error('[API] Erreur lors de l\'envoi de notification:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de l\'envoi de notification' 
    }, { status: 500 });
  }
} 