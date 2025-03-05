import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from './firebase-config';
import { v4 as uuidv4 } from 'uuid';

// Obtenir une référence au service de stockage
const storage = getStorage(firebaseApp);

/**
 * Télécharge une image vers Firebase Storage et retourne l'URL de téléchargement
 * @param file Fichier à télécharger
 * @param folderPath Chemin du dossier dans Firebase Storage
 * @returns URL de téléchargement de l'image
 */
export const uploadImageToStorage = async (file: File, folderPath: string = 'images'): Promise<string> => {
  try {
    // Créer un nom de fichier unique
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const fullPath = `${folderPath}/${fileName}`;
    
    // Créer une référence au fichier dans Firebase Storage
    const storageRef = ref(storage, fullPath);
    
    // Télécharger le fichier
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Image téléchargée avec succès:', snapshot);
    
    // Obtenir l'URL de téléchargement
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('URL de téléchargement:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    throw error;
  }
};

/**
 * Génère une URL de téléchargement pour une image existante dans Firebase Storage
 * @param path Chemin de l'image dans Firebase Storage
 * @returns URL de téléchargement de l'image
 */
export const getImageUrl = async (path: string): Promise<string> => {
  try {
    const imageRef = ref(storage, path);
    const url = await getDownloadURL(imageRef);
    return url;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL de l\'image:', error);
    throw error;
  }
}; 