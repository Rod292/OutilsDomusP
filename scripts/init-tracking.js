// Script pour initialiser la collection campaign_tracking dans Firestore
// Exécuter avec: node scripts/init-tracking.js

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

// Vérifier si le fichier de clé de service existe
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Erreur: Le fichier de clé de service Firebase n'existe pas à l'emplacement: ${serviceAccountPath}`);
  console.log('Veuillez créer un fichier de clé de service dans la console Firebase et le placer à cet emplacement.');
  process.exit(1);
}

// Initialiser Firebase Admin
try {
  const serviceAccount = require(path.resolve(serviceAccountPath));
  
  initializeApp({
    credential: cert(serviceAccount)
  });
  
  console.log('Firebase Admin initialisé avec succès');
} catch (error) {
  console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
  process.exit(1);
}

// Référence à Firestore
const db = getFirestore();

// Fonction principale
async function main() {
  try {
    // Récupérer toutes les campagnes existantes
    const campaignsSnapshot = await db.collection('campaigns').get();
    
    if (campaignsSnapshot.empty) {
      console.log('Aucune campagne trouvée dans Firestore');
      return;
    }
    
    console.log(`${campaignsSnapshot.size} campagnes trouvées`);
    
    // Pour chaque campagne, créer un document de tracking s'il n'existe pas déjà
    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaignId = campaignDoc.id;
      const campaignData = campaignDoc.data();
      
      console.log(`Traitement de la campagne: ${campaignData.name} (${campaignId})`);
      
      // Vérifier si un document de tracking existe déjà
      const trackingDoc = await db.collection('campaign_tracking').doc(campaignId).get();
      
      if (trackingDoc.exists) {
        console.log(`Document de tracking déjà existant pour la campagne ${campaignId}`);
      } else {
        // Créer un nouveau document de tracking
        await db.collection('campaign_tracking').doc(campaignId).set({
          opens: [],
          clicks: [],
          timeData: [],
          consultantData: [],
          lastUpdated: new Date()
        });
        
        console.log(`Document de tracking créé pour la campagne ${campaignId}`);
      }
    }
    
    console.log('Initialisation terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des documents de tracking:', error);
  }
}

// Exécuter la fonction principale
main().then(() => {
  console.log('Script terminé');
  process.exit(0);
}).catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
}); 