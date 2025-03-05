import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs, addDoc, Firestore } from 'firebase/firestore';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage du processus de désinscription');
    
    // Log de la requête
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Vérifier l'initialisation de Firebase
    console.log('Firebase DB type:', typeof db);
    console.log('Firebase DB est une instance de Firestore:', db instanceof Firestore);
    console.log('Firebase DB propriétés:', Object.keys(db));
    
    const { email } = await request.json();
    console.log('Email à désinscrire:', email);

    if (!email) {
      console.log('Email manquant dans la requête');
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier si l'email est déjà dans la liste des désinscrits
    console.log('Connexion à Firestore...');
    if (!db) {
      console.error('Firestore non initialisé');
      return NextResponse.json({ 
        error: 'Firestore non initialisé', 
        dbType: typeof db,
        dbExists: !!db
      }, { status: 500 });
    }
    
    try {
      console.log('Tentative de création de la référence à la collection...');
      const unsubscribedRef = collection(db, 'unsubscribed');
      console.log('Référence à la collection créée avec succès');
      
      console.log('Création de la requête...');
      const q = query(unsubscribedRef, where('email', '==', email));
      console.log('Requête créée avec succès');
      
      console.log('Exécution de la requête Firestore...');
      const querySnapshot = await getDocs(q);
      console.log('Requête exécutée avec succès, résultats:', querySnapshot.size);
      
      if (!querySnapshot.empty) {
        console.log('Email déjà désinscrit');
        return NextResponse.json({ success: true, message: 'Déjà désinscrit' });
      }

      console.log('Ajout de l\'email à la liste des désinscrits...');
      const docRef = await addDoc(unsubscribedRef, {
        email,
        unsubscribedAt: new Date(),
      });
      console.log('Email ajouté avec succès, ID du document:', docRef.id);

      console.log('Email désinscrit avec succès');
    } catch (firestoreError) {
      console.error('Erreur Firestore spécifique:', firestoreError);
      return NextResponse.json({ 
        error: 'Erreur Firestore', 
        details: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
        stack: firestoreError instanceof Error ? firestoreError.stack : undefined
      }, { status: 500 });
    }

    // Ajouter des en-têtes CORS
    return new NextResponse(
      JSON.stringify({ success: true, message: 'Désabonnement réussi' }),
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
    console.error('Erreur lors de la désinscription:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la désinscription', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error
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