// Import des modules requis
require('dotenv').config();
const path = require('path');

// Import de firebase-admin depuis le répertoire de l'application
const { adminDb } = require('../app/lib/firebase-admin');

async function initialize() {
  console.log('Initialisation de la structure Firestore');
  
  try {
    // Vérifier si le document campagne existe
    const campaignDoc = await adminDb.collection('campaigns').doc('campagne').get();
    
    if (!campaignDoc.exists) {
      console.log('Création du document campagne...');
      await adminDb.collection('campaigns').doc('campagne').set({
        name: 'Campagne principale',
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          emailsSent: 0,
          lastSent: null
        }
      });
      console.log('Document campagne créé avec succès');
    } else {
      console.log('Le document campagne existe déjà:', campaignDoc.data());
    }
    
    // Créer la sous-collection emails si elle n'existe pas déjà
    const emailsSnapshot = await adminDb.collection('campaigns').doc('campagne').collection('emails').limit(1).get();
    
    if (emailsSnapshot.empty) {
      console.log('La sous-collection emails est vide, ajout d\'un exemple...');
      
      // Créer un document exemple dans la sous-collection emails
      const emailId = Buffer.from('exemple@example.com').toString('base64').replace(/[+/=]/g, '');
      await adminDb.collection('campaigns').doc('campagne').collection('emails').doc(emailId).set({
        email: 'exemple@example.com',
        name: 'Exemple Utilisateur',
        company: 'Société Exemple',
        status: 'delivered',
        timestamp: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Document exemple ajouté à la sous-collection emails');
    } else {
      console.log('La sous-collection emails contient déjà des documents:');
      emailsSnapshot.forEach(doc => {
        console.log(' -', doc.id, ':', doc.data());
      });
    }
    
    // Lister toutes les collections et documents pour vérifier
    console.log('\nStructure complète de la base de données:');
    await listCollections();
    
    console.log('\nInitialisation terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
}

async function listCollections(parentPath = '') {
  try {
    let collections;
    if (parentPath === '') {
      collections = await adminDb.listCollections();
    } else {
      const parentRef = adminDb.doc(parentPath);
      collections = await parentRef.listCollections();
    }
    
    for (const collection of collections) {
      const collPath = parentPath ? `${parentPath}/${collection.id}` : collection.id;
      console.log(`Collection: ${collPath}`);
      
      const docs = await collection.listDocuments();
      for (const doc of docs) {
        const docSnapshot = await doc.get();
        console.log(` - Document: ${doc.id}`);
        
        // Lister les sous-collections de ce document
        const subCollections = await doc.listCollections();
        for (const subColl of subCollections) {
          const subCollPath = `${collPath}/${doc.id}/${subColl.id}`;
          console.log(`   * Sous-collection: ${subColl.id}`);
          
          // Liste quelques documents de la sous-collection
          const subDocs = await subColl.limit(5).get();
          if (subDocs.empty) {
            console.log('     (vide)');
          } else {
            subDocs.forEach(subDoc => {
              console.log(`     - ${subDoc.id}`);
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la liste des collections:', error);
  }
}

// Exécuter la fonction d'initialisation
initialize().then(() => {
  console.log('Script terminé');
}).catch(err => {
  console.error('Erreur:', err);
}); 