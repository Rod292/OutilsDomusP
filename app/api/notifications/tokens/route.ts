import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc, addDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { NOTIFICATION_OPTIONS } from '../config';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { setDoc } from 'firebase/firestore';
import { adminDb, firebaseAdmin } from '../../../lib/firebase-admin';

// GET: Récupérer les tokens d'un utilisateur
export async function GET(req: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // Vérifier si userId est fourni
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId est requis' },
        { status: 400 }
      );
    }
    
    // Utiliser Firestore Admin
    const db = adminDb;
    
    // Rechercher les tokens pour cet utilisateur
    const tokensRef = db.collection('notification_tokens');
    let querySnapshot;
    
    // Recherche par userId exact d'abord
    let q = tokensRef.where('userId', '==', userId);
    querySnapshot = await q.get();
    
    // Si aucun token n'est trouvé et que userId contient un underscore, essayer par email uniquement
    if (querySnapshot.empty && userId.includes('_')) {
      const email = userId.split('_')[0];
      q = tokensRef.where('userId', '==', email);
      querySnapshot = await q.get();
    }
    
    // Récupérer les tokens
    const tokens: any[] = [];
    querySnapshot.forEach((doc: any) => {
      tokens.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return NextResponse.json({ success: true, tokens });
  } catch (error) {
    console.error('Erreur lors de la récupération des tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des tokens' },
      { status: 500 }
    );
  }
}

// POST: Enregistrer un nouveau token ou mettre à jour un token existant
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Vérifier que les données nécessaires sont présentes
    if (!data.token || !data.userId) {
      return NextResponse.json({ error: 'Token et userId requis' }, { status: 400 });
    }
    
    const { token, userId, deviceInfo, receiveAsEmail } = data;
    
    // Utiliser Firestore Admin
    const db = adminDb;
    
    // Créer un ID unique pour le token
    const tokenId = uuidv4();
    
    // Préparer les données du token
    const tokenData = {
      id: tokenId,
      token,
      userId, // L'ID de l'utilisateur pour lequel ce token est enregistré (consultant ou utilisateur)
      deviceInfo: deviceInfo || {},
      receiveAsEmail: receiveAsEmail || null, // L'email de l'utilisateur qui recevra réellement les notifications
      createdAt: new Date(),
      lastUsed: new Date()
    };
    
    // Enregistrer le token dans Firestore
    await db.collection('notification_tokens').doc(tokenId).set(tokenData);
    
    // Loguer l'information pour le débogage
    console.log(`Token enregistré avec succès pour ${userId}${receiveAsEmail ? ` (notifications envoyées à ${receiveAsEmail})` : ''}`);
    
    return NextResponse.json({ success: true, tokenId });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE: Supprimer un token
export async function DELETE(req: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    
    // Vérifier si un des paramètres est fourni
    if (!token && !userId) {
      return NextResponse.json(
        { success: false, error: 'token ou userId est requis' },
        { status: 400 }
      );
    }
    
    // Utiliser Firestore Admin
    const db = adminDb;
    const tokensRef = db.collection('notification_tokens');
    
    let querySnapshot;
    
    // Si le token est fourni, rechercher par token
    if (token) {
      querySnapshot = await tokensRef.where('token', '==', token).get();
    }
    // Sinon, rechercher par userId
    else if (userId) {
      querySnapshot = await tokensRef.where('userId', '==', userId).get();
    }
    
    // Si aucun document n'est trouvé
    if (!querySnapshot || querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Aucun token trouvé' },
        { status: 404 }
      );
    }
    
    // Supprimer les documents trouvés
    const batch = db.batch();
    querySnapshot.forEach((doc: any) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    return NextResponse.json({
      success: true,
      message: `${querySnapshot.size} token(s) supprimé(s) avec succès`
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du token:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du token' },
      { status: 500 }
    );
  }
} 