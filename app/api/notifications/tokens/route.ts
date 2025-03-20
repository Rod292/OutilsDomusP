import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/app/lib/firebaseAdmin';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

// Route GET pour récupérer les tokens de notification pour un utilisateur spécifique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }
    
    // Rechercher tous les tokens pour cet email
    const tokensRef = collection(db, 'notificationTokens');
    const q = query(tokensRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
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
    
    // Vérifier si ce token existe déjà
    const tokensRef = collection(db, 'notificationTokens');
    const q = query(tokensRef, where('token', '==', token));
    const querySnapshot = await getDocs(q);
    
    const timestamp = Date.now();
    
    if (!querySnapshot.empty) {
      // Token existant, mise à jour
      const docRef = doc(db, 'notificationTokens', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
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
      
      const docRef = await addDoc(tokensRef, newToken);
      
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