import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs, addDoc, Firestore, doc, setDoc } from 'firebase/firestore';
import { adminDb } from '@/app/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Forcer le mode dynamique pour cette route API
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('Démarrage du processus de désinscription');
    
    // Log de la requête
    const headers = request.headers ? Object.fromEntries(request.headers.entries()) : {};
    console.log('Request headers:', headers);
    
    // Vérifier l'initialisation de Firebase
    console.log('Firebase DB type:', typeof db);
    console.log('Firebase Admin DB type:', typeof adminDb);
    
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
    console.log('Email à désinscrire:', email);

    if (!email) {
      console.log('Email manquant dans la requête');
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier si adminDb est disponible
    if (!adminDb) {
      console.error('Firebase Admin non initialisé');
      return NextResponse.json({ 
        error: 'Firebase Admin non initialisé',
        details: 'La connexion à la base de données n\'a pas pu être établie'
      }, { status: 500 });
    }
    
    try {
      console.log('Ajout de l\'email à la liste des désinscrits...');
      
      // Utiliser directement adminDb pour les opérations Firestore Admin
      // Créer un ID basé sur l'email pour éviter les doublons
      const emailHash = Buffer.from(email).toString('base64').replace(/[+/=]/g, '');
      
      // Vérifier d'abord si l'email est déjà désinscrit
      const unsubscribedCollection = adminDb.collection('unsubscribed');
      const querySnapshot = await unsubscribedCollection.where('email', '==', email).get();
      
      if (!querySnapshot.empty) {
        console.log('Email déjà désinscrit');
        return NextResponse.json({ success: true, message: 'Déjà désinscrit' });
      }
      
      // Ajouter l'email à la collection des désinscrits
      await unsubscribedCollection.doc(emailHash).set({
        email,
        unsubscribedAt: new Date(),
      });
      
      console.log('Email ajouté avec succès à la liste des désinscrits, ID du document:', emailHash);
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