import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { Campaign } from './campaigns';

// Types pour les données d'analyse
export type EmailBounce = {
  email: string;
  reason: string;
  timestamp: string;
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

    const campaigns: CampaignWithAnalytics[] = campaignsSnapshot.docs.map(doc => {
      const data = doc.data() as Campaign;
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

      // Pour l'instant, nous n'avons pas de données détaillées sur les ouvertures et les clics
      // Nous allons donc utiliser des données simulées basées sur les statistiques réelles
      const delivered = stats.emailsDelivered || 0;
      const opened = Math.round(delivered * 0.75); // Estimation: 75% des emails délivrés sont ouverts
      const clicked = Math.round(opened * 0.45);   // Estimation: 45% des emails ouverts sont cliqués
      const replied = Math.round(clicked * 0.15);  // Estimation: 15% des emails cliqués reçoivent une réponse

      // Générer des données temporelles simulées basées sur les statistiques réelles
      const timeData = generateTimeData(opened, clicked);
      
      // Générer des données de consultant simulées
      const consultantData = generateConsultantData(opened, clicked);

      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        status: data.status,
        sentDate: lastSent,
        sent: stats.emailsSent || 0,
        delivered: stats.emailsDelivered || 0,
        opened: opened,
        clicked: clicked,
        replied: replied,
        bounces: stats.emailsFailed ? [
          { 
            email: 'exemple@domaine.com', 
            reason: 'Adresse invalide', 
            timestamp: lastSent || new Date().toISOString() 
          }
        ] : [],
        timeData,
        consultantData,
        createdAt,
        updatedAt
      };
    });

    return campaigns;
  } catch (error) {
    console.error('Erreur lors de la récupération des campagnes:', error);
    return [];
  }
};

// Fonction pour générer des données temporelles simulées
const generateTimeData = (opens: number, clicks: number): TimeDataPoint[] => {
  const hours = ['10:00', '11:00', '12:00', '13:00', '14:00'];
  const distribution = [0.15, 0.30, 0.35, 0.15, 0.05]; // Distribution des ouvertures/clics par heure
  
  return hours.map((hour, index) => ({
    hour,
    opens: Math.round(opens * distribution[index]),
    clicks: Math.round(clicks * distribution[index])
  }));
};

// Fonction pour générer des données de consultant simulées
const generateConsultantData = (opens: number, clicks: number): ConsultantDataPoint[] => {
  const consultants = ['Jean Dupont', 'Marie Martin', 'Pierre Durand'];
  const distribution = [0.35, 0.45, 0.20]; // Distribution des ouvertures/clics par consultant
  
  return consultants.map((name, index) => ({
    name,
    opens: Math.round(opens * distribution[index]),
    clicks: Math.round(clicks * distribution[index])
  }));
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
  
  return csv;
}; 