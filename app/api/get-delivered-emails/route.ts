import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de la récupération des emails délivrés');
    
    const { campaignId } = await request.json();
    console.log('Campagne concernée:', campaignId);

    if (!campaignId) {
      console.log('ID de campagne manquant dans la requête');
      return NextResponse.json({ error: 'ID de campagne requis' }, { status: 400 });
    }

    try {
      console.log('Récupération des emails délivrés via Firestore Admin...');
      
      // Vérifier d'abord si la campagne existe
      const campaignRef = adminDb.collection('campaigns').doc(campaignId);
      const campaignDoc = await campaignRef.get();
      
      if (!campaignDoc.exists) {
        console.log(`La campagne ${campaignId} n'existe pas, création de la campagne...`);
        await campaignRef.set({
          name: 'Campagne principale',
          createdAt: new Date(),
          updatedAt: new Date(),
          stats: {
            emailsSent: 0,
            lastSent: null
          }
        });
        console.log(`Campagne ${campaignId} créée avec succès`);
      } else {
        console.log(`Campagne ${campaignId} trouvée:`, campaignDoc.data());
      }
      
      // Récupérer les emails délivrés depuis la sous-collection 'emails' de la campagne
      const emailsRef = adminDb.collection('campaigns').doc(campaignId).collection('emails');
      console.log('Chemin de la collection:', `campaigns/${campaignId}/emails`);
      
      // Lister toutes les emails d'abord pour vérifier le contenu
      const allEmailsSnapshot = await emailsRef.get();
      console.log(`Nombre total d'emails dans la sous-collection: ${allEmailsSnapshot.size}`);
      
      allEmailsSnapshot.forEach(doc => {
        console.log(`Email trouvé - ID: ${doc.id}, Données:`, doc.data());
      });

      // Récupérer uniquement les emails délivrés
      const deliveriesQuery = emailsRef.where('status', '==', 'delivered');
      const deliveriesSnapshot = await deliveriesQuery.get();
      
      const deliveredEmails: Array<{email: string, timestamp: string, status: string}> = [];
      
      console.log(`${deliveriesSnapshot.size} emails avec statut 'delivered' trouvés`);
      
      deliveriesSnapshot.forEach(doc => {
        const data = doc.data();
        deliveredEmails.push({
          email: data.email,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
          status: data.status
        });
        console.log(`Email délivré ajouté: ${data.email}`);
      });
      
      console.log(`${deliveredEmails.length} emails délivrés renvoyés au client`);
      
      // Ajouter des en-têtes CORS
      return new NextResponse(
        JSON.stringify({ deliveredEmails }),
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
    console.error('Erreur lors de la récupération des emails délivrés:', error);
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