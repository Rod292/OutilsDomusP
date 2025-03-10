// Script pour créer une template par défaut dans la collection newsletterTemplates
// Cette template ne pourra pas être modifiée ou supprimée et servira de base pour les nouvelles newsletters

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, query, where } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
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

// Template par défaut avec seulement un titre
const defaultTemplate = {
  id: "template-par-defaut",
  name: "PEM SUD - Template par défaut",
  sections: [
    {
      id: "header",
      type: "header",
      content: {
        logoUrl: "",
        backgroundColor: "#ffffff",
        textColor: "#000000"
      },
      isVisible: true,
      isEditable: false,
      isDeletable: false
    },
    {
      id: "title",
      type: "title",
      content: {
        title: "Titre Principal",
        subtitle: "Sous-titre ou description",
        alignment: "center",
        backgroundColor: "#ffffff",
        textColor: "#000000"
      },
      isVisible: true,
      isEditable: true,
      isDeletable: false
    },
    {
      id: "footer",
      type: "footer",
      content: {
        companyName: "Arthur Loyd",
        address: "Adresse de l'entreprise",
        phone: "Téléphone",
        email: "Email",
        website: "Site web",
        logoUrl: "",
        socialLinks: []
      },
      isVisible: true,
      isEditable: false,
      isDeletable: false
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true,
  isProtected: true
};

// Fonction principale
async function createDefaultTemplate() {
  console.log('Authentification requise pour créer la template par défaut...');
  
  try {
    // Demander les identifiants
    const { email, password } = await promptCredentials();
    
    // Se connecter à Firebase
    console.log('Tentative de connexion...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Connexion réussie!');
    
    // Vérifier si la template par défaut existe déjà
    console.log('Vérification si la template par défaut existe déjà...');
    const templatesRef = collection(db, 'newsletterTemplates');
    const q = query(templatesRef, where("name", "==", "PEM SUD - Template par défaut"));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log('La template par défaut existe déjà.');
      querySnapshot.forEach(doc => {
        console.log(`ID: ${doc.id}, Nom: ${doc.data().name}`);
      });
      return;
    }
    
    // Créer la template par défaut
    console.log('Création de la template par défaut...');
    await setDoc(doc(db, 'newsletterTemplates', defaultTemplate.id), defaultTemplate);
    
    console.log('Template par défaut créée avec succès!');
    console.log(`ID: ${defaultTemplate.id}, Nom: ${defaultTemplate.name}`);
    
  } catch (error) {
    console.error('Erreur lors de la création de la template par défaut:', error);
  } finally {
    rl.close();
  }
}

// Exécuter la fonction principale
createDefaultTemplate()
  .then(() => {
    console.log('Script terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    rl.close();
    process.exit(1);
  }); 