import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc, addDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { NOTIFICATION_OPTIONS } from '../config';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Configuration Firebase Admin pour le serveur
const adminConfig = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID || 'etat-des-lieux-arthur-loyd',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// Initialiser Firebase Admin
let admin: any;
try {
  admin = require('firebase-admin');
  
  // Initialiser l'app Admin si elle n'est pas déjà initialisée
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig)
    });
  }
} catch (error) {
  console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
}

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
    
    // Initialiser Firestore Admin
    const db = admin.firestore();
    
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
    const { token, userId, deviceInfo } = data;
    
    // Vérifier si les champs obligatoires sont présents
    if (!token || !userId) {
      return NextResponse.json(
        { success: false, error: 'token et userId sont requis' },
        { status: 400 }
      );
    }
    
    // Initialiser Firestore Admin
    const db = admin.firestore();
    
    // Vérifier si le token existe déjà
    const tokensRef = db.collection('notification_tokens');
    const querySnapshot = await tokensRef.where('token', '==', token).get();
    
    // Si le token existe, mettre à jour le document
    if (!querySnapshot.empty) {
      const tokenDoc = querySnapshot.docs[0];
      
      // Mettre à jour le document avec le nouveau userId et deviceInfo
      await tokenDoc.ref.update({
        userId,
        deviceInfo: deviceInfo || tokenDoc.data().deviceInfo,
        updatedAt: new Date()
      });
      
      return NextResponse.json({
        success: true,
        message: 'Token mis à jour avec succès',
        tokenId: tokenDoc.id
      });
    }
    
    // Si le token n'existe pas, créer un nouveau document
    const tokenId = uuidv4();
    await tokensRef.doc(tokenId).set({
      token,
      userId,
      deviceInfo: deviceInfo || {
        userAgent: req.headers.get('user-agent') || 'unknown'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Token enregistré avec succès',
      tokenId
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'enregistrement du token' },
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
    
    // Initialiser Firestore Admin
    const db = admin.firestore();
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