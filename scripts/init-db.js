require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

console.log('Variables d\'environnement Firebase chargées:');
console.log('- PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('- CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓ défini' : '✗ non défini');
console.log('- PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓ défini' : '✗ non défini');

// Initialiser Firebase Admin SDK avec les variables d'environnement
if (!admin.apps.length) {
  // S'assurer que la clé privée est correctement formatée
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  // Configurer avec les variables d'environnement
  const serviceAccount = {
    "projectId": process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "clientEmail": process.env.FIREBASE_CLIENT_EMAIL,
    "privateKey": privateKey
  };
  
  console.log('Tentative d\'initialisation de Firebase avec les informations suivantes:');
  console.log(`- projectId: ${serviceAccount.projectId}`);
  console.log(`- clientEmail: ${serviceAccount.clientEmail}`);
  console.log(`- privateKey: ${privateKey ? '✓ défini' : '✗ non défini'}`);

  try {
    // Initialiser l'application
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

async function createCollections() {
  try {
    console.log('🔥 Création des sous-collections pour toutes les campagnes existantes...');
    
    // Récupérer toutes les campagnes existantes
    const campaignsSnapshot = await db.collection('campaigns').get();
    
    if (campaignsSnapshot.empty) {
      console.log('⚠️ Aucune campagne trouvée dans la collection campaigns');
    } else {
      console.log(`📁 ${campaignsSnapshot.size} campagnes trouvées. Création des sous-collections pour chacune...`);
      
      // Parcourir toutes les campagnes existantes
      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaignId = campaignDoc.id;
        const campaignData = campaignDoc.data();
        
        console.log(`📂 Traitement de la campagne "${campaignId}" - ${campaignData.name || 'Sans nom'}`);
        
        // Créer la structure des sous-collections
        const statuses = ['delivered', 'en_attente', 'non_delivre'];
        
        for (const status of statuses) {
          // Vérifier si la sous-collection emails/{status} existe déjà
          const emailsStatusCollection = campaignDoc.ref.collection('emails').doc(status).collection('items');
          const emailsStatusSnapshot = await emailsStatusCollection.limit(1).get();
          
          if (emailsStatusSnapshot.empty) {
            console.log(`📧 Création de la sous-collection emails/${status} pour la campagne "${campaignId}"...`);
            
            // Créer un email de test pour cette sous-collection
            const testEmail = `test-${status}-${campaignId.toLowerCase()}@example.com`;
            const emailId = Buffer.from(testEmail).toString('base64').replace(/[+/=]/g, '');
            
            // Préparer les données en fonction du statut
            const emailData = {
              email: testEmail,
              name: `Test ${status} pour ${campaignId}`,
              company: 'Test Company',
              status: status === 'delivered' ? 'delivered' : (status === 'en_attente' ? 'pending' : 'failed'),
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // Ajouter les champs spécifiques selon le statut
            if (status === 'non_delivre') {
              emailData.reason = 'Test de non livraison';
            }
            
            if (status === 'en_attente') {
              emailData.pendingReason = 'Test en attente';
            }
            
            await emailsStatusCollection.doc(emailId).set(emailData);
            
            console.log(`✅ Email de test "${status}" créé pour la campagne "${campaignId}": ${testEmail}`);
          } else {
            console.log(`ℹ️ La sous-collection emails/${status} existe déjà pour la campagne "${campaignId}"`);
          }
        }
        
        // Créer également un document de configuration pour les emails
        const emailsConfigRef = campaignDoc.ref.collection('emails').doc('config');
        const emailsConfigSnapshot = await emailsConfigRef.get();
        
        if (!emailsConfigSnapshot.exists) {
          await emailsConfigRef.set({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            totalEmails: {
              delivered: 1,
              pending: 1,
              failed: 1
            }
          });
          console.log(`✅ Document de configuration des emails créé pour la campagne "${campaignId}"`);
        } else {
          console.log(`ℹ️ Le document de configuration des emails existe déjà pour la campagne "${campaignId}"`);
        }
      }
    }
    
    // Vérifier la structure de la base de données
    console.log('\n🔍 Structure complète de la base de données:');
    const campaignsCollection = await db.collection('campaigns').get();
    
    for (const campaignDoc of campaignsCollection.docs) {
      console.log(`\n📁 Campagne: ${campaignDoc.id}`);
      
      // Récupérer les champs du document
      const data = campaignDoc.data();
      console.log('   - Nom:', data.name || 'Non défini');
      console.log('   - Emails envoyés:', data.stats?.emailsSent || 0);
      
      // Vérifier le document de configuration des emails
      const configDoc = await campaignDoc.ref.collection('emails').doc('config').get();
      if (configDoc.exists) {
        console.log('   - Configuration emails:', configDoc.data());
      }
      
      // Vérifier les sous-collections de statut
      const statuses = ['delivered', 'en_attente', 'non_delivre'];
      
      for (const status of statuses) {
        try {
          const statusCollection = await campaignDoc.ref.collection('emails').doc(status).collection('items').get();
          console.log(`   - emails/${status}: ${statusCollection.size} document(s)`);
          
          // Afficher les 2 premiers emails de chaque statut
          if (statusCollection.size > 0) {
            console.log(`     ${status.charAt(0).toUpperCase() + status.slice(1)}:`);
            statusCollection.docs.slice(0, 2).forEach(emailDoc => {
              const emailData = emailDoc.data();
              console.log(`     - ${emailData.email} (${emailData.status || status})`);
            });
            
            if (statusCollection.size > 2) {
              console.log(`     ... et ${statusCollection.size - 2} autre(s)`);
            }
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération de emails/${status} pour ${campaignId}:`, error);
        }
      }
    }
    
    console.log('\n🎉 Initialisation des collections terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la création des collections:', error);
  }
}

createCollections()
  .then(() => {
    console.log('🏁 Script terminé!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  }); 