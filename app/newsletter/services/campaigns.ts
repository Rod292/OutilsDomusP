import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc, Timestamp, DocumentData } from 'firebase/firestore';

// Définition du type Campaign
export type Campaign = {
  id?: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'draft';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  stats?: {
    emailsSent: number;
    emailsDelivered: number;
    emailsFailed: number;
    lastSent?: Timestamp;
  };
};

// Collection Firestore pour les campagnes
const CAMPAIGNS_COLLECTION = 'campaigns';

/**
 * Crée une nouvelle campagne dans Firestore
 */
export const createCampaign = async (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): Promise<Campaign> => {
  try {
    const now = Timestamp.now();
    const campaignData = {
      ...campaign,
      createdAt: now,
      updatedAt: now,
      stats: {
        emailsSent: 0,
        emailsDelivered: 0,
        emailsFailed: 0
      }
    };

    const docRef = await addDoc(collection(db, CAMPAIGNS_COLLECTION), campaignData);
    return {
      id: docRef.id,
      ...campaignData
    };
  } catch (error) {
    console.error('Erreur lors de la création de la campagne:', error);
    throw error;
  }
};

/**
 * Récupère toutes les campagnes depuis Firestore
 */
export const getAllCampaigns = async (): Promise<Campaign[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CAMPAIGNS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Campaign));
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    throw error;
  }
};

/**
 * Récupère une campagne par son ID
 */
export const getCampaignById = async (id: string): Promise<Campaign | null> => {
  try {
    const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Campaign;
    }
    
    return null;
  } catch (error) {
    console.error(`Erreur lors de la récupération de la campagne ${id}:`, error);
    throw error;
  }
};

/**
 * Met à jour une campagne existante
 */
export const updateCampaign = async (id: string, data: Partial<Campaign>): Promise<void> => {
  try {
    const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la campagne ${id}:`, error);
    throw error;
  }
};

/**
 * Met à jour les statistiques d'une campagne après l'envoi d'emails
 */
export const updateCampaignStats = async (
  id: string, 
  stats: { success: number; failed: number }
): Promise<void> => {
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      throw new Error(`Campagne ${id} non trouvée`);
    }

    const currentStats = campaign.stats || {
      emailsSent: 0,
      emailsDelivered: 0,
      emailsFailed: 0
    };

    const updatedStats = {
      emailsSent: currentStats.emailsSent + stats.success + stats.failed,
      emailsDelivered: currentStats.emailsDelivered + stats.success,
      emailsFailed: currentStats.emailsFailed + stats.failed,
      lastSent: Timestamp.now()
    };

    await updateDoc(doc(db, CAMPAIGNS_COLLECTION, id), {
      stats: updatedStats,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour des statistiques de la campagne ${id}:`, error);
    throw error;
  }
};

/**
 * Supprime une campagne
 */
export const deleteCampaign = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, id));
  } catch (error) {
    console.error(`Erreur lors de la suppression de la campagne ${id}:`, error);
    throw error;
  }
}; 