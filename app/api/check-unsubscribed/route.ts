import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Firestore } from 'firebase/firestore';
import { adminDb } from '@/app/lib/firebase-admin';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de la vérification de désinscription');
    
    // Log de la requête
    const headers = request.headers ? Object.fromEntries(request.headers.entries()) : {};
    console.log('Request headers:', headers);
    
    let data;
    try {
      data = await request.json();
    } catch (error) {
      console.error('Erreur lors de la lecture du corps de la requête:', error);
      return NextResponse.json({ 
        error: 'Erreur lors de la lecture de la requête', 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 400 });
    }
    
    const { email } = data || {};
    console.log('Email à vérifier:', email);

    if (!email) {
      console.log('Email manquant dans la requête');
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Utiliser adminDb si disponible, sinon utiliser db
    const firestore: Firestore = adminDb as Firestore || db;
    
    // Vérifier si Firestore est initialisé
    console.log('Connexion à Firestore...');
    if (!firestore) {
      console.error('Firestore non initialisé');
      return NextResponse.json({ 
        error: 'Firestore non initialisé',
        dbType: typeof db,
        adminDbType: typeof adminDb,
        dbExists: !!db,
        adminDbExists: !!adminDb
      }, { status: 500 });
    }
    
    console.log('DB object type:', typeof firestore);
    
    try {
      const unsubscribedRef = collection(firestore, 'unsubscribed');
      const q = query(unsubscribedRef, where('email', '==', email));
      
      console.log('Exécution de la requête Firestore...');
      const querySnapshot = await getDocs(q);
      console.log('Résultat de la requête:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email,
          unsubscribedAt: doc.data().unsubscribedAt?.toDate?.()
        }))
      });

      const isUnsubscribed = !querySnapshot.empty;

      // Ajouter des en-têtes CORS
      return new NextResponse(
        JSON.stringify({ isUnsubscribed }),
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
    } catch (firestoreError) {
      console.error('Erreur Firestore spécifique:', firestoreError);
      return NextResponse.json({ 
        error: 'Erreur Firestore', 
        details: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
        stack: firestoreError instanceof Error ? firestoreError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de désinscription:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la vérification', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
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