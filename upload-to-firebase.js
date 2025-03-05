const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuration Firebase avec les variables d'environnement
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "etat-des-lieux-arthur-loyd.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('Configuration Firebase:', {
  apiKey: firebaseConfig.apiKey ? 'Défini' : 'Non défini',
  authDomain: firebaseConfig.authDomain ? 'Défini' : 'Non défini',
  projectId: firebaseConfig.projectId ? 'Défini' : 'Non défini',
  storageBucket: firebaseConfig.storageBucket ? 'Défini' : 'Non défini',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'Défini' : 'Non défini',
  appId: firebaseConfig.appId ? 'Défini' : 'Non défini'
});

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Fonction pour télécharger un fichier vers Firebase Storage
async function uploadFile(filePath, destinationPath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier n'existe pas: ${filePath}`);
      return null;
    }
    
    console.log(`Lecture du fichier: ${filePath}`);
    const fileContent = fs.readFileSync(filePath);
    
    const storageRef = ref(storage, destinationPath);
    console.log(`Téléchargement vers: ${destinationPath}`);
    
    const snapshot = await uploadBytes(storageRef, fileContent);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log(`Fichier téléchargé: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`Erreur lors du téléchargement de ${filePath}:`, error);
    return null;
  }
}

// Fonction principale pour télécharger toutes les images
async function uploadAllImages() {
  // Images spécifiques à télécharger
  const imageFiles = [
    { localPath: 'public/newsletter-pemsud/Logo Arthur Loyd.png', storagePath: 'newsletter-images/Logo Arthur Loyd.png' },
    { localPath: 'public/newsletter-pemsud/logo-arthur-loyd.png', storagePath: 'newsletter-images/logo-arthur-loyd.png' },
    { localPath: 'public/newsletter-pemsud/Project photo 1.png', storagePath: 'newsletter-images/Project photo 1.png' },
    { localPath: 'public/newsletter-pemsud/Project Photo 2.png', storagePath: 'newsletter-images/Project Photo 2.png' },
    { localPath: 'public/newsletter-pemsud/Project photo 3.png', storagePath: 'newsletter-images/Project photo 3.png' }
  ];
  
  // Vérifier les autres images dans le dossier
  const sourceDir = path.join(__dirname, 'public', 'newsletter-pemsud');
  console.log(`Recherche d'images dans: ${sourceDir}`);
  
  if (fs.existsSync(sourceDir)) {
    try {
      const files = fs.readdirSync(sourceDir);
      console.log(`Fichiers trouvés dans le dossier: ${files.join(', ')}`);
      
      // Ajouter les autres images du dossier qui ne sont pas déjà dans la liste
      for (const file of files) {
        if ((file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) && 
            !imageFiles.some(img => img.localPath.endsWith(file))) {
          imageFiles.push({
            localPath: `public/newsletter-pemsud/${file}`,
            storagePath: `newsletter-images/${file}`
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du parcours du répertoire:', error);
    }
  } else {
    console.warn(`Le répertoire ${sourceDir} n'existe pas. Vérification des chemins alternatifs...`);
    // Essayer avec le dossier public à la racine
    const altDir = path.join(__dirname, 'public');
    if (fs.existsSync(altDir)) {
      console.log(`Dossier alternatif trouvé: ${altDir}`);
    }
  }
  
  // Télécharger toutes les images
  const imageURLs = {};
  for (const image of imageFiles) {
    const fullPath = path.join(__dirname, image.localPath);
    const url = await uploadFile(fullPath, image.storagePath);
    if (url) {
      imageURLs[path.basename(image.localPath)] = url;
    }
  }
  
  // Sauvegarder les URLs dans un fichier JSON pour référence future
  fs.writeFileSync(
    path.join(__dirname, 'image-urls.json'),
    JSON.stringify(imageURLs, null, 2)
  );
  
  console.log('Opération terminée. Les URLs sont sauvegardées dans image-urls.json');
}

// Exécuter le script
uploadAllImages().catch(error => {
  console.error('Erreur lors de l\'exécution du script:', error);
}); 