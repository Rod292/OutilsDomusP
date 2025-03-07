import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Campaign } from './campaigns';

// Types pour les données d'analyse
export type EmailBounce = {
  email: string;
  reason: string;
  timestamp: string;
};

export type EmailOpen = {
  email: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
};

export type EmailClick = {
  email: string;
  timestamp: string;
  url: string;
  userAgent?: string;
  ip?: string;
};

export type TimeDataPoint = {
  hour: string;
  opens: number;
  clicks: number;
};

export type ConsultantDataPoint = {
  name: string;
  opens: number;
  clicks: number;
};

export type EmailDelivery = {
  email: string;
  timestamp: string;
  status: 'delivered' | 'failed';
  reason?: string;
};

export type CampaignWithAnalytics = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'draft';
  sentDate?: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounces: EmailBounce[];
  opens?: EmailOpen[];
  clicks?: EmailClick[];
  timeData?: TimeDataPoint[];
  consultantData?: ConsultantDataPoint[];
  createdAt?: string;
  updatedAt?: string;
  deliveries?: EmailDelivery[];
};

// Fonction pour récupérer les données d'analyse des campagnes depuis Firestore
export const getCampaignAnalytics = async (): Promise<CampaignWithAnalytics[]> => {
  try {
    const campaignsSnapshot = await getDocs(collection(db, 'campaigns'));
    
    if (campaignsSnapshot.empty) {
      console.log('Aucune campagne trouvée dans Firestore');
      return [];
    }

    const campaigns: CampaignWithAnalytics[] = [];

    for (const docSnapshot of campaignsSnapshot.docs) {
      const data = docSnapshot.data() as Campaign;
      const stats = data.stats || { emailsSent: 0, emailsDelivered: 0, emailsFailed: 0 };
      
      // Convertir les timestamps en chaînes de caractères
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString() 
        : undefined;
      
      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate().toISOString() 
        : undefined;
      
      const lastSent = stats.lastSent instanceof Timestamp 
        ? stats.lastSent.toDate().toISOString() 
        : undefined;

      // Récupérer les données de tracking si elles existent
      const trackingRef = doc(db, 'campaign_tracking', docSnapshot.id);
      const trackingDoc = await getDoc(trackingRef);
      const trackingData = trackingDoc.exists() ? trackingDoc.data() : null;

      // Utiliser les données réelles de tracking si disponibles, sinon mettre à zéro
      const opens = trackingData?.opens || [];
      const clicks = trackingData?.clicks || [];

      campaigns.push({
        id: docSnapshot.id,
        name: data.name,
        description: data.description,
        status: data.status,
        sentDate: lastSent,
        sent: stats.emailsSent || 0,
        delivered: stats.emailsDelivered || 0,
        opened: opens.length,
        clicked: clicks.length,
        replied: 0, // Pour l'instant, nous ne suivons pas les réponses
        bounces: stats.emailsFailed ? [
          { 
            email: 'exemple@domaine.com', 
            reason: 'Adresse invalide', 
            timestamp: lastSent || new Date().toISOString() 
          }
        ] : [],
        opens,
        clicks,
        timeData: trackingData?.timeData || [],
        consultantData: trackingData?.consultantData || [],
        createdAt,
        updatedAt
      });
    }

    return campaigns;
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    return [];
  }
};

// Fonction pour enregistrer une ouverture d'email
export const trackEmailOpen = async (
  campaignId: string, 
  email: string, 
  userAgent?: string,
  ip?: string
): Promise<void> => {
  try {
    const trackingRef = doc(db, 'campaign_tracking', campaignId);
    const trackingDoc = await getDoc(trackingRef);
    
    const now = new Date();
    const openData: EmailOpen = {
      email,
      timestamp: now.toISOString(),
      userAgent,
      ip
    };

    if (trackingDoc.exists()) {
      // Mettre à jour le document existant
      const data = trackingDoc.data();
      const opens = data.opens || [];
      
      // Ajouter la nouvelle ouverture
      opens.push(openData);
      
      // Mettre à jour les données temporelles
      const hour = `${now.getHours()}:00`;
      const timeData = data.timeData || [];
      const timePoint = timeData.find((p: TimeDataPoint) => p.hour === hour);
      
      if (timePoint) {
        timePoint.opens += 1;
      } else {
        timeData.push({
          hour,
          opens: 1,
          clicks: 0
        });
      }
      
      await updateDoc(trackingRef, {
        opens,
        timeData,
        lastUpdated: Timestamp.now()
      });
    } else {
      // Créer un nouveau document de tracking
      const timeData = [{
        hour: `${now.getHours()}:00`,
        opens: 1,
        clicks: 0
      }];
      
      await updateDoc(trackingRef, {
        opens: [openData],
        clicks: [],
        timeData,
        lastUpdated: Timestamp.now()
      });
    }
  } catch (error) {
    console.error(`Erreur lors du tracking d'ouverture d'email pour la campagne ${campaignId}:`, error);
  }
};

// Fonction pour enregistrer un clic sur un lien dans un email
export const trackEmailClick = async (
  campaignId: string, 
  email: string, 
  url: string,
  userAgent?: string,
  ip?: string
): Promise<void> => {
  try {
    const trackingRef = doc(db, 'campaign_tracking', campaignId);
    const trackingDoc = await getDoc(trackingRef);
    
    const now = new Date();
    const clickData: EmailClick = {
      email,
      timestamp: now.toISOString(),
      url,
      userAgent,
      ip
    };

    if (trackingDoc.exists()) {
      // Mettre à jour le document existant
      const data = trackingDoc.data();
      const clicks = data.clicks || [];
      
      // Ajouter le nouveau clic
      clicks.push(clickData);
      
      // Mettre à jour les données temporelles
      const hour = `${now.getHours()}:00`;
      const timeData = data.timeData || [];
      const timePoint = timeData.find((p: TimeDataPoint) => p.hour === hour);
      
      if (timePoint) {
        timePoint.clicks += 1;
      } else {
        timeData.push({
          hour,
          opens: 0,
          clicks: 1
        });
      }
      
      await updateDoc(trackingRef, {
        clicks,
        timeData,
        lastUpdated: Timestamp.now()
      });
    } else {
      // Créer un nouveau document de tracking
      const timeData = [{
        hour: `${now.getHours()}:00`,
        opens: 0,
        clicks: 1
      }];
      
      await updateDoc(trackingRef, {
        opens: [],
        clicks: [clickData],
        timeData,
        lastUpdated: Timestamp.now()
      });
    }
  } catch (error) {
    console.error(`Erreur lors du tracking de clic pour la campagne ${campaignId}:`, error);
  }
};

// Fonction pour exporter les données d'une campagne au format CSV
export const exportCampaignDataToCsv = (campaign: CampaignWithAnalytics, type: 'delivered' | 'failed' | 'all' = 'all'): string => {
  if (!campaign) return '';
  
  let csv = 'Email,Date,Statut,Raison\n';
  
  // Ajouter les emails délivrés si demandé
  if (type === 'all' || type === 'delivered') {
    if (campaign.deliveries && campaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length > 0) {
      campaign.deliveries
        .filter((d: EmailDelivery) => d.status === 'delivered')
        .forEach((delivery: EmailDelivery) => {
          csv += `${delivery.email},${new Date(delivery.timestamp).toLocaleString()},"Délivré",\n`;
        });
    }
  }
  
  // Ajouter les emails non délivrés si demandé
  if (type === 'all' || type === 'failed') {
    if (campaign.deliveries && campaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length > 0) {
      campaign.deliveries
        .filter((d: EmailDelivery) => d.status === 'failed')
        .forEach((delivery: EmailDelivery) => {
          csv += `${delivery.email},${new Date(delivery.timestamp).toLocaleString()},"Non délivré","${delivery.reason || 'Erreur inconnue'}"\n`;
        });
    }
  }
  
  return csv;
};

// Fonction pour vérifier si un email a déjà été contacté pour une campagne spécifique
export const checkEmailAlreadyContacted = async (
  campaignId: string,
  email: string
): Promise<boolean> => {
  try {
    // Vérifier si la campagne existe
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignDoc = await getDoc(campaignRef);
    
    if (!campaignDoc.exists()) {
      console.error(`La campagne ${campaignId} n'existe pas`);
      return false;
    }
    
    // Vérifier si l'email est dans la liste des destinataires contactés
    const trackingRef = doc(db, 'campaign_tracking', campaignId);
    const trackingDoc = await getDoc(trackingRef);
    
    if (!trackingDoc.exists()) {
      console.log(`Aucun tracking trouvé pour la campagne ${campaignId}`);
      return false;
    }
    
    const trackingData = trackingDoc.data();
    const contactedEmails = trackingData.contactedEmails || [];
    
    return contactedEmails.includes(email);
  } catch (error) {
    console.error('Erreur lors de la vérification des emails contactés:', error);
    return false;
  }
};

// Fonction pour ajouter un email à la liste des destinataires contactés
export const addEmailToContactedList = async (
  campaignId: string,
  email: string
): Promise<void> => {
  try {
    const trackingRef = doc(db, 'campaign_tracking', campaignId);
    const trackingDoc = await getDoc(trackingRef);
    
    if (trackingDoc.exists()) {
      const trackingData = trackingDoc.data();
      const contactedEmails = trackingData.contactedEmails || [];
      
      // Vérifier si l'email est déjà dans la liste
      if (!contactedEmails.includes(email)) {
        // Ajouter l'email à la liste
        await updateDoc(trackingRef, {
          contactedEmails: [...contactedEmails, email]
        });
      }
    } else {
      // Créer un nouveau document de tracking
      await updateDoc(trackingRef, {
        contactedEmails: [email]
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'email à la liste des contactés:', error);
  }
}; 