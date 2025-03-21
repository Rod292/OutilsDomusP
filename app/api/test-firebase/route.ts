import { NextResponse } from 'next/server';

export async function GET() {
  // Récupérer les variables d'environnement Firebase
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  };

  // Masquer les valeurs sensibles pour la sortie
  const maskedConfig = {
    apiKey: config.apiKey ? config.apiKey.substring(0, 5) + '...' : 'Non défini',
    authDomain: config.authDomain || 'Non défini',
    projectId: config.projectId || 'Non défini',
    storageBucket: config.storageBucket || 'Non défini',
    messagingSenderId: config.messagingSenderId || 'Non défini',
    appId: config.appId ? config.appId.substring(0, 10) + '...' : 'Non défini',
    vapidKey: config.vapidKey ? 
      config.vapidKey.substring(0, 5) + '...' + 
      (config.vapidKey.length > 20 ? `(longueur: ${config.vapidKey.length})` : '') : 
      'Non défini',
  };

  // Vérification spécifique pour la clé VAPID
  const vapidCheck = {
    exists: !!config.vapidKey,
    format: config.vapidKey ? 
      (config.vapidKey.startsWith('B') ? 'Semble correct (commence par B)' : 'Format suspect') : 
      'Non disponible',
    length: config.vapidKey ? config.vapidKey.length : 0,
  };

  return NextResponse.json({
    message: 'Configuration Firebase',
    config: maskedConfig,
    vapidCheck,
    time: new Date().toISOString(),
  });
} 