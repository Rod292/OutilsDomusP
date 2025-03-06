import { NextRequest, NextResponse } from 'next/server';
import { trackEmailClick } from '@/app/newsletter/services/analytics';

// Indiquer à Next.js que cette route est dynamique
export const dynamic = 'force-dynamic';

// Endpoint pour le tracking des clics sur les liens dans les emails
// Sera utilisé comme proxy pour rediriger vers l'URL réelle après avoir enregistré le clic
export async function GET(request: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('cid');
    const email = searchParams.get('email');
    const url = searchParams.get('url');
    
    if (!campaignId || !email || !url) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Décoder l'URL (elle sera encodée dans l'email)
    const decodedUrl = decodeURIComponent(url);

    // Récupérer les informations sur le client
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               undefined;

    // Enregistrer le clic
    await trackEmailClick(campaignId, email, decodedUrl, userAgent, ip as string);

    // Rediriger vers l'URL cible
    return NextResponse.redirect(decodedUrl);
  } catch (error) {
    console.error('Erreur lors du tracking de clic:', error);
    
    // En cas d'erreur, rediriger vers l'URL si disponible, sinon vers la page d'accueil
    const url = request.nextUrl.searchParams.get('url');
    if (url) {
      return NextResponse.redirect(decodeURIComponent(url));
    } else {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
} 