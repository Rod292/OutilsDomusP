import { NextResponse, NextRequest } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { oAuth2Client } from '@/lib/gmail';

// Client ID et secret doivent être configurés dans votre projet Google Cloud Console
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';

// Spécifier que cette route est dynamique et ne doit pas être rendue statiquement
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log("Callback Gmail appelé");
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Erreur de l\'authentification Google:', error);
      return new Response(
        `<html>
          <body>
            <script>
              window.close();
            </script>
            <div>Erreur d'authentification. Vous pouvez fermer cette fenêtre.</div>
          </body>
        </html>`, 
        {
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    if (!code) {
      console.error('Code d\'autorisation manquant');
      return new Response(
        `<html>
          <body>
            <script>
              window.close();
            </script>
            <div>Code d'autorisation manquant. Vous pouvez fermer cette fenêtre.</div>
          </body>
        </html>`, 
        {
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Échanger le code contre un token d'accès
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Erreur lors de l\'échange du code:', tokenData);
      return new Response(
        `<html>
          <body>
            <script>
              window.close();
            </script>
            <div>Erreur lors de l'échange du code d'autorisation. Vous pouvez fermer cette fenêtre.</div>
          </body>
        </html>`, 
        {
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Stocker les tokens dans les cookies sécurisés
    cookies().set('gmail_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in,
      path: '/',
    });

    if (tokenData.refresh_token) {
      cookies().set('gmail_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // Le refresh token n'expire pas, nous définissons une durée d'un an
        maxAge: 365 * 24 * 60 * 60,
        path: '/',
      });
    }

    // Afficher une page de succès et fermer la fenêtre
    return new Response(
      `<html>
        <body>
          <script>
            window.close();
          </script>
          <div>Authentification réussie ! Vous pouvez fermer cette fenêtre.</div>
        </body>
      </html>`, 
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  } catch (error) {
    console.error('Erreur lors du traitement du callback:', error);
    return new Response(
      `<html>
        <body>
          <script>
            window.close();
          </script>
          <div>Une erreur s'est produite. Vous pouvez fermer cette fenêtre.</div>
        </body>
      </html>`, 
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
} 