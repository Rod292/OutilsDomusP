import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs, addDoc, Firestore, doc, setDoc } from 'firebase/firestore';
import { adminDb } from '@/app/lib/firebase-admin';

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
    console.log('Firebase DB est une instance de Firestore:', db instanceof Firestore);
    
    if (db) {
      console.log('Firebase DB propriétés:', Object.keys(db));
    } else {
      console.log('Firebase DB est null ou undefined');
    }
    
    // Vérifier si adminDb est disponible
    console.log('Admin DB disponible:', !!adminDb);
    
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

    // Utiliser adminDb si disponible, sinon utiliser db
    const firestore: Firestore = adminDb as Firestore || db;
    
    // Vérifier si Firestore est initialisé
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
    
    try {
      // Essayer de créer un document directement dans la collection pour s'assurer qu'elle existe
      console.log('Tentative de création d\'un document test pour vérifier la collection...');
      
      // Utiliser setDoc avec un ID spécifique pour éviter les doublons
      const testDocRef = doc(firestore, 'unsubscribed', 'test-document');
      await setDoc(testDocRef, { 
        test: true, 
        createdAt: new Date() 
      }, { merge: true });
      
      console.log('Document test créé avec succès, la collection existe');
      
      console.log('Tentative de création de la référence à la collection...');
      const unsubscribedRef = collection(firestore, 'unsubscribed');
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
      
      // Utiliser setDoc avec un ID basé sur l'email pour éviter les doublons
      const emailHash = Buffer.from(email).toString('base64').replace(/[+/=]/g, '');
      const emailDocRef = doc(firestore, 'unsubscribed', emailHash);
      
      await setDoc(emailDocRef, {
        email,
        unsubscribedAt: new Date(),
      });
      
      console.log('Email ajouté avec succès, ID du document:', emailHash);
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