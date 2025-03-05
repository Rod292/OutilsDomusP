import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { GMAIL_CONFIG } from '@/app/newsletter/components/gmail-config';

const { CLIENT_ID } = GMAIL_CONFIG;

// Client secret défini ici (dans une application réelle, utiliser une variable d'environnement)
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Cette API gère l'authentification OAuth pour Gmail
export async function POST(request: NextRequest) {
  try {
    console.log('Démarrage du traitement de la demande POST dans /api/gmail-auth');
    const body = await request.json();
    const { code } = body;
    
    console.log('Code reçu:', code ? 'Présent' : 'Absent');
    
    if (!code) {
      return NextResponse.json({ error: 'Code d\'autorisation manquant' }, { status: 400 });
    }

    // Utiliser l'origine de la requête pour construire l'URL de redirection
    const origin = request.headers.get('origin') || 'http://localhost:3001';
    const redirectUri = `${origin}/newsletter/oauth-redirect`;
    
    console.log('Utilisation de l\'URL de redirection:', redirectUri);
    console.log('Client ID utilisé:', CLIENT_ID);
    console.log('Client Secret présent:', CLIENT_SECRET ? 'Oui (masqué)' : 'Non');

    // Initialiser un client OAuth2 avec le client secret
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET, // Utilisation du client secret
      redirectUri
    );

    console.log('Échange du code contre un token...');
    
    try {
      // Configurer la requête d'échange de token avec les paramètres minimaux
      const tokenResponse = await oauth2Client.getToken({
        code: code,
        redirect_uri: redirectUri,
      });
      
      console.log('Tokens obtenus:', tokenResponse.tokens ? 'Succès' : 'Échec');
      
      const { tokens } = tokenResponse;
      
      // Stocker le token d'accès dans un cookie sécurisé
      if (tokens && tokens.access_token) {
        cookies().set('gmail_token', tokens.access_token, { 
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600, // 1 heure
          path: '/',
          sameSite: 'lax',
        });
        
        console.log('Token enregistré dans les cookies avec succès');
        return NextResponse.json({ success: true });
      } else {
        console.error('Pas de token d\'accès dans la réponse');
        return NextResponse.json({ error: 'Échec de récupération du token' }, { status: 400 });
      }
    } catch (tokenError: any) {
      console.error('Erreur lors de l\'échange du code contre un token:', tokenError);
      
      // Extraire les détails d'erreur Google
      let errorDetails = {};
      let errorMessage = tokenError.message || 'Erreur lors de l\'échange du token';
      
      if (tokenError.response && tokenError.response.data) {
        errorDetails = tokenError.response.data;
        if (tokenError.response.data.error) {
          errorMessage = `${tokenError.response.data.error}: ${tokenError.response.data.error_description || ''}`;
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: errorDetails
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Erreur d\'authentification Gmail:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur interne du serveur',
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Cette route permet de vérifier si un utilisateur est déjà authentifié
export async function GET() {
  console.log('Vérification du statut d\'authentification');
  const token = cookies().get('gmail_token')?.value;
  
  console.log('Token présent:', !!token);
  
  return NextResponse.json({ 
    isAuthenticated: !!token,
  });
}

// Cette route permet de se déconnecter en supprimant le cookie d'authentification
export async function DELETE() {
  console.log('Suppression du token d\'authentification Gmail');
  
  // Supprimer le cookie gmail_token
  cookies().delete('gmail_token');
  
  return NextResponse.json({ 
    success: true,
    message: 'Déconnexion réussie'
  });
} 