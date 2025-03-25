import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialisation de Firebase Admin si nécessaire
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

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { token } = data;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Le token est requis' },
        { status: 400 }
      );
    }
    
    // Utiliser photos.pers@gmail.com comme userId
    const userId = 'photos.pers@gmail.com';
    const consultant = 'npers';
    
    // Créer un ID unique pour le token
    const tokenId = uuidv4();
    
    // Préparer les données du token
    const tokenData = {
      id: tokenId,
      token,
      userId,
      receiveAsEmail: userId,
      consultant,
      deviceInfo: {
        os: 'Test',
        browser: 'Test',
        device: 'Test',
        userAgent: 'Test Device'
      },
      createdAt: new Date(),
      lastUsed: new Date()
    };
    
    // Enregistrer dans la collection notificationTokens
    await db().collection('notificationTokens').doc(tokenId).set(tokenData);
    
    // Enregistrer également avec userId = photos.pers@gmail.com_npers
    const tokenId2 = uuidv4();
    const tokenData2 = {
      ...tokenData,
      id: tokenId2,
      userId: `${userId}_${consultant}`
    };
    
    await db().collection('notificationTokens').doc(tokenId2).set(tokenData2);
    
    console.log('Tokens de test enregistrés pour:', userId, 'et', `${userId}_${consultant}`);
    
    return NextResponse.json({
      success: true,
      message: 'Tokens de test enregistrés avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des tokens de test:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Utilisez la méthode POST pour enregistrer un token de test'
  });
} 