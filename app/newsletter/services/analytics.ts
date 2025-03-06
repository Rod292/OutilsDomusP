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

// Fonction pour télécharger les données au format CSV
export const exportCampaignDataToCsv = (campaign: CampaignWithAnalytics): string => {
  // Créer l'en-tête CSV
  let csv = 'Métrique,Valeur\n';
  
  // Ajouter les données de base
  csv += `Nom,${campaign.name}\n`;
  csv += `Description,${campaign.description || 'Non spécifiée'}\n`;
  csv += `Statut,${campaign.status}\n`;
  
  if (campaign.sentDate) {
    csv += `Date d'envoi,${new Date(campaign.sentDate).toLocaleString()}\n`;
  }
  
  csv += `Emails envoyés,${campaign.sent}\n`;
  csv += `Emails délivrés,${campaign.delivered}\n`;
  csv += `Emails ouverts,${campaign.opened}\n`;
  csv += `Liens cliqués,${campaign.clicked}\n`;
  csv += `Réponses reçues,${campaign.replied}\n`;
  
  if (campaign.sent > 0) {
    csv += `Taux de délivrabilité,${((campaign.delivered / campaign.sent) * 100).toFixed(1)}%\n`;
  }
  
  if (campaign.delivered > 0) {
    csv += `Taux d'ouverture,${((campaign.opened / campaign.delivered) * 100).toFixed(1)}%\n`;
    csv += `Taux de clic,${((campaign.clicked / campaign.delivered) * 100).toFixed(1)}%\n`;
    csv += `Taux de réponse,${((campaign.replied / campaign.delivered) * 100).toFixed(1)}%\n`;
  }
  
  // Ajouter une ligne vide pour séparer les sections
  csv += '\n';
  
  // Ajouter les informations sur les emails non délivrés
  csv += 'Emails non délivrés\n';
  csv += 'Email,Raison,Date\n';
  
  if (campaign.bounces.length === 0) {
    csv += 'Tous les emails ont été délivrés avec succès\n';
  } else {
    campaign.bounces.forEach(bounce => {
      csv += `${bounce.email},${bounce.reason},${new Date(bounce.timestamp).toLocaleString()}\n`;
    });
  }

  // Ajouter les informations sur les ouvertures d'emails si disponibles
  if (campaign.opens && campaign.opens.length > 0) {
    csv += '\nOuvertures d\'emails\n';
    csv += 'Email,Date,User Agent\n';
    
    campaign.opens.forEach(open => {
      csv += `${open.email},${new Date(open.timestamp).toLocaleString()},${open.userAgent || 'Non disponible'}\n`;
    });
  }

  // Ajouter les informations sur les clics si disponibles
  if (campaign.clicks && campaign.clicks.length > 0) {
    csv += '\nClics sur les liens\n';
    csv += 'Email,Date,URL,User Agent\n';
    
    campaign.clicks.forEach(click => {
      csv += `${click.email},${new Date(click.timestamp).toLocaleString()},${click.url},${click.userAgent || 'Non disponible'}\n`;
    });
  }
  
  return csv;
}; 