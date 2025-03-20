import { NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { initAdmin } from '@/lib/firebaseAdmin';
import { adminAuth } from '@/lib/firebaseAdmin';
import { adminDb } from '@/lib/firebaseAdmin';

// Définir le nom de la collection
const TOKEN_COLLECTION = 'notificationTokens';

// Fonction pour valider le token d'authentification
async function validateAuthToken(authToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(authToken);
    return decodedToken;
  } catch (error) {
    console.error('Erreur de validation du token:', error);
    return null;
  }
}

// Route pour supprimer tous les tokens
export async function DELETE(req: Request) {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' }, 
        { status: 401 }
      );
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await validateAuthToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Token d\'authentification invalide' }, 
        { status: 401 }
      );
    }
    
    // Vérifier si l'utilisateur est administrateur
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'Accès refusé. Droits d\'administration requis.' }, 
        { status: 403 }
      );
    }
    
    // Préparer la base de données
    await initAdmin();
    const db = adminDb;
    
    // Récupérer tous les tokens
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const tokensSnapshot = await getDocs(tokensRef);
    
    // Compter les tokens avant la suppression
    const tokenCount = tokensSnapshot.size;
    
    // Supprimer tous les tokens
    const deletionPromises = tokensSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletionPromises);
    
    return NextResponse.json({
      success: true,
      message: `${tokenCount} tokens de notification supprimés avec succès`,
      count: tokenCount
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression des tokens:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression des tokens' }, 
      { status: 500 }
    );
  }
}

// Route pour récupérer tous les tokens
export async function GET(req: Request) {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' }, 
        { status: 401 }
      );
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await validateAuthToken(token);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Token d\'authentification invalide' }, 
        { status: 401 }
      );
    }
    
    // Vérifier si l'utilisateur est administrateur
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'Accès refusé. Droits d\'administration requis.' }, 
        { status: 403 }
      );
    }
    
    // Préparer la base de données
    await initAdmin();
    const db = adminDb;
    
    // Récupérer tous les tokens
    const tokensRef = collection(db, TOKEN_COLLECTION);
    const tokensSnapshot = await getDocs(tokensRef);
    
    // Convertir les documents en JSON
    const tokens = tokensSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      success: true,
      count: tokens.length,
      tokens
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des tokens:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des tokens' }, 
      { status: 500 }
    );
  }
} 