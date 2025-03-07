import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase-admin';
import { FieldValue, Firestore } from 'firebase-admin/firestore';

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
      
      // Vérifier si le document de tracking existe
      const trackingRef = (adminDb as Firestore).collection('campaign_tracking').doc(campaignId);
      const trackingDoc = await trackingRef.get();
      
      if (trackingDoc.exists) {
        console.log('Document de tracking trouvé, mise à jour...');
        const trackingData = trackingDoc.data();
        const contactedEmails = trackingData?.contactedEmails || [];
        
        // Vérifier si l'email est déjà dans la liste
        if (!contactedEmails.includes(email)) {
          // Ajouter l'email à la liste
          await trackingRef.update({
            contactedEmails: FieldValue.arrayUnion(email),
            updatedAt: new Date()
          });
          console.log('Email ajouté à la liste des contactés');
        } else {
          console.log('Email déjà dans la liste des contactés');
        }
      } else {
        console.log('Document de tracking non trouvé, création...');
        // Créer un nouveau document de tracking
        await trackingRef.set({
          campaignId,
          contactedEmails: [email],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('Nouveau document de tracking créé avec l\'email');
      }
      
      // Ajouter l'email à la collection 'emails' de la campagne
      const emailId = Buffer.from(email).toString('base64').replace(/[+/=]/g, '');
      const emailRef = (adminDb as Firestore).collection('campaigns').doc(campaignId).collection('emails').doc(emailId);
      
      // Vérifier si l'email existe déjà dans la collection
      const emailDoc = await emailRef.get();
      
      if (!emailDoc.exists) {
        // Ajouter l'email à la collection avec le statut 'delivered'
        await emailRef.set({
          email: email,
          status: 'delivered',
          timestamp: new Date(),
          updatedAt: new Date()
        });
        console.log('Email ajouté à la collection des emails délivrés');
      } else {
        // Mettre à jour le statut de l'email à 'delivered'
        await emailRef.update({
          status: 'delivered',
          updatedAt: new Date()
        });
        console.log('Statut de l\'email mis à jour à "delivered"');
      }
      
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