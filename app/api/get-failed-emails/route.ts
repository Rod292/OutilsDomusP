import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase-admin';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de la récupération des emails non délivrés');
    
    const { campaignId } = await request.json();
    console.log('Campagne concernée:', campaignId);

    if (!campaignId) {
      console.log('ID de campagne manquant dans la requête');
      return NextResponse.json({ error: 'ID de campagne requis' }, { status: 400 });
    }

    try {
      console.log('Récupération des emails non délivrés via Firestore Admin...');
      
      // Récupérer les emails non délivrés depuis la sous-collection 'emails' de la campagne
      const emailsRef = adminDb.collection('campaigns').doc(campaignId).collection('emails');
      const failedQuery = emailsRef.where('status', '==', 'failed');
      
      const failedSnapshot = await failedQuery.get();
      
      const failedEmails = [];
      
      failedSnapshot.forEach(doc => {
        const data = doc.data();
        failedEmails.push({
          email: data.email,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
          status: data.status,
          reason: data.reason || 'Erreur inconnue'
        });
      });
      
      console.log(`${failedEmails.length} emails non délivrés trouvés`);
      
      // Ajouter des en-têtes CORS
      return new NextResponse(
        JSON.stringify({ failedEmails }),
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
      console.error('Erreur Firestore lors de la récupération:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des emails non délivrés:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération', details: error instanceof Error ? error.message : String(error) },
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