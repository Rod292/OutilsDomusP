import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de la vérification d\'email déjà contacté');
    
    const { email, campaignId } = await request.json();
    console.log('Email à vérifier:', email);
    console.log('Campagne concernée:', campaignId);

    if (!email || !campaignId) {
      console.log('Email ou ID de campagne manquant dans la requête');
      return NextResponse.json({ error: 'Email et ID de campagne requis' }, { status: 400 });
    }

    try {
      console.log('Vérification dans Firestore Admin...');
      
      // Vérifier si la campagne existe
      const campaignRef = adminDb.collection('campaigns').doc(campaignId);
      const campaignDoc = await campaignRef.get();
      
      if (!campaignDoc.exists) {
        console.log(`La campagne ${campaignId} n'existe pas dans Firestore.`);
        return NextResponse.json({ 
          error: `La campagne ${campaignId} n'existe pas.`,
          alreadyContacted: false
        }, { status: 404 });
      }
      
      // Générer l'ID unique pour l'email dans le même format que add-to-contacted
      const emailId = Buffer.from(email).toString('base64').replace(/[+/=]/g, '');
      console.log('ID généré pour vérification:', emailId);
      
      // CORRECTION: Vérifier d'abord dans la structure exacte utilisée par add-to-contacted
      // Vérifier dans la sous-collection "delivered/items"
      const deliveredRef = campaignRef.collection('emails').doc('delivered').collection('items').doc(emailId);
      const deliveredDoc = await deliveredRef.get();
      
      if (deliveredDoc.exists) {
        console.log(`Email ${email} trouvé dans la sous-collection delivered/items`);
        return new NextResponse(
          JSON.stringify({ 
            alreadyContacted: true, 
            foundInCollection: 'delivered',
            details: 'Email trouvé dans la structure actuelle (delivered/items)'
          }),
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
      }
      
      // Vérifier dans les autres sous-collections possible (en_attente, non_delivre)
      const otherStatuses = ['en_attente', 'non_delivre'];
      for (const status of otherStatuses) {
        const statusRef = campaignRef.collection('emails').doc(status).collection('items').doc(emailId);
        const statusDoc = await statusRef.get();
        
        if (statusDoc.exists) {
          console.log(`Email ${email} trouvé dans la sous-collection ${status}/items`);
          return new NextResponse(
            JSON.stringify({ 
              alreadyContacted: true, 
              foundInCollection: status,
              details: `Email trouvé dans la structure actuelle (${status}/items)`
            }),
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
        }
      }
      
      // Vérifier également l'ancienne structure (directement dans la collection emails)
      const legacyEmailRef = campaignRef.collection('emails').doc(emailId);
      const legacyEmailDoc = await legacyEmailRef.get();
      
      if (legacyEmailDoc.exists) {
        console.log(`Email ${email} trouvé dans l'ancienne structure (directement dans emails)`);
        return new NextResponse(
          JSON.stringify({ 
            alreadyContacted: true, 
            foundInCollection: 'legacy_structure',
            details: 'Email trouvé dans l\'ancienne structure'
          }),
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
      }
      
      // Vérifier également dans la structure utilisée par send-gmail
      // (directement dans la collection emails avec le statut 'delivered')
      const sendGmailEmailRef = campaignRef.collection('emails').doc(emailId);
      const sendGmailEmailDoc = await sendGmailEmailRef.get();
      
      if (sendGmailEmailDoc.exists) {
        const data = sendGmailEmailDoc.data();
        if (data && data.status === 'delivered') {
          console.log(`Email ${email} trouvé dans la structure utilisée par send-gmail`);
          return new NextResponse(
            JSON.stringify({ 
              alreadyContacted: true, 
              foundInCollection: 'send_gmail_structure',
              details: 'Email trouvé dans la structure utilisée par send-gmail'
            }),
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
        }
      }
      
      // Si on arrive ici, l'email n'a pas été trouvé
      console.log(`Email ${email} non trouvé dans aucune structure`);
      
      // Ajouter des en-têtes CORS
      return new NextResponse(
        JSON.stringify({ 
          alreadyContacted: false,
          details: 'Email non trouvé dans aucune structure'
        }),
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
      console.error('Erreur Firestore lors de la vérification:', error);
      throw error;
    }
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