// Script d'export pour les templates des collections newsletter_templates et newsletterTemplates
// Ce script utilise l'API Admin de Firebase pour exporter les données sans authentification utilisateur

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de clé de service (à télécharger depuis la console Firebase)
// Si le fichier n'existe pas, vous pouvez définir les variables d'environnement FIREBASE_*
const serviceAccountPath = path.join(__dirname, 'service-account.json');

// Initialiser Firebase Admin
let app;
if (fs.existsSync(serviceAccountPath)) {
  // Utiliser le fichier de clé de service
  const serviceAccount = require(serviceAccountPath);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Utiliser les variables d'environnement
  app = admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'etat-des-lieux-arthur-loyd',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  });
}

const db = admin.firestore();

// Fonction pour exporter les templates d'une collection
async function exportTemplates(collectionName, outputPath) {
  try {
    console.log(`Exportation des templates depuis ${collectionName}...`);
    
    const templatesRef = db.collection(collectionName);
    const templatesSnapshot = await templatesRef.get();
    
    if (templatesSnapshot.empty) {
      console.log(`Aucun template trouvé dans la collection ${collectionName}`);
      return [];
    }
    
    const templates = [];
    templatesSnapshot.forEach(doc => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`${templates.length} templates exportés depuis ${collectionName}`);
    
    // Écrire dans un fichier
    fs.writeFileSync(outputPath, JSON.stringify(templates, null, 2));
    console.log(`Templates exportés vers ${outputPath}`);
    
    return templates;
  } catch (error) {
    console.error(`Erreur lors de l'exportation des templates depuis ${collectionName}:`, error);
    throw error;
  }
}

// Fonction principale
async function exportAllTemplates() {
  const tempDir = path.join(__dirname, 'temp');
  const oldTemplatesPath = path.join(tempDir, 'newsletter_templates.json');
  const newTemplatesPath = path.join(tempDir, 'newsletterTemplates.json');
  
  // Créer le répertoire temporaire s'il n'existe pas
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  try {
    // Exporter les templates des deux collections
    const oldTemplates = await exportTemplates('newsletter_templates', oldTemplatesPath);
    const newTemplates = await exportTemplates('newsletterTemplates', newTemplatesPath);
    
    // Analyser les différences
    const oldIds = new Set(oldTemplates.map(t => t.id));
    const newIds = new Set(newTemplates.map(t => t.id));
    
    const uniqueToOld = [...oldIds].filter(id => !newIds.has(id));
    const uniqueToNew = [...newIds].filter(id => !oldIds.has(id));
    const common = [...oldIds].filter(id => newIds.has(id));
    
    console.log('\nAnalyse des collections:');
    console.log(`- Templates uniquement dans newsletter_templates: ${uniqueToOld.length}`);
    console.log(`- Templates uniquement dans newsletterTemplates: ${uniqueToNew.length}`);
    console.log(`- Templates communs aux deux collections: ${common.length}`);
    
    // Créer un fichier de différences pour faciliter la migration manuelle
    const diffPath = path.join(tempDir, 'templates_diff.json');
    fs.writeFileSync(diffPath, JSON.stringify({
      uniqueToOld,
      uniqueToNew,
      common
    }, null, 2));
    console.log(`Différences exportées vers ${diffPath}`);
    
    // Créer un fichier de templates à migrer (ceux qui sont uniquement dans l'ancienne collection)
    const toMigratePath = path.join(tempDir, 'templates_to_migrate.json');
    const templatesToMigrate = oldTemplates.filter(t => uniqueToOld.includes(t.id));
    fs.writeFileSync(toMigratePath, JSON.stringify(templatesToMigrate, null, 2));
    console.log(`Templates à migrer exportés vers ${toMigratePath}`);
    
    console.log('\nExportation terminée avec succès!');
    console.log('\nPour migrer les templates:');
    console.log('1. Utilisez les fichiers JSON exportés pour importer manuellement les templates');
    console.log('2. Ou créez un script d\'import qui utilise ces fichiers JSON');
    
  } catch (error) {
    console.error('Erreur lors de l\'exportation:', error);
  }
}

// Exécuter la fonction principale
exportAllTemplates()
  .then(() => {
    console.log('Script terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 