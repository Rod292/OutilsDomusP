import { NextRequest, NextResponse } from 'next/server';
import { trackEmailOpen } from '@/app/newsletter/services/analytics';

// Endpoint pour le tracking des ouvertures d'emails
// Sera appelé via une balise <img> invisible dans l'email
export async function GET(request: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('cid');
    const email = searchParams.get('email');
    
    if (!campaignId || !email) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Récupérer les informations sur le client
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               undefined;

    // Enregistrer l'ouverture
    await trackEmailOpen(campaignId, email, userAgent, ip as string);

    // Retourner une image transparente 1x1 pixel
    const transparentPixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(transparentPixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Erreur lors du tracking d\'ouverture:', error);
    
    // Même en cas d'erreur, retourner une image transparente
    // pour ne pas perturber l'expérience utilisateur
    const transparentPixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(transparentPixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
} 