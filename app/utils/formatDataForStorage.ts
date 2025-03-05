/**
 * Fonction utilitaire pour nettoyer et préparer les données avant leur enregistrement dans Firestore
 * Permet d'éviter les erreurs "invalid-argument Property data contains an invalid nested entity"
 */

// Importer Firebase Storage (importez ici les bibliothèques Firebase nécessaires)
import { storage } from '@/lib/firebase'; // Assurez-vous que ce chemin est correct
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';

/**
 * Prépare les données d'un rapport pour l'enregistrement dans Firestore
 * - Convertit les objets complexes en chaînes JSON si nécessaire
 * - Extrait les valeurs principales des objets d'état
 * - Gère les références circulaires et autres structures problématiques
 * - Stocke les images en base64 dans Firebase Storage et conserve les références
 * 
 * @param data Les données du rapport à nettoyer
 * @returns Les données nettoyées et prêtes pour Firestore
 */
export async function sanitizeReportDataForFirestore(data: any): Promise<any> {
  console.log("========== DÉBUT DU NETTOYAGE DES DONNÉES POUR FIRESTORE ==========");
  console.log("Type de données reçues:", typeof data);
  console.log("Storage référence disponible:", storage ? "OUI" : "NON");
  
  if (!storage) {
    console.error("ERREUR CRITIQUE: La référence à Firebase Storage est null");
    throw new Error("La référence à Firebase Storage est nulle. Impossible de continuer.");
  }

  // Fonction pour vérifier si un objet peut être stocké dans Firestore
  const isFirestoreSafe = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
    if (value instanceof Date) return true;
    
    // Cas problématique : objet ou tableau trop profond
    return false;
  };

  // Fonction pour convertir un objet complexe en chaîne JSON
  const safeObjectForFirestore = (obj: any): any => {
    // Si c'est une valeur simple ou null/undefined, la retourner telle quelle
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    
    // Si c'est un objet Date, le convertir en string ISO
    if (obj instanceof Date) return obj.toISOString();
    
    try {
      // Essayer de convertir en JSON puis reparsé pour garantir que l'objet est sérialisable
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error("Objet non sérialisable détecté:", obj);
      // Retourner une version simplifiée de l'objet si la conversion échoue
      return { 
        _error: "Objet non sérialisable",
        _type: typeof obj,
        _keys: obj ? Object.keys(obj) : [] 
      };
    }
  };
  
  // Crée une copie profonde pour ne pas modifier l'original
  let cleanedData;
  try {
    cleanedData = JSON.parse(JSON.stringify(data));
    console.log("Copie profonde des données réussie");
  } catch (error) {
    console.error("Erreur lors de la copie profonde, détails:", error);
    // Si la copie profonde échoue (probablement en raison d'objets circulaires), on fait une copie simple
    cleanedData = { ...data };
    console.log("Utilisation d'une copie simple à la place");
  }
  
  // Si les pièces existent, nettoyons chaque élément de chaque pièce
  if (cleanedData.pieces && Array.isArray(cleanedData.pieces)) {
    console.log(`Traitement de ${cleanedData.pieces.length} pièces`);
    
    // Utiliser Promise.all pour traiter toutes les pièces en parallèle
    const processedPieces = await Promise.all(cleanedData.pieces.map(async (piece: any, index: number) => {
      console.log(`Traitement de la pièce ${index + 1}/${cleanedData.pieces.length}: ${piece.nom || 'Sans nom'}`);
      
      // Si la pièce a un objet 'etat'
      if (piece.etat && typeof piece.etat === 'object') {
        // Pour chaque propriété de l'état
        Object.keys(piece.etat).forEach(key => {
          const value = piece.etat[key];
          
          // Si la valeur est un objet complexe, la remplacer par une version simplifiée
          if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
            console.log(`Simplification de l'objet etat.${key} pour la pièce ${index + 1}`);
            // Chercher une valeur textuelle dans l'objet
            if (value.etat) piece.etat[key] = value.etat;
            else if (value.label) piece.etat[key] = value.label;
            else if (value.value) piece.etat[key] = value.value;
            else if (value.text) piece.etat[key] = value.text;
            else piece.etat[key] = JSON.stringify(value);
          }
        });
      }
      
      // Si des photos sont présentes
      if (piece.photos && Array.isArray(piece.photos)) {
        console.log(`Traitement de ${piece.photos.length} photos pour la pièce ${index + 1}`);
        console.log(`Types des photos: ${piece.photos.map((p: any) => typeof p).join(', ')}`);
        
        // Set pour éviter les doublons
        const uniquePhotos = new Set<string>();
        
        // Traiter chaque photo en parallèle
        const processedPhotos = await Promise.all(piece.photos
          .filter((photo: any) => photo !== null && photo !== undefined)
          .map(async (photo: any, photoIndex: number) => {
            try {
              console.log(`Traitement de la photo ${photoIndex} pour la pièce ${index + 1}, type: ${typeof photo}`);
              if (typeof photo === 'object') {
                console.log(`Propriétés de l'objet photo: ${Object.keys(photo).join(', ')}`);
              }
              
              // Si c'est un objet File, le convertir en métadonnées
              if (photo instanceof File || (typeof photo === 'object' && photo.name && photo.size && photo.type)) {
                console.log(`Photo ${photoIndex} est un objet File, conversion en métadonnées`);
                return {
                  type: 'file_metadata',
                  name: photo.name || 'photo.jpg',
                  size: photo.size || 0,
                  lastModified: photo.lastModified || Date.now()
                };
              }
              
              // Si c'est déjà un objet avec une URL ou des métadonnées, le conserver tel quel
              if (photo && typeof photo === 'object') {
                // Si c'est déjà un objet avec URL, l'utiliser directement
                if (photo.url) {
                  console.log(`Photo ${photoIndex} est un objet avec URL, extraction de l'URL`);
                  return photo.url;
                }
                
                // Si c'est déjà un objet avec des métadonnées et un type base64 ou file
                if (photo.type === 'base64_metadata' || photo.type === 'file_metadata') {
                  console.log(`Photo ${photoIndex} est déjà un objet metadata, conservation`);
                  
                  // S'assurer que l'objet est sérialisable
                  const safePhoto = safeObjectForFirestore(photo);
                  console.log(`Photo après sérialisation: ${JSON.stringify(safePhoto).substring(0, 100)}...`);
                  return safePhoto;
                }
                
                // Si c'est un autre type d'objet, le convertir en chaîne JSON
                console.log(`Photo ${photoIndex} est un objet non reconnu, conversion en JSON`);
                return JSON.stringify(photo);
              }
              
              // Si c'est une chaîne base64, la stocker dans Firebase Storage
              if (typeof photo === 'string' && photo.startsWith('data:')) {
                // Vérifier si cette photo a déjà été ajoutée (par signature)
                const signature = photo.substring(0, 50) + photo.length;
                if (uniquePhotos.has(signature)) {
                  console.log(`Photo ${photoIndex} ignorée car doublon détecté par signature`);
                  return null;
                }
                
                uniquePhotos.add(signature);
                console.log(`Photo ${photoIndex} est une image base64, début du traitement d'upload`);
                
                try {
                  // Générer un nom de fichier unique pour le stockage
                  const timestamp = Date.now();
                  const randomId = Math.random().toString(36).substring(2, 8);
                  const fileName = `images/pieces/${piece.id || index}/photo_${timestamp}_${randomId}.jpg`;
                  console.log(`Nom de fichier généré: ${fileName}`);
                  
                  // Créer une référence dans Firebase Storage
                  const imageRef = ref(storage, fileName);
                  console.log(`Référence Storage créée: ${imageRef.fullPath}`);
                  
                  console.log("Début de l'upload de l'image...");
                  
                  // Stocker l'image dans Firebase Storage avec plus de logs
                  try {
                    const uploadResult = await uploadString(imageRef, photo, 'data_url');
                    console.log(`Image ${photoIndex} téléchargée avec succès:`, {
                      ref: uploadResult.ref.fullPath
                    });
                    
                    // Obtenir l'URL de téléchargement
                    try {
                      const downloadUrl = await getDownloadURL(imageRef);
                      console.log(`URL de téléchargement obtenue: ${downloadUrl.substring(0, 50)}...`);
                      
                      // Retourner plusieurs formats pour assurer la compatibilité lors du rechargement
                      return {
                        type: 'base64_metadata',
                        signature: signature,
                        timestamp: timestamp,
                        fileName: fileName,
                        downloadUrl: downloadUrl,
                        // Stocker un petit aperçu de l'image pour le chargement initial rapide
                        preview: photo.substring(0, 100),
                        fullUrl: downloadUrl, // Doublon pour compatibilité
                        url: downloadUrl,     // Doublon pour compatibilité
                        // Conserver un indicateur pour savoir si l'image est stockée dans Firebase
                        isFirebaseStored: true
                      };
                    } catch (urlError) {
                      if (urlError instanceof FirebaseError) {
                        console.error(`Erreur Firebase lors de la récupération de l'URL (${photoIndex}):`, {
                          code: urlError.code,
                          message: urlError.message,
                          name: urlError.name
                        });
                      } else {
                        console.error(`Erreur lors de la récupération de l'URL (${photoIndex}):`, urlError);
                      }
                      throw urlError;
                    }
                  } catch (uploadError) {
                    if (uploadError instanceof FirebaseError) {
                      console.error(`Erreur Firebase lors de l'upload (${photoIndex}):`, {
                        code: uploadError.code, 
                        message: uploadError.message,
                        name: uploadError.name
                      });
                      
                      // Analyse spécifique pour CORS
                      if (uploadError.message && uploadError.message.includes('CORS')) {
                        console.error("ERREUR CORS DÉTECTÉE! Le bucket Firebase Storage n'est probablement pas configuré pour accepter les requêtes depuis cette origine.");
                        console.error("Veuillez configurer CORS sur votre bucket Firebase Storage en utilisant le fichier cors.json et la commande gsutil:");
                        console.error("gsutil cors set cors.json gs://NOM-DU-BUCKET");
                      }
                    } else {
                      console.error(`Erreur lors de l'upload (${photoIndex}):`, uploadError);
                    }
                    throw uploadError;
                  }
                } catch (storageError) {
                  console.error(`Erreur globale lors du stockage de l'image ${photoIndex}:`, storageError);
                  
                  // En cas d'erreur, stocker uniquement les métadonnées minimales
                  return {
                    type: 'base64_metadata',
                    signature: signature,
                    timestamp: Date.now(),
                    error: 'Erreur de stockage',
                    errorDetail: storageError instanceof Error ? storageError.message : 'Erreur inconnue',
                    // Ne pas stocker l'image source complète
                    source: photo.substring(0, 20) + '...' 
                  };
                }
              }
              
              // Si c'est une chaîne mais pas base64, la conserver telle quelle
              if (typeof photo === 'string') {
                console.log(`Photo ${photoIndex} est une chaîne non-base64, conservation telle quelle`);
                return photo;
              }
              
              console.log(`Photo ${photoIndex} de type non géré: ${typeof photo}, valeur:`, photo);
              return null;
            } catch (error) {
              console.error(`Erreur lors du traitement de la photo ${photoIndex}:`, error);
              return null;
            }
          }));
        
        // Filtrer les photos nulles et les assigner à la pièce
        const filteredPhotos = processedPhotos.filter((photo: any) => photo !== null);
        console.log(`Après traitement: ${filteredPhotos.length} photos valides sur ${processedPhotos.length}`);
        piece.photos = filteredPhotos;
      }
      
      return piece;
    }));
    
    // Remplacer les pièces par les pièces traitées
    cleanedData.pieces = processedPieces;
  }
  
  // Vérifier les objets compteurs
  if (cleanedData.compteurs && typeof cleanedData.compteurs === 'object') {
    console.log("Traitement des compteurs");
    
    // Traiter chaque type de compteur en parallèle
    await Promise.all(['eau', 'electricite', 'gaz'].map(async (compteurType) => {
      if (cleanedData.compteurs[compteurType] && 
          cleanedData.compteurs[compteurType].photos && 
          Array.isArray(cleanedData.compteurs[compteurType].photos)) {
        
        console.log(`Traitement de ${cleanedData.compteurs[compteurType].photos.length} photos pour le compteur ${compteurType}`);
        
        // Set pour éviter les doublons
        const uniquePhotos = new Set<string>();
        
        // Traiter chaque photo en parallèle
        const processedPhotos = await Promise.all(cleanedData.compteurs[compteurType].photos
          .filter((photo: any) => photo !== null && photo !== undefined)
          .map(async (photo: any, photoIndex: number) => {
            try {
              // Si c'est un objet File, le convertir en métadonnées
              if (photo instanceof File || (typeof photo === 'object' && photo.name && photo.size && photo.type)) {
                return {
                  type: 'file_metadata',
                  name: photo.name || 'photo.jpg',
                  size: photo.size || 0,
                  lastModified: photo.lastModified || Date.now()
                };
              }
              
              // Si c'est déjà un objet avec une URL ou des métadonnées, le conserver tel quel
              if (photo && typeof photo === 'object') {
                // Si c'est déjà un objet avec URL, l'utiliser directement
                if (photo.url) {
                  return photo.url;
                }
                
                // Si c'est déjà un objet avec des métadonnées et un type base64 ou file
                if (photo.type === 'base64_metadata' || photo.type === 'file_metadata') {
                  return safeObjectForFirestore(photo);
                }
                
                // Pour les autres objets, les convertir en JSON
                return JSON.stringify(photo);
              }
              
              // Si c'est une chaîne base64, la stocker dans Firebase Storage
              if (typeof photo === 'string' && photo.startsWith('data:')) {
                // Vérifier si cette photo a déjà été ajoutée (par signature)
                const signature = photo.substring(0, 50) + photo.length;
                if (uniquePhotos.has(signature)) {
                  return null;
                }
                
                uniquePhotos.add(signature);
                
                try {
                  // Générer un nom de fichier unique pour le stockage
                  const timestamp = Date.now();
                  const randomId = Math.random().toString(36).substring(2, 8);
                  const fileName = `images/compteurs/${compteurType}/photo_${timestamp}_${randomId}.jpg`;
                  
                  // Créer une référence dans Firebase Storage
                  const imageRef = ref(storage, fileName);
                  
                  // Stocker l'image dans Firebase Storage
                  await uploadString(imageRef, photo, 'data_url');
                  
                  // Obtenir l'URL de téléchargement
                  const downloadUrl = await getDownloadURL(imageRef);
                  
                  // Retourner les métadonnées avec l'URL de téléchargement
                  return {
                    type: 'base64_metadata',
                    signature: signature,
                    timestamp: timestamp,
                    fileName: fileName,
                    downloadUrl: downloadUrl,
                    source: photo.substring(0, 20) + '...' // Version courte
                  };
                } catch (storageError) {
                  console.error(`Erreur lors du stockage de l'image ${photoIndex} du compteur ${compteurType}:`, storageError);
                  
                  // En cas d'erreur, stocker uniquement les métadonnées
                  return {
                    type: 'base64_metadata',
                    signature: signature,
                    timestamp: Date.now(),
                    error: 'Erreur de stockage',
                    source: photo.substring(0, 20) + '...' // Version courte
                  };
                }
              }
              
              return photo;
            } catch (error) {
              console.error(`Erreur lors du traitement de la photo ${photoIndex} du compteur ${compteurType}:`, error);
              return null;
            }
          }));
        
        // Filtrer les photos nulles et les assigner au compteur
        cleanedData.compteurs[compteurType].photos = processedPhotos.filter((photo: any) => photo !== null);
      }
    }));
  }
  
  // Vérification finale pour s'assurer que toutes les données sont compatibles avec Firestore
  try {
    console.log("Vérification finale des données pour Firestore");
    // Test de sérialisation complète
    const serializedData = JSON.stringify(cleanedData);
    console.log(`Taille des données sérialisées: ${serializedData.length} caractères`);
    
    // Si la taille dépasse 1 Mo, afficher un avertissement
    if (serializedData.length > 1000000) {
      console.warn("Attention: Les données sérialisées dépassent 1 Mo, ce qui pourrait causer des problèmes avec Firestore");
    }
  } catch (error) {
    console.error("Erreur lors de la sérialisation finale:", error);
  }
  
  console.log("Fin du nettoyage des données pour Firestore");
  return cleanedData;
} 