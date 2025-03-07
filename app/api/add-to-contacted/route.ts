import { NextResponse } from 'next/server';
import { addEmailToContactedList } from '@/app/newsletter/services/analytics';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de l\'ajout d\'email à la liste des contactés');
    
    const { email, campaignId } = await request.json();
    console.log('Email à ajouter:', email);
    console.log('Campagne concernée:', campaignId);

    if (!email || !campaignId) {
      console.log('Email ou ID de campagne manquant dans la requête');
      return NextResponse.json({ error: 'Email et ID de campagne requis' }, { status: 400 });
    }

    // Ajouter l'email à la liste des contactés
    await addEmailToContactedList(campaignId, email);
    console.log('Email ajouté à la liste des contactés avec succès');

    // Ajouter des en-têtes CORS
    return new NextResponse(
      JSON.stringify({ success: true }),
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
    console.error('Erreur lors de l\'ajout d\'email à la liste des contactés:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout', details: error instanceof Error ? error.message : String(error) },
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