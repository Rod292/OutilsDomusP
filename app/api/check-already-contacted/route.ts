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
      
      // Vérifier si l'email existe dans la sous-collection 'emails' de la campagne
      // Utiliser le même format d'ID que dans add-to-contacted
      const emailId = Buffer.from(email).toString('base64').replace(/[+/=]/g, '');
      const emailRef = adminDb.collection('campaigns').doc(campaignId)
                             .collection('emails').doc(emailId);
      
      const emailDoc = await emailRef.get();
      
      const alreadyContacted = emailDoc.exists;
      console.log('Email déjà contacté:', alreadyContacted);
      
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