import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'firebase/messaging';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { NOTIFICATION_CONFIG } from '@/app/services/notificationService';

// Configuration Firebase Admin pour le serveur
const adminConfig = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID || 'outils-domusp',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

// Vérifier si nous avons accès à l'API Firebase Admin
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

// POST: Envoyer une notification à un utilisateur
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { userId, title, body, data: notificationData = {} } = data;
    
    if (!userId || !title || !body) {
      return NextResponse.json(
        { success: false, error: 'userId, title et body sont requis' },
        { status: 400 }
      );
    }
    
    // Vérifier si les notifications sont activées
    if (!NOTIFICATION_CONFIG.ENABLED) {
      return NextResponse.json(
        { success: false, error: 'Les notifications sont temporairement désactivées' },
        { status: 503 }
      );
    }
    
    // Si nous n'avons pas accès à l'API Firebase Admin, retourner une erreur
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin n\'est pas disponible' },
        { status: 500 }
      );
    }
    
    // Trouver tous les tokens pour cet utilisateur
    const db = getFirestore();
    const tokensRef = collection(db, 'notification_tokens');
    
    // Recherche par userId exact d'abord
    let q = query(tokensRef, where('userId', '==', userId));
    let querySnapshot = await getDocs(q);
    
    // Si aucun token n'est trouvé, essayer de rechercher par email uniquement
    if (querySnapshot.empty && userId.includes('_')) {
      const email = userId.split('_')[0];
      q = query(tokensRef, where('userId', '==', email));
      querySnapshot = await getDocs(q);
    }
    
    // Si toujours aucun token n'est trouvé, retourner une erreur
    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Aucun token trouvé pour cet utilisateur' },
        { status: 404 }
      );
    }
    
    // Récupérer les tokens uniques
    const uniqueTokens = new Set<string>();
    querySnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.token) {
        uniqueTokens.add(tokenData.token);
      }
    });
    
    // Compter les appareils Apple
    let appleDevices = 0;
    let nonAppleDevices = 0;
    
    // Nombre de tokens uniques
    const tokens = Array.from(uniqueTokens);
    
    // Si aucun token n'est disponible, retourner une erreur
    if (tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun token valide trouvé pour cet utilisateur' },
        { status: 404 }
      );
    }
    
    // Déterminer les types d'appareils
    querySnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.token && uniqueTokens.has(tokenData.token)) {
        if (tokenData.deviceInfo?.os === 'iOS' || 
            tokenData.deviceInfo?.browser === 'Safari' || 
            tokenData.deviceInfo?.userAgent?.includes('iPhone') || 
            tokenData.deviceInfo?.userAgent?.includes('iPad')) {
          appleDevices++;
        } else {
          nonAppleDevices++;
        }
      }
    });
    
    // Créer le message pour Firebase Cloud Messaging
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...notificationData,
        title,
        body,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
      tokens: tokens,
      // Options spécifiques pour iOS
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
        headers: {
          'apns-priority': '10',
        },
      },
      // Options pour Android
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    };
    
    // Envoyer la notification via Firebase Cloud Messaging
    const response = await admin.messaging().sendMulticast(message);
    
    // Retourner le résultat
    return NextResponse.json({
      success: true,
      message: `Notification envoyée (${tokens.length} appareil${tokens.length > 1 ? 's' : ''})`,
      result: {
        success: response.successCount,
        failure: response.failureCount,
        appleDevices,
        nonAppleDevices,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// GET: Vérifier l'état du service de notification
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    enabled: NOTIFICATION_CONFIG.ENABLED,
    useFCM: NOTIFICATION_CONFIG.USE_FCM,
    adminAvailable: !!admin,
  });
} 