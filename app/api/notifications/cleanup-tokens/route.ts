import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../config';

// API route pour nettoyer les tokens dupliqués
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Paramètre userId manquant',
        deletedCount: 0
      }, { status: 400 });
    }
    
    console.log(`Nettoyage des tokens dupliqués pour l'utilisateur ${userId}...`);
    
    // Récupérer tous les tokens de l'utilisateur
    const tokensQuery = adminDb
      .collection('notificationTokens')
      .where('userId', '==', userId);
    
    const snapshot = await tokensQuery.get();
    
    if (snapshot.empty) {
      console.log(`Aucun token trouvé pour l'utilisateur ${userId}`);
      return NextResponse.json({ deletedCount: 0 });
    }
    
    // Mapper les tokens par plateforme
    const tokensByPlatform: Record<string, {id: string, timestamp: number, isApple: boolean}[]> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const userAgent = (data.userAgent || '').toLowerCase();
      const platform = data.platform || 'unknown';
      
      // Déterminer si c'est un appareil Apple
      const isApple = userAgent.includes('iphone') || 
                       userAgent.includes('ipad') || 
                       userAgent.includes('macintosh') ||
                       platform.toLowerCase().includes('iphone') ||
                       platform.toLowerCase().includes('ipad') ||
                       platform.toLowerCase().includes('mac');
      
      // Utiliser une clé simplifiée pour regrouper les appareils similaires
      let deviceKey = 'other';
      if (userAgent.includes('iphone')) deviceKey = 'iphone';
      else if (userAgent.includes('ipad')) deviceKey = 'ipad';
      else if (userAgent.includes('macintosh')) deviceKey = 'mac';
      else if (userAgent.includes('android')) deviceKey = 'android';
      
      if (!tokensByPlatform[deviceKey]) {
        tokensByPlatform[deviceKey] = [];
      }
      
      tokensByPlatform[deviceKey].push({
        id: doc.id,
        timestamp: data.timestamp || 0,
        isApple
      });
    });
    
    // Pour chaque plateforme, garder uniquement le token le plus récent
    const tokensToDelete: string[] = [];
    
    Object.keys(tokensByPlatform).forEach(platform => {
      const tokens = tokensByPlatform[platform];
      
      // Trier par timestamp décroissant (le plus récent d'abord)
      tokens.sort((a, b) => b.timestamp - a.timestamp);
      
      // Garder le premier (plus récent) et marquer les autres pour suppression
      if (tokens.length > 1) {
        // Garder uniquement le token le plus récent
        const tokensToRemove = tokens.slice(1);
        tokensToRemove.forEach(token => {
          tokensToDelete.push(token.id);
        });
      }
    });
    
    // Supprimer les tokens marqués
    let deletedCount = 0;
    
    // Si des tokens doivent être supprimés, utiliser un batch pour plus d'efficacité
    if (tokensToDelete.length > 0) {
      const batch = adminDb.batch();
      
      for (const tokenId of tokensToDelete) {
        batch.delete(adminDb.collection('notificationTokens').doc(tokenId));
        deletedCount++;
      }
      
      await batch.commit();
    }
    
    console.log(`${deletedCount} token(s) dupliqué(s) supprimé(s) pour l'utilisateur ${userId}`);
    
    return NextResponse.json({ 
      success: true,
      deletedCount,
      message: `${deletedCount} token(s) dupliqué(s) supprimé(s)`
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des tokens dupliqués:', error);
    
    return NextResponse.json({ 
      error: 'Erreur serveur',
      deletedCount: 0
    }, { status: 500 });
  }
} 