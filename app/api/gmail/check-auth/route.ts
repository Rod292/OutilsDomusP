import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('gmail_access_token')?.value;
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value;

    // Vérifier si l'utilisateur est authentifié
    if (!accessToken && !refreshToken) {
      return NextResponse.json({
        authenticated: false,
        error: 'Non authentifié'
      });
    }

    // Si nous avons un token d'accès, vérifier qu'il est valide
    if (accessToken) {
      try {
        // Appeler l'API Google pour vérifier le token
        const response = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + accessToken);
        const data = await response.json();

        // Si le token est valide, on retourne authenticated: true
        if (response.ok && data.aud === process.env.GMAIL_CLIENT_ID) {
          return NextResponse.json({
            authenticated: true
          });
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du token:', error);
      }
    }

    // Si nous avons un refresh token, essayer de rafraîchir l'access token
    if (refreshToken) {
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GMAIL_CLIENT_ID || '',
            client_secret: process.env.GMAIL_CLIENT_SECRET || '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenResponse.ok && tokenData.access_token) {
          // Stocker le nouveau access token dans un cookie
          cookieStore.set('gmail_access_token', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokenData.expires_in,
            path: '/',
          });

          return NextResponse.json({
            authenticated: true,
            refreshed: true
          });
        }
      } catch (refreshError) {
        console.error('Erreur lors du rafraîchissement du token:', refreshError);
      }
    }

    // Si rien n'a fonctionné, l'utilisateur n'est pas authentifié
    return NextResponse.json({
      authenticated: false,
      error: 'Token expiré ou invalide'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Erreur lors de la vérification de l\'authentification'
    }, { status: 500 });
  }
} 