const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Générer les clés VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Clés VAPID générées avec succès !');
console.log('\nClé publique VAPID:');
console.log(vapidKeys.publicKey);
console.log('\nClé privée VAPID:');
console.log(vapidKeys.privateKey);

// Préparer les lignes à ajouter au fichier .env.local
const envVars = [
  '\n# Firebase Cloud Messaging (Web Push)',
  `NEXT_PUBLIC_FIREBASE_VAPID_KEY=${vapidKeys.publicKey}`,
  `FIREBASE_VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`,
];

// Chemin vers le fichier .env.local
const envFilePath = path.join(process.cwd(), '.env.local');

// Lire le fichier .env.local s'il existe ou créer un contenu vide
let envContent = '';
try {
  envContent = fs.readFileSync(envFilePath, 'utf8');
} catch (error) {
  console.log('Le fichier .env.local n\'existe pas, il sera créé.');
}

// Vérifier si les variables VAPID existent déjà
const hasVapidKeys = envContent.includes('NEXT_PUBLIC_FIREBASE_VAPID_KEY') || 
                    envContent.includes('FIREBASE_VAPID_PRIVATE_KEY');

// Si les clés existent déjà, demander confirmation
if (hasVapidKeys) {
  console.log('\n⚠️ Des clés VAPID existent déjà dans votre fichier .env.local.');
  console.log('Si vous remplacez ces clés, les utilisateurs devront accorder à nouveau leur permission pour les notifications.');
  console.log('\nPour ajouter ces clés à votre fichier .env.local, ajoutez manuellement les lignes suivantes :');
  console.log(envVars.join('\n'));
} else {
  // Ajouter les variables d'environnement au fichier .env.local
  fs.appendFileSync(envFilePath, envVars.join('\n') + '\n');
  console.log('\n✅ Les clés VAPID ont été ajoutées au fichier .env.local');
}

console.log('\nConfiguration pour Firebase console:');
console.log('1. Allez sur la console Firebase: https://console.firebase.google.com/');
console.log('2. Sélectionnez votre projet');
console.log('3. Allez dans Project Settings > Cloud Messaging');
console.log('4. Dans Web configuration, ajoutez la clé Web Push certificate:');
console.log(`   ${vapidKeys.publicKey}`);
console.log('\nN\'oubliez pas de redémarrer votre serveur Next.js pour que les changements soient pris en compte.'); 