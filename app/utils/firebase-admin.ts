import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Fonction pour initialiser Firebase Admin si ce n'est pas déjà fait
export function initializeFirebaseAdmin() {
  const apps = getApps();
  
  if (!apps.length) {
    try {
      // Afficher les variables d'environnement pour le débogage
      console.log('Vérification des variables Firebase Admin:');
      console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Défini' : 'Non défini');
      console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Défini' : 'Non défini');
      console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Défini (longueur: ' + process.env.FIREBASE_PRIVATE_KEY?.length + ')' : 'Non défini');
      console.log('FIREBASE_STORAGE_BUCKET:', process.env.FIREBASE_STORAGE_BUCKET ? 'Défini' : 'Non défini');
      
      // Vérifier si les variables d'environnement sont définies
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        console.error('Variables d\'environnement Firebase manquantes');
        
        // Utiliser les valeurs du fichier .env.local directement si nécessaire
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'etat-des-lieux-arthur-loyd';
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@etat-des-lieux-arthur-loyd.iam.gserviceaccount.com';
        const privateKey = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDONd7cHUEcEe8Y\npetsbLVFe2PLir3g2u9SU9tqWMJOP+IIXYY3GxBvuKOks0pKzyW8EzD9nHC3tdTb\nuwf7wxEIEUCrUCEUbhPSGidx5Pi1RoxngnxeCKHACNGKZY1SG1LOnwjC5GXuUpR5\n1rdyx0+iwNz+nb8KXMiv4PRiC7Xb7twLleCaP+famc/QfwUkuvigkN6AHo9uzSoN\n7YQc510yOsNVFzgKJDAahFbpl37u95fLQWIOIblFdXDRxvs/S9nFRVlQGxCtXioY\nzhm4FILgDXJGpJC8lVHWzNR4CQxPy/EEewQrGBiW2oND9URc00qTNgmxeeFBlavF\nYatpVdGnAgMBAAECggEAKQR2K/p1tQusL47xYUPOWt/MXfRfCJcD+7BKeMDnBYGX\niGpyBAwSHObxRhWTtYW2z85RdGDl2uUETiDJ2b5XaO9lma36poGu15/0MKeHASfj\nTcOa0WmOIxCd/ZVtouNkeU0RBRNBY0Jx3jpjiyUyJgGO8+aU1Y7XLITml4oUxoZF\nF3t7il0PkoGVfZw3IdK/JulZlwxiexbSkqWfBrSPdhK5sCm/8gRqNdkXpLdMNXuE\nsaW4MpTRqOBzr5reHXZP1JLEyNfaBiKOT3lHeNscblZ2DS5EcpLYtd5buh24neTP\nTSZY6cEyYMxhhksA/winosrV9VRtPMB6qgPJ5qcYoQKBgQDzihNBQewQBK4lVY2D\n/t+Lrrdyafrb7twLleCaP+famc/QfwUkuvigkN6AHo9uzSoN\n7YQc510yOsNVFzgKJDAahFbpl37u95fLQWIOIblFdXDRxvs/S9nFRVlQGxCtXioY\nzhm4FILgDXJGpJC8lVHWzNR4CQxPy/EEewQrGBiW2oND9URc00qTNgmxeeFBlavF\nYatpVdGn\n-----END PRIVATE KEY-----\n';
        const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'etat-des-lieux-arthur-loyd.appspot.com';
        
        console.log('Utilisation des valeurs de secours pour Firebase Admin');
        
        // Initialiser l'application Firebase Admin avec les valeurs de secours
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
          storageBucket
        });
        
        console.log('Firebase Admin initialisé avec des valeurs de secours');
        return;
      }

      // Initialiser l'application Firebase Admin
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // La clé privée est stockée avec des \n échappés, nous devons les remplacer
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'etat-des-lieux-arthur-loyd.appspot.com'
      });
      
      console.log('Firebase Admin initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firebase Admin:', error);
    }
  }
} 