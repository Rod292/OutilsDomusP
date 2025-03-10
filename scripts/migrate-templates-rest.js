// Script de migration utilisant l'API REST de Firestore
// Ce script lit les templates des deux collections et les fusionne dans newsletterTemplates
// sans nécessiter d'authentification utilisateur

const axios = require('axios');

// Configuration Firebase
const PROJECT_ID = 'etat-des-lieux-arthur-loyd';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Fonction pour récupérer tous les documents d'une collection
async function getCollection(collectionName) {
  try {
    const response = await axios.get(`${BASE_URL}/${collectionName}`);
    
    if (!response.data || !response.data.documents) {
      console.log(`Aucun document trouvé dans la collection ${collectionName}`);
      return [];
    }
    
    return response.data.documents.map(doc => {
      const docPath = doc.name.split('/');
      const docId = docPath[docPath.length - 1];
      
      // Convertir le format Firestore REST en objet JavaScript
      const data = {};
      for (const [key, value] of Object.entries(doc.fields || {})) {
        // Extraire la valeur selon le type
        if (value.stringValue !== undefined) data[key] = value.stringValue;
        else if (value.integerValue !== undefined) data[key] = parseInt(value.integerValue);
        else if (value.doubleValue !== undefined) data[key] = value.doubleValue;
        else if (value.booleanValue !== undefined) data[key] = value.booleanValue;
        else if (value.arrayValue !== undefined) {
          data[key] = (value.arrayValue.values || []).map(v => {
            if (v.stringValue !== undefined) return v.stringValue;
            if (v.integerValue !== undefined) return parseInt(v.integerValue);
            if (v.doubleValue !== undefined) return v.doubleValue;
            if (v.booleanValue !== undefined) return v.booleanValue;
            return null;
          });
        }
        else if (value.mapValue !== undefined) {
          data[key] = {};
          for (const [mapKey, mapValue] of Object.entries(value.mapValue.fields || {})) {
            if (mapValue.stringValue !== undefined) data[key][mapKey] = mapValue.stringValue;
            else if (mapValue.integerValue !== undefined) data[key][mapKey] = parseInt(mapValue.integerValue);
            else if (mapValue.doubleValue !== undefined) data[key][mapKey] = mapValue.doubleValue;
            else if (mapValue.booleanValue !== undefined) data[key][mapKey] = mapValue.booleanValue;
          }
        }
      }
      
      return {
        id: docId,
        ...data
      };
    });
  } catch (error) {
    console.error(`Erreur lors de la récupération de la collection ${collectionName}:`, error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    return [];
  }
}

// Fonction pour créer ou mettre à jour un document
async function setDocument(collectionName, docId, data) {
  try {
    // Convertir l'objet JavaScript en format Firestore REST
    const fields = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue; // Ignorer l'ID car il est déjà dans le chemin
      
      if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          fields[key] = { integerValue: value.toString() };
        } else {
          fields[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
        fields[key] = {
          arrayValue: {
            values: value.map(item => {
              if (typeof item === 'string') return { stringValue: item };
              if (typeof item === 'number') {
                if (Number.isInteger(item)) return { integerValue: item.toString() };
                return { doubleValue: item };
              }
              if (typeof item === 'boolean') return { booleanValue: item };
              return { nullValue: null };
            })
          }
        };
      } else if (typeof value === 'object' && value !== null) {
        const mapFields = {};
        for (const [mapKey, mapValue] of Object.entries(value)) {
          if (typeof mapValue === 'string') {
            mapFields[mapKey] = { stringValue: mapValue };
          } else if (typeof mapValue === 'number') {
            if (Number.isInteger(mapValue)) {
              mapFields[mapKey] = { integerValue: mapValue.toString() };
            } else {
              mapFields[mapKey] = { doubleValue: mapValue };
            }
          } else if (typeof mapValue === 'boolean') {
            mapFields[mapKey] = { booleanValue: mapValue };
          }
        }
        fields[key] = { mapValue: { fields: mapFields } };
      }
    }
    
    await axios.patch(
      `${BASE_URL}/${collectionName}/${docId}`,
      { fields },
      { params: { updateMask: 'fields' } }
    );
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du document ${docId}:`, error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    return false;
  }
}

// Fonction principale
async function migrateTemplates() {
  console.log('Début de la migration des templates...');
  
  try {
    // 1. Récupérer tous les templates de la collection newsletter_templates
    console.log('Récupération des templates de la collection newsletter_templates...');
    const oldTemplates = await getCollection('newsletter_templates');
    console.log(`Nombre de templates dans newsletter_templates: ${oldTemplates.length}`);
    
    // 2. Récupérer tous les templates de la collection newsletterTemplates
    console.log('Récupération des templates de la collection newsletterTemplates...');
    const newTemplates = await getCollection('newsletterTemplates');
    console.log(`Nombre de templates dans newsletterTemplates: ${newTemplates.length}`);
    
    // 3. Fusionner les templates en évitant les doublons
    const allTemplateIds = new Set([...oldTemplates.map(t => t.id), ...newTemplates.map(t => t.id)]);
    console.log(`Nombre total de templates uniques: ${allTemplateIds.size}`);
    
    // 4. Migrer les templates de l'ancienne collection vers la nouvelle
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const template of oldTemplates) {
      // Vérifier si le template existe déjà dans la nouvelle collection
      const existsInNew = newTemplates.some(t => t.id === template.id);
      
      if (!existsInNew) {
        // Créer un nouveau document avec le même ID dans la nouvelle collection
        const success = await setDocument('newsletterTemplates', template.id, template);
        if (success) {
          console.log(`Migré: ${template.id} - ${template.name || 'Sans nom'}`);
          migratedCount++;
        } else {
          console.log(`Échec de migration: ${template.id}`);
        }
      } else {
        console.log(`Ignoré (existe déjà): ${template.id} - ${template.name || 'Sans nom'}`);
        skippedCount++;
      }
    }
    
    console.log('\nRésumé de la migration:');
    console.log(`- Templates dans l'ancienne collection: ${oldTemplates.length}`);
    console.log(`- Templates dans la nouvelle collection avant migration: ${newTemplates.length}`);
    console.log(`- Templates migrés: ${migratedCount}`);
    console.log(`- Templates ignorés (doublons): ${skippedCount}`);
    console.log(`- Templates dans la nouvelle collection après migration: ${newTemplates.length + migratedCount}`);
    
    console.log('\nMigration terminée avec succès!');
    console.log('\nATTENTION: Ce script n\'a pas supprimé les templates de l\'ancienne collection.');
    console.log('Une fois que vous avez vérifié que tout fonctionne correctement, vous pouvez:');
    console.log('1. Modifier le code de l\'application pour n\'utiliser que la collection "newsletterTemplates"');
    console.log('2. Exécuter un script de nettoyage pour supprimer l\'ancienne collection si nécessaire');
    
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
}

// Exécuter la fonction principale
migrateTemplates()
  .then(() => {
    console.log('Script terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 