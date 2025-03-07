import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase-admin';
import { Firestore, FieldValue } from 'firebase-admin/firestore';

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

    try {
      console.log('Ajout de l\'email à la liste des contactés via Firestore Admin...');
      
      // Vérifier si la campagne existe
      const campaignRef = adminDb.collection('campaigns').doc(campaignId);
      const campaignDoc = await campaignRef.get();
      
      if (!campaignDoc.exists) {
        console.log(`La campagne ${campaignId} n'existe pas dans Firestore. Vérifiez l'ID.`);
        return NextResponse.json({ 
          error: `La campagne ${campaignId} n'existe pas.` 
        }, { status: 404 });
      } else {
        const campaignData = campaignDoc.data() || {};
        console.log(`Campagne ${campaignId} trouvée:`, campaignData.name || '(sans nom)');
      }
      
      // Générer l'ID unique pour l'email
      const emailId = Buffer.from(email).toString('base64').replace(/[+/=]/g, '');
      
      // Récupérer la référence à la sous-collection "delivered"
      const deliveredRef = campaignRef.collection('emails').doc('delivered').collection('items').doc(emailId);
      
      // Vérifier si l'email existe déjà dans la sous-collection
      const emailDoc = await deliveredRef.get();
      
      // Données de l'email à ajouter
      const emailData = {
        email: email,
        status: 'delivered',
        timestamp: new Date(),
        updatedAt: new Date()
      };
      
      // Transaction pour mettre à jour à la fois l'email et les compteurs
      await adminDb.runTransaction(async (transaction) => {
        if (!emailDoc.exists) {
          // Ajouter l'email à la sous-collection "delivered"
          transaction.set(deliveredRef, emailData);
          console.log(`Email ${email} ajouté à la sous-collection delivered pour la campagne ${campaignId}`);
          
          // Mettre à jour le compteur dans le document de configuration
          const configRef = campaignRef.collection('emails').doc('config');
          const configDoc = await transaction.get(configRef);
          
          if (configDoc.exists) {
            // Mettre à jour le compteur existant
            transaction.update(configRef, {
              'totalEmails.delivered': FieldValue.increment(1),
              'lastUpdated': new Date()
            });
          } else {
            // Créer un nouveau document de configuration
            transaction.set(configRef, {
              totalEmails: {
                delivered: 1,
                pending: 0,
                failed: 0
              },
              lastUpdated: new Date()
            });
          }
        } else {
          // L'email existe déjà, mettre à jour la date
          transaction.update(deliveredRef, {
            updatedAt: new Date()
          });
          console.log(`Email ${email} existe déjà dans la sous-collection delivered pour la campagne ${campaignId}`);
        }
      });
      
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