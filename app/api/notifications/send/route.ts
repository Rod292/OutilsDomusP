import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { initAdmin } from '../../../../lib/firebase-admin';
import { db } from '../../../../lib/firebase-admin';
import { DocumentData, QuerySnapshot } from 'firebase-admin/firestore';
import { adminDb, adminMessaging } from '../../../lib/firebase-admin';

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

// Fonction pour extraire l'email et le consultant d'un userId
const extractUserInfo = (userId: string): { email: string; consultant: string | null } => {
  if (userId && typeof userId === 'string' && userId.includes('_')) {
    const [email, consultant] = userId.split('_');
    return { email, consultant };
  } else {
    return { email: userId || '', consultant: null };
  }
};

// Fonction pour extraire les tokens uniques d'un snapshot Firestore
const extractTokens = (snapshot: any): Set<string> => {
  const tokens = new Set<string>();
  snapshot.forEach((doc: any) => {
    const data = doc.data();
    if (data.token) {
      tokens.add(data.token);
      
      // Loguer les informations de débogage
      console.log(`Token trouvé: ${data.token.substring(0, 10)}...`);
      console.log(`  Pour: ${data.userId}`);
      console.log(`  Reçu par: ${data.receiveAsEmail || 'même utilisateur'}`);
      console.log(`  Appareil: ${data.deviceInfo?.device || 'inconnu'} (${data.deviceInfo?.os || 'OS inconnu'})`);
    }
  });
  return tokens;
};

interface NotificationData {
  userId: string;
  title: string;
  body: string;
  type?: string;
  taskId?: string;
  communicationIndex?: number;
}

// Fonction pour valider les données de la notification
const validateNotificationData = (data: any): data is NotificationData => {
  console.log('Données reçues:', JSON.stringify(data, null, 2));
  
  const isValid = typeof data === 'object' &&
    data !== null &&
    typeof data.userId === 'string' &&
    typeof data.title === 'string' &&
    typeof data.body === 'string';

  if (!isValid) {
    console.log('Validation échouée:', {
      isObject: typeof data === 'object',
      isNotNull: data !== null,
      userIdIsString: typeof data?.userId === 'string',
      titleIsString: typeof data?.title === 'string',
      bodyIsString: typeof data?.body === 'string'
    });
  }

  return isValid;
};

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, data } = await request.json();
    
    if (!userId || !title || !body) {
      return NextResponse.json({ 
        error: 'userId, title, et body sont requis pour envoyer une notification' 
      }, { status: 400 });
    }
    
    // Recherche des tokens de l'utilisateur
    console.log(`[API] Recherche des tokens pour l'utilisateur: ${userId}`);
    const tokensRef = adminDb.collection('notificationTokens');
    
    // Requête pour trouver des tokens avec le userId exact OU qui commencent par l'email (si userId est un email)
    let querySnapshot;
    try {
      querySnapshot = await tokensRef
        .where('userId', '>=', userId)
        .where('userId', '<=', userId + '\uf8ff')
        .get();
    } catch (error) {
      console.error('[API] Erreur lors de la recherche de tokens:', error);
      throw error;
    }
    
    if (querySnapshot.empty) {
      console.log(`[API] Aucun token trouvé pour l'utilisateur: ${userId}`);
      return NextResponse.json({ 
        error: 'Aucun appareil enregistré pour cet utilisateur' 
      }, { status: 404 });
    }
    
    // Collecter tous les tokens valides
    const tokens: string[] = [];
    querySnapshot.forEach((doc) => {
      const tokenData = doc.data();
      
      if (!tokenData.token) {
        console.warn('[API] Token manquant dans le document:', doc.id);
        return; // Continuer la boucle
      }
      
      // Si c'est un token de test, on l'enregistre à part
      if (tokenData.isTestToken) {
        console.log(`[API] Token de test trouvé pour ${userId}: ${tokenData.token}`);
      } else {
        tokens.push(tokenData.token);
      }
    });
    
    console.log(`[API] ${tokens.length} tokens FCM trouvés pour l'envoi de notification`);
    
    if (tokens.length === 0) {
      console.log('[API] Uniquement des tokens de test, simulation d\'envoi...');
      return NextResponse.json({ 
        success: true, 
        info: 'Notification simulée avec tokens de test',
        sentCount: 0
      });
    }
    
    // Préparation du message
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };
    
    // Envoi des notifications
    const response = await adminMessaging.sendMulticast(message);
    
    console.log(`[API] Notification envoyée avec succès à ${response.successCount} appareils`);
    return NextResponse.json({ 
      success: true, 
      sent: response.successCount,
      failed: response.failureCount,
      responses: response.responses
    });
  } catch (error) {
    console.error('[API] Erreur lors de l\'envoi de notification:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de l\'envoi de notification' 
    }, { status: 500 });
  }
} 