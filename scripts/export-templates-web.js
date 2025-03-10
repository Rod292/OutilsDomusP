// Script d'export pour les templates des collections newsletter_templates et newsletterTemplates
// Ce script utilise l'API Firebase Web pour exporter les données avec authentification utilisateur

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

// Fonction pour exporter les templates d'une collection
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

// Fonction principale
async function exportAllTemplates() {
  const tempDir = path.join(__dirname, 'temp');
  const oldTemplatesPath = path.join(tempDir, 'newsletter_templates.json');
  const newTemplatesPath = path.join(tempDir, 'newsletterTemplates.json');
  
  // Créer le répertoire temporaire s'il n'existe pas
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  console.log('Authentification requise pour l\'exportation...');
  
  try {
    // Demander les identifiants
    const { email, password } = await promptCredentials();
    
    // Se connecter à Firebase
    console.log('Tentative de connexion...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Connexion réussie!');
    
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
  } finally {
    rl.close();
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
    rl.close();
    process.exit(1);
  }); 