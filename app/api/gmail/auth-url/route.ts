import { NextResponse } from 'next/server';

// Client ID et redirectUri doivent être configurés dans votre projet Google Cloud Console
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export async function GET() {
  try {
    // Vérifier que les variables d'environnement sont définies
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'CLIENT_ID ou CLIENT_SECRET manquant dans les variables d\'environnement' 
      }, { status: 500 });
    }

    // Construire l'URL d'authentification Google
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent`;  // Forcer le consentement à chaque fois

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL d\'authentification:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la génération de l\'URL d\'authentification' 
    }, { status: 500 });
  }
} 