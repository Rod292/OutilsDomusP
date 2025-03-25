import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = cookies();
    
    // Récupérer le token d'accès pour le révoquer
    const accessToken = cookieStore.get('gmail_access_token')?.value;
    
    // Révoquer le token d'accès s'il existe
    if (accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } catch (error) {
        console.error('Erreur lors de la révocation du token:', error);
        // Continuer même en cas d'erreur car nous allons supprimer les cookies de toute façon
      }
    }
    
    // Supprimer les cookies
    cookieStore.delete('gmail_access_token');
    cookieStore.delete('gmail_refresh_token');
    
    return NextResponse.json({ success: true, message: 'Déconnecté avec succès' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la déconnexion' 
    }, { status: 500 });
  }
} 