const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Récupération de la clé privée avec correction des caractères d'échappement
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

// Configuration Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
    process.env.FIREBASE_CLIENT_EMAIL || ''
  )}`
};

// Afficher les informations de configuration (sans les valeurs sensibles)
console.log('Configuration Firebase Admin:', {
  project_id: serviceAccount.project_id ? 'Défini' : 'Non défini',
  private_key: serviceAccount.private_key ? 'Défini' : 'Non défini',
  client_email: serviceAccount.client_email ? 'Défini' : 'Non défini'
});

// Initialisation de Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'etat-des-lieux-arthur-loyd.appspot.com'
  });
  
  console.log('Firebase Admin initialisé avec succès');
} catch (error) {
  console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
  process.exit(1);
}

const bucket = admin.storage().bucket();

// Fonction pour télécharger un fichier vers Firebase Storage
async function uploadFile(filePath, destinationPath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier n'existe pas: ${filePath}`);
      return null;
    }
    
    console.log(`Lecture du fichier: ${filePath}`);
    
    // Configurer les métadonnées pour le fichier
    const metadata = {
      contentType: getContentType(filePath),
      metadata: {
        firebaseStorageDownloadTokens: Date.now().toString()
      }
    };
    
    console.log(`Téléchargement vers: ${destinationPath}`);
    
    // Télécharger le fichier
    const [file] = await bucket.upload(filePath, {
      destination: destinationPath,
      metadata: metadata
    });
    
    // Obtenir l'URL de téléchargement
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // URL valide pour une longue période
    });
    
    console.log(`Fichier téléchargé: ${url}`);
    return url;
  } catch (error) {
    console.error(`Erreur lors du téléchargement de ${filePath}:`, error);
    return null;
  }
}

// Déterminer le type de contenu en fonction de l'extension du fichier
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
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
    console.warn(`Le répertoire ${sourceDir} n'existe pas.`);
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
  process.exit(1);
}); 