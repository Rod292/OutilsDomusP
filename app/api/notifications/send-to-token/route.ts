import { NextRequest, NextResponse } from 'next/server';

// Configuration Firebase Admin pour le serveur
interface ServiceAccount {
  type?: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

const FIREBASE_CONFIG: ServiceAccount = {
  type: process.env.FIREBASE_TYPE as string,
  project_id: process.env.FIREBASE_PROJECT_ID || 'etat-des-lieux-arthur-loyd',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
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
      credential: admin.credential.cert(FIREBASE_CONFIG)
    });
  }
} catch (error) {
  console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
}

// POST: Envoyer une notification à un token spécifique
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { token, title, body, data: notificationData = {} } = data;
    
    // Vérification des paramètres requis
    if (!token || !title || !body) {
      return NextResponse.json(
        { success: false, error: 'token, title et body sont requis' },
        { status: 400 }
      );
    }
    
    // Si nous n'avons pas accès à l'API Firebase Admin, retourner une erreur
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin n\'est pas disponible' },
        { status: 500 }
      );
    }
    
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
      token: token,
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
    const response = await admin.messaging().send(message);
    
    // Retourner les résultats
    return NextResponse.json({
      success: true,
      result: response,
      message: `Notification envoyée au token ${token.substring(0, 10)}...`
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Une erreur est survenue lors de l\'envoi de la notification'
      },
      { status: 500 }
    );
  }
} 