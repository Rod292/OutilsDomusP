import { NextRequest, NextResponse } from 'next/server';
import admin from '@/app/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Force la route à être dynamique pour éviter l'erreur de compilation statique
export const dynamic = 'force-dynamic';

const db = admin.firestore();

/**
 * Restaure une collection vide en y ajoutant un document placeholder
 * Le document sera automatiquement supprimé après 1 minute
 */
async function restoreCollection(collectionName: string): Promise<boolean> {
  try {
    console.log(`Tentative de restauration de la collection '${collectionName}'...`);
    
    // Vérifier si la collection existe déjà
    const snapshot = await db.collection(collectionName).limit(1).get();
    
    if (!snapshot.empty) {
      console.log(`La collection '${collectionName}' existe déjà et contient des documents.`);
      return true;
    }
    
    // Créer un document placeholder avec TTL
    const placeholderId = `placeholder_${Date.now()}`;
    const placeholderData = {
      _placeholder: true,
      _description: 'Document temporaire pour maintenir la collection',
      _createdAt: Timestamp.now(),
      _expireAt: new Date(Date.now() + 60000) // Expiration après 1 minute
    };
    
    // Ajouter le document placeholder
    await db.collection(collectionName).doc(placeholderId).set(placeholderData);
    
    console.log(`✅ Collection '${collectionName}' restaurée avec succès via un document placeholder.`);
    console.log(`Le document placeholder sera automatiquement supprimé après 1 minute.`);
    
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la restauration de la collection '${collectionName}':`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer le paramètre de requête
    const searchParams = new URL(request.url).searchParams;
    const collection = searchParams.get('collection');
    
    if (!collection) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Le paramètre "collection" est requis'
        },
        { status: 400 }
      );
    }
    
    // Liste des collections autorisées
    const allowedCollections = ['notifications', 'notification_tokens', 'notificationTokens'];
    
    if (!allowedCollections.includes(collection)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Collection non autorisée. Utilisez une des collections suivantes: ${allowedCollections.join(', ')}`
        },
        { status: 403 }
      );
    }
    
    // Restaurer la collection
    await restoreCollection(collection);
    
    // Retourner les résultats
    return NextResponse.json({
      success: true,
      message: `Collection '${collection}' restaurée avec succès`
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de la restauration de la collection:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Une erreur est survenue lors de la restauration de la collection'
      },
      { status: 500 }
    );
  }
} 