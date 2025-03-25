import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Fonction pour initialiser Firebase Admin
const initAdmin = () => {
  if (getApps().length === 0) {
    if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
      console.error('FIREBASE_ADMIN_CREDENTIALS is not defined');
      throw new Error('FIREBASE_ADMIN_CREDENTIALS is not defined');
    }
    
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS, 'base64').toString()
      );
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  }
  
  return getAdminFirestore();
};

// Fonction pour obtenir l'instance Firestore
const db = () => {
  try {
    return initAdmin();
  } catch (error) {
    console.error('Error getting Firestore instance:', error);
    throw error;
  }
};

// Créer un token fictif pour le test
const createSimulatedToken = () => {
  // Un token simulé qui ne dépend pas de FCM
  // Format: simulé-[UUID]
  return `simulated-${uuidv4()}`;
};

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, consultant, userAgent, platform } = data;
    
    if (!email) {
      return NextResponse.json(
        { error: 'L\'email est requis' },
        { status: 400 }
      );
    }
    
    // Créer un ID utilisateur en utilisant email et consultant si fourni
    const userId = consultant ? `${email}_${consultant}` : email;
    
    // Créer un token simulé
    const token = createSimulatedToken();
    
    // Créer un ID unique pour le token
    const tokenId = uuidv4();
    
    // Préparer les informations sur l'appareil
    const deviceInfo = {
      browser: userAgent?.includes('Chrome') ? 'Chrome' : 
              userAgent?.includes('Firefox') ? 'Firefox' : 
              userAgent?.includes('Safari') ? 'Safari' : 'Other',
      os: userAgent?.includes('iPhone') || userAgent?.includes('iPad') ? 'iOS' :
          userAgent?.includes('Android') ? 'Android' :
          userAgent?.includes('Windows') ? 'Windows' :
          userAgent?.includes('Mac') ? 'macOS' : 'Other',
      device: userAgent?.includes('Mobile') || 
              userAgent?.includes('iPhone') || 
              userAgent?.includes('Android') ? 'mobile' : 'desktop',
      userAgent: userAgent || 'Unknown',
      platform: platform || 'Unknown',
      receiveAsEmail: email, // L'email qui recevra les notifications
    };
    
    // Préparer les données du token
    const tokenData = {
      id: tokenId,
      token,
      userId,
      consultant,
      deviceInfo,
      createdAt: new Date(),
      lastUsed: new Date()
    };
    
    // Enregistrer dans la collection notificationTokens
    await db().collection('notificationTokens').doc(tokenId).set(tokenData);
    
    // Si le consultant est défini, enregistrer également avec userId = email_consultant
    if (consultant && userId !== `${email}_${consultant}`) {
      const tokenId2 = uuidv4();
      const tokenData2 = {
        ...tokenData,
        id: tokenId2,
        userId: `${email}_${consultant}`
      };
      
      await db().collection('notificationTokens').doc(tokenId2).set(tokenData2);
    }
    
    // Pour le développement, enregistrer aussi une version avec photos.pers@gmail.com
    if (process.env.NODE_ENV === 'development' && email !== 'photos.pers@gmail.com') {
      // Version pour l'email photos.pers@gmail.com
      const testEmail = 'photos.pers@gmail.com';
      const tokenId3 = uuidv4();
      const tokenData3 = {
        ...tokenData,
        id: tokenId3,
        userId: testEmail,
        receiveAsEmail: testEmail
      };
      
      await db().collection('notificationTokens').doc(tokenId3).set(tokenData3);
      
      // Version pour photos.pers@gmail.com avec le consultant
      if (consultant) {
        const tokenId4 = uuidv4();
        const tokenData4 = {
          ...tokenData,
          id: tokenId4,
          userId: `${testEmail}_${consultant}`,
          receiveAsEmail: testEmail
        };
        
        await db().collection('notificationTokens').doc(tokenId4).set(tokenData4);
      }
    }
    
    // Journaliser l'opération
    console.log(`Tokens directs enregistrés avec succès pour: ${userId}`);
    
    // Retourner le résultat
    return NextResponse.json({
      success: true,
      message: 'Tokens enregistrés avec succès',
      tokenId,
      tokensCreated: process.env.NODE_ENV === 'development' ? 4 : consultant ? 2 : 1
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des tokens:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Pour les requêtes HEAD (utilisées pour vérifier si la route existe)
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 