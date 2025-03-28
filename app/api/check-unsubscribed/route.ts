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

    // Vérifier si adminDb est disponible
    console.log('Connexion à Firestore...');
    if (!adminDb) {
      console.error('Firebase Admin non initialisé');
      return NextResponse.json({ 
        error: 'Firebase Admin non initialisé',
        details: 'La connexion à la base de données n\'a pas pu être établie'
      }, { status: 500 });
    }
    
    try {
      // Utiliser directement adminDb pour les opérations Firestore Admin
      const unsubscribedCollection = adminDb.collection('unsubscribed');
      
      console.log('Exécution de la requête Firestore...');
      const querySnapshot = await unsubscribedCollection.where('email', '==', email).get();
      
      console.log('Résultat de la requête:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email,
          unsubscribedAt: doc.data().unsubscribedAt
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