// Script d'export-import pour migrer les templates entre collections
// Ce script exporte les templates de newsletter_templates et les importe dans newsletterTemplates

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  query,
  limit 
} = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDujTJIyvicJnP-nMgodJs63rU0fDA69Qc",
  authDomain: "etat-des-lieux-arthur-loyd.firebaseapp.com",
  projectId: "etat-des-lieux-arthur-loyd",
  storageBucket: "etat-des-lieux-arthur-loyd.firebasestorage.app",
  messagingSenderId: "602323147221",
  appId: "1:602323147221:web:7a1d976ac0478b593b455c"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Créer une interface pour lire l'entrée utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour demander l'email et le mot de passe
function promptCredentials() {
  return new Promise((resolve) => {
    rl.question('Email: ', (email) => {
      rl.question('Mot de passe: ', (password) => {
        resolve({ email, password });
      });
    });
  });
}

// Fonction pour exporter les templates vers un fichier JSON
async function exportTemplates(collectionName, outputPath) {
  try {
    console.log(`Exportation des templates depuis ${collectionName}...`);
    
    const templatesRef = collection(db, collectionName);
    const templatesSnapshot = await getDocs(templatesRef);
    
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

// Fonction pour importer les templates depuis un fichier JSON
async function importTemplates(inputPath, collectionName) {
  try {
    console.log(`Importation des templates vers ${collectionName}...`);
    
    // Lire le fichier
    const templates = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Récupérer les templates existants pour éviter les doublons
    const existingTemplatesRef = collection(db, collectionName);
    const existingTemplatesSnapshot = await getDocs(existingTemplatesRef);
    
    const existingTemplateIds = new Set();
    existingTemplatesSnapshot.forEach(doc => {
      existingTemplateIds.add(doc.id);
    });
    
    console.log(`${existingTemplateIds.size} templates existants dans ${collectionName}`);
    
    // Importer les templates
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const template of templates) {
      if (existingTemplateIds.has(template.id)) {
        console.log(`Ignoré (existe déjà): ${template.id} - ${template.name || 'Sans nom'}`);
        skippedCount++;
        continue;
      }
      
      await setDoc(doc(db, collectionName, template.id), template);
      console.log(`Importé: ${template.id} - ${template.name || 'Sans nom'}`);
      importedCount++;
    }
    
    console.log(`\nRésumé de l'importation vers ${collectionName}:`);
    console.log(`- Templates importés: ${importedCount}`);
    console.log(`- Templates ignorés (doublons): ${skippedCount}`);
    
    return { importedCount, skippedCount };
  } catch (error) {
    console.error(`Erreur lors de l'importation des templates vers ${collectionName}:`, error);
    throw error;
  }
}

// Fonction principale
async function migrateTemplates() {
  const tempDir = path.join(__dirname, 'temp');
  const oldTemplatesPath = path.join(tempDir, 'newsletter_templates.json');
  
  // Créer le répertoire temporaire s'il n'existe pas
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  console.log('Authentification requise pour la migration...');
  
  try {
    // Demander les identifiants
    const { email, password } = await promptCredentials();
    
    // Se connecter à Firebase
    console.log('Tentative de connexion...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Connexion réussie!');
    
    // Étape 1: Exporter les templates de l'ancienne collection
    const oldTemplates = await exportTemplates('newsletter_templates', oldTemplatesPath);
    
    // Étape 2: Importer les templates dans la nouvelle collection
    const importResult = await importTemplates(oldTemplatesPath, 'newsletterTemplates');
    
    console.log('\nMigration terminée avec succès!');
    console.log(`- Templates dans l'ancienne collection: ${oldTemplates.length}`);
    console.log(`- Templates migrés vers la nouvelle collection: ${importResult.importedCount}`);
    console.log(`- Templates ignorés (doublons): ${importResult.skippedCount}`);
    
    console.log('\nATTENTION: Ce script n\'a pas supprimé les templates de l\'ancienne collection.');
    console.log('Une fois que vous avez vérifié que tout fonctionne correctement, vous pouvez:');
    console.log('1. Modifier le code de l\'application pour n\'utiliser que la collection "newsletterTemplates"');
    console.log('2. Exécuter un script de nettoyage pour supprimer l\'ancienne collection si nécessaire');
    
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    rl.close();
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
    rl.close();
    process.exit(1);
  }); 