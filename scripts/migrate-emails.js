require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

console.log('Variables d\'environnement Firebase chargées...');

// Initialiser Firebase Admin SDK avec les variables d'environnement
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    });
    console.log('✅ Firebase Admin SDK initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function migrateEmails() {
  try {
    console.log('🔄 Migration des emails vers la nouvelle structure...');
    
    // Récupérer toutes les campagnes
    const campaignsSnapshot = await db.collection('campaigns').get();
    
    if (campaignsSnapshot.empty) {
      console.log('⚠️ Aucune campagne trouvée dans la collection campaigns');
      return;
    }
    
    console.log(`📊 ${campaignsSnapshot.size} campagnes trouvées. Recherche d'emails à migrer...`);
    
    // Parcourir toutes les campagnes
    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaignId = campaignDoc.id;
      const campaignData = campaignDoc.data();
      
      console.log(`\n📂 Traitement de la campagne "${campaignId}" - ${campaignData.name || 'Sans nom'}`);
      
      // Récupérer tous les documents emails directement dans la collection emails (ancienne structure)
      const emailsCollection = campaignDoc.ref.collection('emails');
      const emailsSnapshot = await emailsCollection.get();
      
      console.log(`🔍 ${emailsSnapshot.size} emails trouvés dans l'ancienne structure (direct sous emails)`);
      
      if (emailsSnapshot.size > 0) {
        // Initialiser les compteurs
        let deliveredCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        
        // Créer le batch pour les updates (max 500 opérations)
        const batchSize = 450;
        let batch = db.batch();
        let operationCount = 0;
        
        // Parcourir tous les emails
        for (const emailDoc of emailsSnapshot.docs) {
          // Skip documents spéciaux comme 'config', 'delivered', 'en_attente', 'non_delivre'
          if (['config', 'delivered', 'en_attente', 'non_delivre'].includes(emailDoc.id)) {
            console.log(`⏩ Document spécial ignoré: ${emailDoc.id}`);
            continue;
          }
          
          const emailData = emailDoc.data();
          const status = emailData.status || 'delivered'; // Par défaut 'delivered'
          
          // Déterminer la sous-collection cible en fonction du statut
          let targetSubcollection;
          if (status === 'delivered') {
            targetSubcollection = 'delivered';
            deliveredCount++;
          } else if (status === 'pending') {
            targetSubcollection = 'en_attente';
            pendingCount++;
          } else {
            targetSubcollection = 'non_delivre';
            failedCount++;
          }
          
          // Créer la référence à la nouvelle location
          const targetRef = emailsCollection.doc(targetSubcollection).collection('items').doc(emailDoc.id);
          
          // Ajouter l'opération au batch
          batch.set(targetRef, emailData);
          operationCount++;
          
          console.log(`✅ Email ${emailData.email} migré vers ${targetSubcollection}`);
          
          // Si on atteint la limite du batch, on l'exécute et on en crée un nouveau
          if (operationCount >= batchSize) {
            await batch.commit();
            console.log(`🔄 Batch de ${operationCount} opérations exécuté`);
            batch = db.batch();
            operationCount = 0;
          }
        }
        
        // Exécuter le batch final s'il reste des opérations
        if (operationCount > 0) {
          await batch.commit();
          console.log(`🔄 Batch final de ${operationCount} opérations exécuté`);
        }
        
        // Mettre à jour le document de configuration
        await emailsCollection.doc('config').set({
          totalEmails: {
            delivered: deliveredCount,
            pending: pendingCount,
            failed: failedCount
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`📊 Migration terminée pour la campagne "${campaignId}"`);
        console.log(`   - ${deliveredCount} emails délivrés`);
        console.log(`   - ${pendingCount} emails en attente`);
        console.log(`   - ${failedCount} emails non délivrés`);
      } else {
        console.log(`ℹ️ Aucun email à migrer pour la campagne "${campaignId}"`);
      }
    }
    
    console.log('\n🎉 Migration des emails terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration des emails:', error);
  }
}

migrateEmails()
  .then(() => {
    console.log('🏁 Script terminé!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  }); 