// Script d'import pour les templates vers la collection newsletterTemplates
// Ce script utilise l'API Firebase Web pour importer les données avec authentification utilisateur

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc } = require('firebase/firestore');
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

// Fonction pour importer les templates depuis un fichier JSON
async function importTemplates(inputPath, collectionName) {
  try {
    console.log(`Importation des templates vers ${collectionName}...`);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(inputPath)) {
      console.error(`Le fichier ${inputPath} n'existe pas.`);
      return { importedCount: 0, skippedCount: 0 };
    }
    
    // Lire le fichier
    const templates = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`${templates.length} templates trouvés dans le fichier.`);
    
    // Importer les templates
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const template of templates) {
      // Vérifier si le template existe déjà
      const docRef = doc(db, collectionName, template.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log(`Ignoré (existe déjà): ${template.id} - ${template.name || 'Sans nom'}`);
        skippedCount++;
        continue;
      }
      
      // Créer un nouveau document avec le même ID
      await setDoc(docRef, template);
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
async function importAllTemplates() {
  const tempDir = path.join(__dirname, 'temp');
  const toMigratePath = path.join(tempDir, 'templates_to_migrate.json');
  
  console.log('Authentification requise pour l\'importation...');
  
  try {
    // Demander les identifiants
    const { email, password } = await promptCredentials();
    
    // Se connecter à Firebase
    console.log('Tentative de connexion...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Connexion réussie!');
    
    // Importer les templates
    const importResult = await importTemplates(toMigratePath, 'newsletterTemplates');
    
    console.log('\nImportation terminée avec succès!');
    console.log(`- Templates importés: ${importResult.importedCount}`);
    console.log(`- Templates ignorés (doublons): ${importResult.skippedCount}`);
    
    console.log('\nATTENTION: Ce script n\'a pas supprimé les templates de l\'ancienne collection.');
    console.log('Une fois que vous avez vérifié que tout fonctionne correctement, vous pouvez:');
    console.log('1. Modifier le code de l\'application pour n\'utiliser que la collection "newsletterTemplates"');
    console.log('2. Exécuter un script de nettoyage pour supprimer l\'ancienne collection si nécessaire');
    
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
  } finally {
    rl.close();
  }
}

// Exécuter la fonction principale
importAllTemplates()
  .then(() => {
    console.log('Script terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    rl.close();
    process.exit(1);
  }); 