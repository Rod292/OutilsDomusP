// Script de migration pour fusionner les collections newsletter_templates et newsletterTemplates
// Ce script lit les templates des deux collections et les fusionne dans newsletterTemplates

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, setDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const readline = require('readline');

// Configuration Firebase (identique à celle utilisée dans l'application)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDujTJIyvicJnP-nMgodJs63rU0fDA69Qc",
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

// Fonction principale
async function migrateTemplates() {
  console.log('Authentification requise pour la migration...');
  
  try {
    // Demander les identifiants
    const { email, password } = await promptCredentials();
    
    // Se connecter à Firebase
    console.log('Tentative de connexion...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Connexion réussie!');
    
    console.log('Début de la migration des templates...');
    
    // 1. Récupérer tous les templates de la collection newsletter_templates
    const oldCollectionRef = collection(db, 'newsletter_templates');
    const oldTemplatesSnapshot = await getDocs(oldCollectionRef);
    
    console.log(`Nombre de templates dans newsletter_templates: ${oldTemplatesSnapshot.size}`);
    
    const oldTemplates = [];
    oldTemplatesSnapshot.forEach(doc => {
      oldTemplates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 2. Récupérer tous les templates de la collection newsletterTemplates
    const newCollectionRef = collection(db, 'newsletterTemplates');
    const newTemplatesSnapshot = await getDocs(newCollectionRef);
    
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
        await setDoc(doc(db, 'newsletterTemplates', template.id), template);
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