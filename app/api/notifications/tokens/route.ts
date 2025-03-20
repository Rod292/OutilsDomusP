import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/app/lib/firebaseAdmin';
import { db } from '@/app/lib/firebase';

// Route GET pour récupérer les tokens de notification pour un utilisateur spécifique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }
    
    // Rechercher tous les tokens pour cet email en utilisant firestore Admin
    const tokensRef = firestore.collection('notificationTokens');
    const querySnapshot = await tokensRef.where('email', '==', email).get();
    
    const tokens: any[] = [];
    querySnapshot.forEach((doc) => {
      tokens.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Erreur lors de la récupération des tokens:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Route POST pour enregistrer ou mettre à jour un token de notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, userId, platform, userAgent } = body;
    
    if (!token || !email) {
      return NextResponse.json({ error: 'Token et email requis' }, { status: 400 });
    }
    
    // Vérifier si ce token existe déjà avec firestore Admin
    const tokensRef = firestore.collection('notificationTokens');
    const querySnapshot = await tokensRef.where('token', '==', token).get();
    
    const timestamp = Date.now();
    
    if (!querySnapshot.empty) {
      // Token existant, mise à jour
      const docRef = tokensRef.doc(querySnapshot.docs[0].id);
      await docRef.update({
        email,
        userId: userId || email,
        platform: platform || 'web',
        userAgent: userAgent || 'unknown',
        lastUpdated: timestamp
      });
      
      return NextResponse.json({ 
        success: true, 
        id: querySnapshot.docs[0].id,
        message: 'Token mis à jour' 
      });
    } else {
      // Nouveau token, ajout
      const newToken = {
        token,
        email,
        userId: userId || email,
        platform: platform || 'web',
        userAgent: userAgent || 'unknown',
        createdAt: timestamp,
        lastUpdated: timestamp,
        timestamp: timestamp
      };
      
      const docRef = await tokensRef.add(newToken);
      
      return NextResponse.json({ 
        success: true, 
        id: docRef.id,
        message: 'Token enregistré' 
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 