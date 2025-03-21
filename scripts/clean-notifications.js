const admin = require('firebase-admin');

// Utiliser l'application déjà initialisée ou l'initialiser avec les variables d'environnement
try {
  // Tenter d'obtenir l'application existante
  admin.app();
} catch (error) {
  // Si aucune application n'existe, initialiser avec les variables d'environnement
  const firebaseConfig = require('../app/firebase-config.js');
  
  // Initialiser l'application Firebase Admin
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: firebaseConfig.databaseURL
  });
}

const db = admin.firestore();

async function deleteAllNotifications() {
  console.log('Début de la suppression des documents de la collection notifications...');
  
  try {
    // Récupérer tous les documents de la collection notifications
    const notificationsSnapshot = await db.collection('notifications').get();
    
    if (notificationsSnapshot.empty) {
      console.log('La collection notifications est déjà vide.');
      return;
    }
    
    // Supprimer chaque document
    const batch = db.batch();
    let count = 0;
    
    notificationsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    // Exécuter le batch
    await batch.commit();
    
    console.log(`✅ ${count} documents supprimés de la collection notifications.`);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des documents:', error);
  }
}

// Exécuter la fonction de suppression
deleteAllNotifications()
  .then(() => {
    console.log('Nettoyage de la collection notifications terminé');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur globale:', error);
    process.exit(1);
  }); 