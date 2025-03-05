import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage de la vérification de désinscription');
    
    // Log de la requête
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const { email } = await request.json();
    console.log('Email à vérifier:', email);

    if (!email) {
      console.log('Email manquant dans la requête');
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier si l'email est dans la liste des désinscrits
    console.log('Connexion à Firestore...');
    if (!db) {
      console.error('Firestore non initialisé');
      throw new Error('Firestore non initialisé');
    }
    
    console.log('DB object:', db);
    
    const unsubscribedRef = collection(db, 'unsubscribed');
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
  } catch (error) {
    console.error('Erreur lors de la vérification de désinscription:', error);
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