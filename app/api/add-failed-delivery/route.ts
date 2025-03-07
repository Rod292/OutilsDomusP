import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase-admin';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de l\'ajout d\'email à la liste des non délivrés');
    
    const { email, campaignId, reason } = await request.json();
    console.log('Email à ajouter:', email);
    console.log('Campagne concernée:', campaignId);
    console.log('Raison:', reason);

    if (!email || !campaignId) {
      console.log('Email ou ID de campagne manquant dans la requête');
      return NextResponse.json({ error: 'Email et ID de campagne requis' }, { status: 400 });
    }

    try {
      console.log('Ajout de l\'email à la liste des non délivrés via Firestore Admin...');
      
      // Ajouter l'email à la collection des emails non délivrés
      const deliveryRef = adminDb.collection('email_deliveries').doc();
      await deliveryRef.set({
        email,
        campaignId,
        status: 'failed',
        reason: reason || 'Raison inconnue',
        timestamp: new Date()
      });
      console.log('Email ajouté à la collection des emails non délivrés');
      
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
      console.error('Erreur Firestore lors de l\'ajout:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'email à la liste des non délivrés:', error);
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