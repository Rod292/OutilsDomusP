import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, getDoc, updateDoc, deleteField, serverTimestamp, collection, query, where, getDocs, Timestamp, QuerySnapshot, DocumentData, deleteDoc, orderBy } from 'firebase/firestore';

// Collection Firestore pour stocker les utilisateurs actifs
const ACTIVE_USERS_COLLECTION = 'activeUsers';

// Durée maximale d'inactivité avant de considérer un utilisateur comme déconnecté (en minutes)
const INACTIVITY_THRESHOLD_MINUTES = 5;

// Interface pour définir un utilisateur actif
export interface ActiveUser {
  email: string;
  name: string;
  lastActive: Timestamp | Date;
}

/**
 * Met à jour le statut d'activité d'un utilisateur
 */
export const updateUserActivity = async (email: string, name: string): Promise<void> => {
  try {
    if (!db) {
      console.error("Firebase n'est pas initialisé pour updateUserActivity");
      return;
    }
    
    console.log(`Mise à jour de l'activité pour ${name} (${email})`);
    
    const userRef = doc(db, ACTIVE_USERS_COLLECTION, email);
    await setDoc(userRef, {
      email,
      name,
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'activité utilisateur:', error);
  }
};

/**
 * Supprime l'utilisateur de la liste des utilisateurs actifs
 */
export const removeUserActivity = async (email: string): Promise<void> => {
  try {
    if (!db) {
      console.error("Firebase n'est pas initialisé pour removeUserActivity");
      return;
    }
    
    console.log(`Suppression de l'utilisateur actif: ${email}`);
    
    const userRef = doc(db, ACTIVE_USERS_COLLECTION, email);
    await deleteDoc(userRef);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'activité utilisateur:', error);
  }
};

/**
 * Nettoie les utilisateurs inactifs de la collection
 */
export const cleanupInactiveUsers = async (): Promise<void> => {
  try {
    if (!db) {
      console.error("Firebase n'est pas initialisé pour cleanupInactiveUsers");
      return;
    }
    
    console.log("Nettoyage des utilisateurs inactifs...");
    
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - INACTIVITY_THRESHOLD_MINUTES * 60 * 1000);
    
    const activeUsersRef = collection(db, ACTIVE_USERS_COLLECTION);
    const activeUsersQuery = query(activeUsersRef);
    const snapshot = await getDocs(activeUsersQuery);
    
    const deletePromises: Promise<void>[] = [];
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      const lastActive = userData.lastActive?.toDate();
      
      if (lastActive && lastActive < thresholdDate) {
        console.log(`Suppression de l'utilisateur inactif: ${userData.name} (${userData.email})`);
        deletePromises.push(deleteDoc(doc.ref));
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`${deletePromises.length} utilisateurs inactifs supprimés`);
  } catch (error) {
    console.error('Erreur lors du nettoyage des utilisateurs inactifs:', error);
  }
};

/**
 * Filtre et trie les utilisateurs actifs à partir d'un snapshot Firestore
 */
export const filterActiveUsers = (snapshot: QuerySnapshot<DocumentData>): ActiveUser[] => {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - INACTIVITY_THRESHOLD_MINUTES * 60 * 1000);
  
  const activeUsers: ActiveUser[] = [];
  
  snapshot.forEach((doc) => {
    const userData = doc.data();
    
    if (userData.lastActive) {
      const lastActive = userData.lastActive.toDate();
      
      if (lastActive >= thresholdDate) {
        activeUsers.push({
          email: userData.email,
          name: userData.name,
          lastActive
        });
      } else {
        console.log(`Utilisateur ignoré car inactif: ${userData.name} (${userData.email})`);
      }
    }
  });
  
  // Trier les utilisateurs par nom
  return activeUsers.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * S'abonne aux mises à jour des utilisateurs actifs
 */
export const subscribeToActiveUsers = (callback: (users: ActiveUser[]) => void): () => void => {
  try {
    if (!db) {
      console.error("Firebase n'est pas initialisé pour subscribeToActiveUsers");
      callback([]);
      return () => {};
    }
    
    console.log("Mise en place de l'abonnement aux utilisateurs actifs dans Firestore");
    
    // Nettoyer les utilisateurs inactifs au démarrage
    cleanupInactiveUsers();
    
    // Configurer un nettoyage périodique
    const cleanupInterval = setInterval(() => {
      cleanupInactiveUsers();
    }, INACTIVITY_THRESHOLD_MINUTES * 30 * 1000); // Nettoyage toutes les 2.5 minutes
    
    // S'abonner aux changements de la collection
    const activeUsersRef = collection(db, ACTIVE_USERS_COLLECTION);
    const activeUsersQuery = query(activeUsersRef, orderBy('name'));
    
    const unsubscribe = onSnapshot(activeUsersQuery, (snapshot) => {
      console.log(`Réception de ${snapshot.size} utilisateurs actifs de Firestore`);
      const activeUsers = filterActiveUsers(snapshot);
      console.log("Utilisateurs actifs filtrés:", activeUsers.map(u => `${u.name} (${u.email})`));
      callback(activeUsers);
    }, (error) => {
      console.error('Erreur dans l\'abonnement aux utilisateurs actifs:', error);
      callback([]);
    });
    
    // Retourner une fonction pour se désabonner et arrêter le nettoyage
    return () => {
      console.log("Désabonnement des utilisateurs actifs");
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  } catch (error) {
    console.error('Erreur lors de l\'abonnement aux utilisateurs actifs:', error);
    return () => {};
  }
}; 