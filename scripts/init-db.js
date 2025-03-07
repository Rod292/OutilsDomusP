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
    console.log('🔥 Création des sous-collections emails pour toutes les campagnes existantes...');
    
    // Récupérer toutes les campagnes existantes
    const campaignsSnapshot = await db.collection('campaigns').get();
    
    if (campaignsSnapshot.empty) {
      console.log('⚠️ Aucune campagne trouvée dans la collection campaigns');
    } else {
      console.log(`📁 ${campaignsSnapshot.size} campagnes trouvées. Création de sous-collections emails pour chacune...`);
      
      // Parcourir toutes les campagnes existantes
      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaignId = campaignDoc.id;
        const campaignData = campaignDoc.data();
        
        console.log(`📂 Traitement de la campagne "${campaignId}" - ${campaignData.name || 'Sans nom'}`);
        
        // Vérifier si la sous-collection emails existe déjà
        const emailsSnapshot = await campaignDoc.ref.collection('emails').limit(1).get();
        
        if (emailsSnapshot.empty) {
          console.log(`📧 Création de la sous-collection emails pour la campagne "${campaignId}"...`);
          
          // Créer des emails de test pour cette campagne
          const testEmail = `test-${campaignId.toLowerCase()}@example.com`;
          const emailId = Buffer.from(testEmail).toString('base64').replace(/[+/=]/g, '');
          
          await campaignDoc.ref.collection('emails').doc(emailId).set({
            email: testEmail,
            name: `Test pour ${campaignId}`,
            company: 'Test Company',
            status: 'delivered',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Email de test créé pour la campagne "${campaignId}": ${testEmail}`);
        } else {
          console.log(`ℹ️ La sous-collection emails existe déjà pour la campagne "${campaignId}"`);
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
      
      // Récupérer les emails de la campagne
      const emailsCollection = await campaignDoc.ref.collection('emails').get();
      console.log(`   - Sous-collection emails: ${emailsCollection.size} document(s)`);
      
      // Afficher les 3 premiers emails
      const emailsToShow = emailsCollection.size > 3 ? 3 : emailsCollection.size;
      if (emailsCollection.size > 0) {
        console.log('     Emails:');
        emailsCollection.docs.slice(0, emailsToShow).forEach(emailDoc => {
          const emailData = emailDoc.data();
          console.log(`     - ${emailData.email} (${emailData.status})`);
        });
        
        if (emailsCollection.size > 3) {
          console.log(`     ... et ${emailsCollection.size - 3} autre(s)`);
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