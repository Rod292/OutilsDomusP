// Script de migration pour fusionner les collections newsletter_templates et newsletterTemplates
// Ce script lit les templates des deux collections et les fusionne dans newsletterTemplates

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config();

// Chemin vers le fichier de clé de service Firebase
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

// Initialiser Firebase Admin
let app;
try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    // Utiliser les variables d'environnement si le fichier n'existe pas
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
} catch (error) {
  console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
  process.exit(1);
}

const db = getFirestore();

// Fonction principale
async function migrateTemplates() {
  console.log('Début de la migration des templates...');
  
  try {
    // 1. Récupérer tous les templates de la collection newsletter_templates
    const oldCollectionRef = db.collection('newsletter_templates');
    const oldTemplatesSnapshot = await oldCollectionRef.get();
    
    console.log(`Nombre de templates dans newsletter_templates: ${oldTemplatesSnapshot.size}`);
    
    const oldTemplates = [];
    oldTemplatesSnapshot.forEach(doc => {
      oldTemplates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 2. Récupérer tous les templates de la collection newsletterTemplates
    const newCollectionRef = db.collection('newsletterTemplates');
    const newTemplatesSnapshot = await newCollectionRef.get();
    
    console.log(`Nombre de templates dans newsletterTemplates: ${newTemplatesSnapshot.size}`);
    
    const newTemplates = [];
    newTemplatesSnapshot.forEach(doc => {
      newTemplates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 3. Fusionner les templates en évitant les doublons
    const allTemplateIds = new Set([...oldTemplates.map(t => t.id), ...newTemplates.map(t => t.id)]);
    console.log(`Nombre total de templates uniques: ${allTemplateIds.size}`);
    
    // 4. Migrer les templates de l'ancienne collection vers la nouvelle
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const template of oldTemplates) {
      // Vérifier si le template existe déjà dans la nouvelle collection
      const existsInNew = newTemplates.some(t => t.id === template.id);
      
      if (!existsInNew) {
        // Créer un nouveau document avec le même ID dans la nouvelle collection
        await newCollectionRef.doc(template.id).set(template);
        console.log(`Migré: ${template.id} - ${template.name}`);
        migratedCount++;
      } else {
        console.log(`Ignoré (existe déjà): ${template.id} - ${template.name}`);
        skippedCount++;
      }
    }
    
    console.log('\nRésumé de la migration:');
    console.log(`- Templates dans l'ancienne collection: ${oldTemplatesSnapshot.size}`);
    console.log(`- Templates dans la nouvelle collection avant migration: ${newTemplatesSnapshot.size}`);
    console.log(`- Templates migrés: ${migratedCount}`);
    console.log(`- Templates ignorés (doublons): ${skippedCount}`);
    console.log(`- Templates dans la nouvelle collection après migration: ${newTemplatesSnapshot.size + migratedCount}`);
    
    console.log('\nMigration terminée avec succès!');
    console.log('\nATTENTION: Ce script n\'a pas supprimé les templates de l\'ancienne collection.');
    console.log('Une fois que vous avez vérifié que tout fonctionne correctement, vous pouvez:');
    console.log('1. Modifier le code de l\'application pour n\'utiliser que la collection "newsletterTemplates"');
    console.log('2. Exécuter un script de nettoyage pour supprimer l\'ancienne collection si nécessaire');
    
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
}

// Exécuter la fonction principale
migrateTemplates()
  .then(() => {
    console.log('Script terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 