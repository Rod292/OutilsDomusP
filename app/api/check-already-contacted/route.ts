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
      
      // Vérifier dans les trois sous-collections possible (delivered, en_attente, non_delivre)
      const statuses = ['delivered', 'en_attente', 'non_delivre'];
      let alreadyContacted = false;
      let foundInCollection = '';
      
      // Vérifier chaque statut
      for (const status of statuses) {
        // Récupérer la référence à la sous-collection correspondant au statut
        const emailRef = campaignRef.collection('emails').doc(status).collection('items').doc(emailId);
        const emailDoc = await emailRef.get();
        
        if (emailDoc.exists) {
          alreadyContacted = true;
          foundInCollection = status;
          break;
        }
      }
      
      // Vérifier également l'ancienne structure au cas où
      if (!alreadyContacted) {
        const legacyEmailRef = campaignRef.collection('emails').doc(emailId);
        const legacyEmailDoc = await legacyEmailRef.get();
        
        if (legacyEmailDoc.exists) {
          alreadyContacted = true;
          foundInCollection = 'legacy_structure';
        }
      }
      
      console.log('Email déjà contacté:', alreadyContacted, foundInCollection ? `(trouvé dans: ${foundInCollection})` : '');
      
      // Ajouter des en-têtes CORS
      return new NextResponse(
        JSON.stringify({ alreadyContacted, foundInCollection }),
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