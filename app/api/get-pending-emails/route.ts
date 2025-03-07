import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de la récupération des emails en attente');
    
    const { campaignId } = await request.json();
    console.log('Campagne concernée:', campaignId);

    if (!campaignId) {
      console.log('ID de campagne manquant dans la requête');
      return NextResponse.json({ error: 'ID de campagne requis' }, { status: 400 });
    }

    try {
      console.log('Récupération des emails en attente via Firestore Admin...');
      
      // Vérifier d'abord si la campagne existe
      const campaignRef = adminDb.collection('campaigns').doc(campaignId);
      const campaignDoc = await campaignRef.get();
      
      if (!campaignDoc.exists) {
        console.log(`La campagne ${campaignId} n'existe pas dans Firestore. Vérifiez l'ID.`);
        return NextResponse.json({ 
          error: `La campagne ${campaignId} n'existe pas.`,
          pendingEmails: [] 
        }, { status: 404 });
      }
      
      // Récupérer les emails en attente depuis la sous-collection 'emails/en_attente/items'
      const pendingRef = campaignRef.collection('emails').doc('en_attente').collection('items');
      
      // Récupérer tous les emails en attente
      const pendingSnapshot = await pendingRef.get();
      
      const pendingEmails: Array<{email: string, timestamp: string, status: string, pendingReason?: string}> = [];
      
      console.log(`${pendingSnapshot.size} emails en attente trouvés`);
      
      pendingSnapshot.forEach(doc => {
        const data = doc.data();
        pendingEmails.push({
          email: data.email,
          timestamp: data.timestamp ? 
            (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : new Date(data.timestamp).toISOString()) 
            : new Date().toISOString(),
          status: 'pending',
          pendingReason: data.pendingReason
        });
      });
      
      // Ajouter des en-têtes CORS
      return new NextResponse(
        JSON.stringify({ pendingEmails }),
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
    console.error('Erreur lors de la récupération des emails en attente:', error);
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