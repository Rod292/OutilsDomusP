import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc, addDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { NOTIFICATION_OPTIONS } from '../config';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { setDoc } from 'firebase/firestore';
import { adminDb, firebaseAdmin } from '../../../lib/firebase-admin';

// GET: Récupérer les tokens d'un utilisateur
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userEmail = searchParams.get('email') || searchParams.get('userId');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email ou userId utilisateur requis' },
        { status: 400 }
      );
    }

    // Utiliser Firestore Admin
    const db = adminDb;
    const tokensRef = db.collection('notificationTokens');
    
    let querySnapshot;
    
    // Rechercher les tokens où userId commence par l'email
    // Cela permettra de trouver à la fois les tokens pour l'email seul et pour email_consultant
    try {
      querySnapshot = await tokensRef
        .where('userId', '>=', userEmail)
        .where('userId', '<=', userEmail + '\uf8ff')
        .get();
    } catch (error) {
      console.error('[API] Erreur de requête Firestore:', error);
      throw error;
    }

    const tokens = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[API] ${tokens.length} tokens trouvés pour ${userEmail}`);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('[API] Erreur de récupération des tokens:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des tokens' },
      { status: 500 }
    );
  }
}

// POST: Enregistrer un nouveau token ou mettre à jour un token existant
export async function POST(req: NextRequest) {
  try {
    const { token, userId, deviceInfo } = await req.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token et userId sont requis' },
        { status: 400 }
      );
    }

    const isTestToken = token.startsWith('test-token');
    console.log(`[API] Enregistrement de token pour ${userId} (Test: ${isTestToken})`);

    // Créer un ID unique pour ce token
    const tokenId = isTestToken ? `test_${uuidv4()}` : token;

    // Données à stocker
    const tokenData = {
      token,
      userId,
      deviceInfo: deviceInfo || {},
      isTestToken,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    // Utiliser Firestore Admin
    const db = adminDb;
    const tokensRef = db.collection('notificationTokens');

    // Pour les tokens de test, ne gardons qu'un seul par paire userId+deviceInfo.platform
    if (isTestToken && deviceInfo?.platform) {
      try {
        const platform = deviceInfo.platform;
        const query = tokensRef
          .where('userId', '==', userId)
          .where('isTestToken', '==', true)
          .where('deviceInfo.platform', '==', platform);
        
        const snapshot = await query.get();
        
        // Supprimer les anciens tokens de test pour cette combinaison
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (!snapshot.empty) {
          await batch.commit();
          console.log(`[API] ${snapshot.size} ancien(s) token(s) de test supprimé(s) pour ${userId} sur ${platform}`);
        }
      } catch (error) {
        console.error('[API] Erreur lors du nettoyage des tokens de test:', error);
        // Continuer l'enregistrement même en cas d'erreur de nettoyage
      }
    }

    // Enregistrer le token dans Firestore
    await db.collection('notificationTokens').doc(tokenId).set(tokenData);
    
    // Loguer l'information pour le débogage
    console.log(`[API] Token enregistré avec succès: ${tokenId} pour ${userId}`);

    return NextResponse.json({ success: true, tokenId });
  } catch (error) {
    console.error('[API] Erreur d\'enregistrement de token:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'enregistrement du token' },
      { status: 500 }
    );
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
    const tokensRef = db.collection('notificationTokens');
    
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