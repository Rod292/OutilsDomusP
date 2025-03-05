/**
 * Utilitaires pour faciliter l'upload de photos vers Firebase Storage
 * Avec gestion des erreurs, retries et contournements des problèmes CORS
 */

import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, StorageReference } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';

/**
 * Options pour l'upload de photos
 */
interface UploadOptions {
  maxRetries?: number;        // Nombre maximal de tentatives d'upload
  retryDelay?: number;        // Délai entre les tentatives (en ms)
  timeout?: number;           // Timeout pour l'upload (en ms)
  chunkSize?: number;         // Taille des morceaux pour les gros fichiers (non implémenté)
}

/**
 * Résultat d'un upload
 */
interface UploadResult {
  success: boolean;           // Si l'upload a réussi
  downloadUrl?: string;       // URL de téléchargement (si succès)
  error?: Error;              // Erreur rencontrée (si échec)
  retries?: number;           // Nombre de tentatives effectuées
  path?: string;              // Chemin de stockage du fichier
  metadata?: any;             // Métadonnées du fichier uploadé
}

/**
 * Télécharge une image en base64 vers Firebase Storage avec mécanisme de retry
 * 
 * @param imageData Données de l'image en base64
 * @param path Chemin dans Firebase Storage
 * @param options Options d'upload
 * @returns Promesse avec le résultat de l'upload
 */
export async function uploadBase64Image(
  imageData: string,
  path: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
  } = options;

  let retries = 0;
  let lastError: Error | null = null;

  while (retries < maxRetries) {
    try {
      if (retries > 0) {
        console.log(`Tentative d'upload ${retries + 1}/${maxRetries} pour ${path}`);
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
      }

      // Vérifier que l'image est bien en base64
      if (!imageData.startsWith('data:')) {
        throw new Error('Format d\'image invalide: l\'image doit être au format base64 data URL');
      }

      // Créer une référence dans Firebase Storage
      const imageRef = ref(storage, path);
      console.log(`Référence Storage créée: ${imageRef.fullPath}`);

      // Créer une promesse avec timeout
      const uploadPromise = async () => {
        const uploadResult = await uploadString(imageRef, imageData, 'data_url');
        console.log(`Image téléchargée avec succès:`, {
          ref: uploadResult.ref.fullPath
        });
        
        // Obtenir l'URL de téléchargement
        const downloadUrl = await getDownloadURL(imageRef);
        console.log(`URL de téléchargement obtenue: ${downloadUrl.substring(0, 30)}...`);
        
        return {
          success: true,
          downloadUrl,
          path: imageRef.fullPath,
        };
      };

      // Créer un timeout
      const timeoutPromise = new Promise<UploadResult>((_, reject) => {
        setTimeout(() => reject(new Error(`Upload timeout après ${timeout}ms`)), timeout);
      });

      // Exécuter la promesse avec timeout
      const result = await Promise.race([uploadPromise(), timeoutPromise]);
      return {
        ...result,
        retries,
      };
    } catch (error) {
      retries++;
      lastError = error instanceof Error ? error : new Error('Erreur inconnue');
      
      console.error(`Erreur lors de l'upload (tentative ${retries}):`, error);
      
      // Détecter les erreurs CORS spécifiques
      if (error instanceof FirebaseError) {
        if (error.code === 'storage/unauthorized') {
          console.error("ERREUR D'AUTORISATION: Vérifiez les règles de sécurité de Firebase Storage");
          break; // Ne pas réessayer pour les erreurs d'autorisation
        }
        
        if (error.message && error.message.toLowerCase().includes('cors')) {
          console.error("ERREUR CORS DÉTECTÉE: Le bucket Firebase Storage n'est pas configuré correctement");
          console.error("Suivez les instructions dans le fichier cors-setup-instructions.md");
        }
      }
      
      // Si c'est la dernière tentative, arrêter les essais
      if (retries >= maxRetries) {
        break;
      }
    }
  }

  // Si toutes les tentatives ont échoué
  return {
    success: false,
    error: lastError || new Error(`Échec de l'upload après ${maxRetries} tentatives`),
    retries,
  };
}

/**
 * Format sécurisé des métadonnées de photo pour Firestore
 * (indépendant du résultat de l'upload - peut contenir une erreur)
 */
export function createPhotoMetadata(
  photoData: string,
  uploadResult: UploadResult,
  additionalMetadata: Record<string, any> = {}
): Record<string, any> {
  const timestamp = Date.now();
  const signature = photoData.substring(0, 50) + photoData.length;
  
  // Base des métadonnées communes
  const metadata = {
    type: 'base64_metadata',
    signature,
    timestamp,
    ...additionalMetadata,
    source: photoData.substring(0, 20) + '...',  // Juste un aperçu très court
  };
  
  // Ajouter les informations de succès ou d'échec
  if (uploadResult.success && uploadResult.downloadUrl) {
    return {
      ...metadata,
      downloadUrl: uploadResult.downloadUrl,
      path: uploadResult.path,
    };
  } else {
    return {
      ...metadata,
      error: 'Erreur de stockage',
      errorDetail: uploadResult.error?.message || 'Erreur inconnue',
    };
  }
} 