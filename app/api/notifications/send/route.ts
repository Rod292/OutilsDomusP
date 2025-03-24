import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

// Liste des consultants pour extraction du nom
const CONSULTANTS = [
  { name: 'npers', email: 'photos.pers@gmail.com' },
  { name: 'rleborgne', email: 'r.leborgne@arthur-loyd.com' },
  { name: 'mchampeil', email: 'm.champeil@arthur-loyd.com' },
  { name: 'vleprovost', email: 'v.leprovost@arthur-loyd.com' },
  { name: 'ahervouet', email: 'a.hervouet@arthur-loyd.com' },
  { name: 'cgaignard', email: 'c.gaignard@arthur-loyd.com' },
  { name: 'mdemeure', email: 'm.demeure@arthur-loyd.com' },
  { name: 'alamarche', email: 'a.lamarche@arthur-loyd.com' },
  { name: 'vsainz', email: 'v.sainz@arthur-loyd.com' },
  { name: 'fjaunet', email: 'f.jaunet@arthur-loyd.com' },
  { name: 'lsiraud', email: 'l.siraud@arthur-loyd.com' },
  { name: 'mleroch', email: 'm.leroch@arthur-loyd.com' },
];

// Fonction pour extraire l'email et le consultant d'un userId
const extractUserInfo = (userId: string): { email: string; consultant: string | null } => {
  if (userId.includes('_')) {
    const [email, consultant] = userId.split('_');
    return { email, consultant };
  } else {
    return { email: userId, consultant: null };
  }
};

// Fonction pour trouver les tokens d'un utilisateur
const findTokensForUser = async (userId: string): Promise<Set<string>> => {
  const tokens = new Set<string>();
  const db = admin.firestore();
  const tokensRef = db.collection('notification_tokens');
  let querySnapshot;
  
  // Rechercher par userId exact d'abord
  querySnapshot = await tokensRef.where('userId', '==', userId).get();
  
  // Ajouter les tokens trouvés au Set pour éliminer les doublons
  querySnapshot.forEach((doc: any) => {
    const tokenData = doc.data();
    if (tokenData.token) {
      tokens.add(tokenData.token);
    }
  });
  
  // Si aucun token n'est trouvé, essayer de rechercher par email uniquement
  if (tokens.size === 0 && userId.includes('_')) {
    const { email } = extractUserInfo(userId);
    querySnapshot = await tokensRef.where('userId', '==', email).get();
    
    querySnapshot.forEach((doc: any) => {
      const tokenData = doc.data();
      if (tokenData.token) {
        tokens.add(tokenData.token);
      }
    });
  }
  
  return tokens;
};

// POST: Envoyer une notification à un utilisateur
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { userId, title, body, data: notificationData = {} } = data;
    
    // Vérification des paramètres requis
    if (!userId || !title || !body) {
      return NextResponse.json(
        { success: false, error: 'userId, title et body sont requis' },
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
    
    // Extraire l'email et le consultant du userId
    const { email, consultant } = extractUserInfo(userId);
    
    // Rechercher les tokens
    const tokens = await findTokensForUser(userId);
    
    // Si aucun token n'est trouvé, essayer de chercher uniquement avec l'email
    if (tokens.size === 0 && email !== userId) {
      const emailTokens = await findTokensForUser(email);
      emailTokens.forEach(token => tokens.add(token));
    }
    
    // Si toujours aucun token n'est trouvé, retourner une erreur
    if (tokens.size === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Aucun token trouvé pour cet utilisateur',
          userId,
          email
        },
        { status: 404 }
      );
    }
    
    // Compter les appareils Apple et non-Apple
    let appleDevices = 0;
    let nonAppleDevices = 0;
    
    // Convertir le Set en tableau pour FCM
    const tokenArray = Array.from(tokens);
    
    // Vérifier les types d'appareils (cette partie est simplifiée car nous n'avons pas accès direct aux détails des appareils ici)
    // On utilisera simplement la détection via les tokens spécifiques à Apple qui commencent généralement par des caractères spécifiques
    tokenArray.forEach(token => {
      // Détection heuristique simplifiée des tokens Apple
      if (token.startsWith('d') || token.includes(':APA91') === false) {
        appleDevices++;
      } else {
        nonAppleDevices++;
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
      tokens: tokenArray,
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
    
    // Retourner les résultats
    return NextResponse.json({
      success: true,
      result: response,
      message: `Notification envoyée (${tokens.size} appareils): { success: ${response.successCount}, failure: ${response.failureCount}, appleDevices: ${appleDevices}, nonAppleDevices: ${nonAppleDevices} }`
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