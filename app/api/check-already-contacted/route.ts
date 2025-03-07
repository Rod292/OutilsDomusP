import { NextResponse } from 'next/server';
import { checkEmailAlreadyContacted } from '@/app/newsletter/services/analytics';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de la vérification d\'email déjà contacté');
    
    const { email, campaignId } = await request.json();
    console.log('Email à vérifier:', email);
    console.log('Campagne à vérifier:', campaignId);

    if (!email || !campaignId) {
      console.log('Email ou ID de campagne manquant dans la requête');
      return NextResponse.json({ error: 'Email et ID de campagne requis' }, { status: 400 });
    }

    // Vérifier si l'email a déjà été contacté pour cette campagne
    const alreadyContacted = await checkEmailAlreadyContacted(campaignId, email);
    console.log('Résultat de la vérification:', alreadyContacted);

    // Ajouter des en-têtes CORS
    return new NextResponse(
      JSON.stringify({ alreadyContacted }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error) {
    console.error('Erreur lors de la vérification d\'email déjà contacté:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 