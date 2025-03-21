/**
 * Script pour vérifier la configuration Firebase et la clé VAPID
 * Exécutez-le avec : node scripts/check-firebase-config.js
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// Fonction pour vérifier la configuration Firebase
function checkFirebaseConfig() {
  console.log('=== VÉRIFICATION DE LA CONFIGURATION FIREBASE ===');
  
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY'
  ];
  
  const missingVars = [];
  const config = {};
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
    } else {
      // Masquer les valeurs sensibles
      if (varName === 'NEXT_PUBLIC_FIREBASE_API_KEY' || varName === 'NEXT_PUBLIC_FIREBASE_APP_ID') {
        config[varName] = `${value.substring(0, 5)}...`;
      } else if (varName === 'NEXT_PUBLIC_FIREBASE_VAPID_KEY') {
        config[varName] = {
          preview: `${value.substring(0, 5)}...`,
          length: value.length,
          startsWith: value.charAt(0),
          isCorrect: value.startsWith('B')
        };
      } else {
        config[varName] = value;
      }
    }
  });
  
  if (missingVars.length > 0) {
    console.error('\n❌ Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.log('\n⚠️ Veuillez ajouter ces variables dans votre fichier .env.local');
  } else {
    console.log('\n✅ Toutes les variables d\'environnement requises sont définies.');
  }
  
  console.log('\n🔎 Configuration Firebase actuelle:');
  console.log(JSON.stringify(config, null, 2));
  
  // Vérification spécifique pour la clé VAPID
  checkVapidKey();
  
  return !missingVars.length;
}

// Fonction pour vérifier la clé VAPID
function checkVapidKey() {
  console.log('\n=== VÉRIFICATION DE LA CLÉ VAPID ===');
  
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  
  if (!vapidKey) {
    console.error('❌ Clé VAPID manquante dans .env.local');
    console.log('⚠️ Ajoutez NEXT_PUBLIC_FIREBASE_VAPID_KEY à votre fichier .env.local');
    return false;
  }
  
  console.log(`ℹ️ Longueur de la clé VAPID: ${vapidKey.length} caractères`);
  console.log(`ℹ️ Premier caractère: ${vapidKey.charAt(0)}`);
  
  if (!vapidKey.startsWith('B')) {
    console.error('❌ Format de clé VAPID incorrect. Elle doit commencer par "B".');
    console.log('\n⚠️ Solutions possibles:');
    console.log('1. Vérifiez que vous utilisez la clé VAPID publique (et non la clé privée).');
    console.log('2. Assurez-vous que la clé commence par "B" et ressemble à: BDxAQY...');
    console.log('3. Régénérez une nouvelle paire de clés VAPID dans la console Firebase.');
    console.log('\n📋 Instructions pour générer les clés VAPID:');
    console.log('   - Allez sur la console Firebase: https://console.firebase.google.com/');
    console.log('   - Sélectionnez votre projet');
    console.log('   - Allez dans Paramètres du projet > Cloud Messaging');
    console.log('   - Sous "Web Push certificates", cliquez sur "Generate key pair"');
    console.log('   - Copiez la clé générée et ajoutez-la à votre .env.local');
    return false;
  }
  
  console.log('✅ Le format de la clé VAPID semble correct.');
  
  // Vérifier le service worker
  checkServiceWorker();
  
  return true;
}

// Fonction pour vérifier le service worker
function checkServiceWorker() {
  console.log('\n=== VÉRIFICATION DU SERVICE WORKER ===');
  
  const swPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
  
  if (!fs.existsSync(swPath)) {
    console.error('❌ Le fichier firebase-messaging-sw.js n\'existe pas.');
    console.log('⚠️ Créez ce fichier dans le dossier public/ avec la configuration Firebase.');
    return false;
  }
  
  console.log('✅ Le fichier firebase-messaging-sw.js existe.');
  
  // Lire le contenu pour vérifier la configuration
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  // Vérifier les importations
  if (!swContent.includes('importScripts')) {
    console.error('❌ Le service worker ne contient pas les importations nécessaires.');
  } else {
    console.log('✅ Les importations semblent correctes.');
  }
  
  // Vérifier l'initialisation
  if (!swContent.includes('firebase.initializeApp')) {
    console.error('❌ Le service worker n\'initialise pas Firebase.');
  } else {
    console.log('✅ Initialisation de Firebase détectée.');
  }
  
  // Vérifier la gestion des messages
  if (!swContent.includes('onBackgroundMessage')) {
    console.error('❌ Le service worker ne gère pas les messages en arrière-plan.');
  } else {
    console.log('✅ Gestionnaire de messages en arrière-plan détecté.');
  }
  
  // Vérifier l'ID du projet
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId && !swContent.includes(projectId)) {
    console.warn('⚠️ Le service worker ne contient peut-être pas l\'ID de projet correct.');
    console.log(`   L'ID de projet ${projectId} n'a pas été trouvé dans le fichier.`);
  } else if (projectId) {
    console.log('✅ L\'ID de projet est présent dans le service worker.');
  }
  
  console.log('\n📋 Conseil: Si vous rencontrez des problèmes, essayez de:');
  console.log('1. Redémarrer le navigateur pour forcer l\'enregistrement du service worker');
  console.log('2. Vérifier la console du navigateur pour les erreurs spécifiques');
  console.log('3. Utiliser chrome://inspect/#service-workers pour inspecter les service workers');
  
  return true;
}

// Exécuter les vérifications
const configValid = checkFirebaseConfig();

console.log('\n=== RÉSUMÉ ===');
if (configValid) {
  console.log('✅ La configuration de base semble correcte.');
} else {
  console.log('❌ Des problèmes ont été détectés dans la configuration.');
}

console.log('\n📋 Pour tester les notifications:');
console.log('1. Assurez-vous que le service est en cours d\'exécution: npm run dev');
console.log('2. Ouvrez http://localhost:3000/api/test-firebase dans votre navigateur pour vérifier la configuration');
console.log('3. Visitez la page du plan Notion et activez les notifications');

// Vérifier si Firebase est correctement configuré dans le projet
verifyFirebaseProjectSetup();

function verifyFirebaseProjectSetup() {
  console.log('\n=== VÉRIFICATION DE LA CONFIGURATION DU PROJET FIREBASE ===');
  console.log('Pour utiliser les notifications push, assurez-vous que:');
  console.log('1. Web Push API est activée dans votre projet Firebase');
  console.log('2. Le domaine de votre application est autorisé dans Firebase Authentication');
  console.log('3. Les règles Firestore permettent la lecture/écriture des tokens de notification');
  
  console.log('\nPour activer les notifications dans le panneau Firebase:');
  console.log('1. Allez sur https://console.firebase.google.com/');
  console.log('2. Sélectionnez votre projet');
  console.log('3. Allez dans Build > Cloud Messaging');
  console.log('4. Activez l\'API Web Push si ce n\'est pas déjà fait');
  console.log('5. Générez les clés VAPID si nécessaire');
  
  console.log('\nVérifiez également les autorisations dans:');
  console.log('- Firebase Authentication > Sign-in method > Authorized domains');
  console.log('- Firestore Database > Rules');
} 