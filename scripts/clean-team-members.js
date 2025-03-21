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

async function removeDuplicateTeamMembers() {
  console.log('Début de la suppression des doublons dans la collection teamMembers...');
  
  try {
    // Récupérer tous les membres de l'équipe
    const teamMembersSnapshot = await db.collection('teamMembers').get();
    
    if (teamMembersSnapshot.empty) {
      console.log('La collection teamMembers est vide.');
      return;
    }
    
    // Créer un Map pour stocker les membres uniques par email
    const uniqueMembers = new Map();
    const duplicates = [];
    
    // Identifier les doublons
    teamMembersSnapshot.forEach(doc => {
      const member = doc.data();
      const email = member.email?.toLowerCase();
      
      if (!email) {
        console.log(`⚠️ Membre sans email trouvé: ${doc.id}`);
        return;
      }
      
      if (!uniqueMembers.has(email)) {
        // Premier document pour cet email - le considérer comme unique
        uniqueMembers.set(email, {
          id: doc.id,
          data: member
        });
      } else {
        // Document en double pour cet email - l'ajouter à la liste des doublons
        duplicates.push({
          id: doc.id,
          email: email
        });
      }
    });
    
    console.log(`Total des membres: ${teamMembersSnapshot.size}`);
    console.log(`Membres uniques: ${uniqueMembers.size}`);
    console.log(`Doublons identifiés: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('Aucun doublon trouvé dans la collection teamMembers.');
      return;
    }
    
    // Supprimer les doublons
    const batch = db.batch();
    
    duplicates.forEach(dup => {
      const docRef = db.collection('teamMembers').doc(dup.id);
      batch.delete(docRef);
      console.log(`Marqué pour suppression: ${dup.id} (${dup.email})`);
    });
    
    // Exécuter le batch
    await batch.commit();
    
    console.log(`✅ ${duplicates.length} doublons supprimés de la collection teamMembers.`);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des doublons:', error);
  }
}

// Exécuter la fonction de suppression des doublons
removeDuplicateTeamMembers()
  .then(() => {
    console.log('Nettoyage des doublons de la collection teamMembers terminé');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur globale:', error);
    process.exit(1);
  }); 