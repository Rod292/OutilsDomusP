// Types pour les données d'analyse
export type EmailBounce = {
  email: string;
  reason: string;
  timestamp: string;
};

export type CampaignData = {
  id: string;
  name: string;
  sentDate: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounces: EmailBounce[];
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

export type CampaignWithAnalytics = CampaignData & {
  timeData?: TimeDataPoint[];
  consultantData?: ConsultantDataPoint[];
};

// Fonction simulée pour récupérer les données d'analyse
// Cette fonction sera remplacée par une vraie requête API plus tard
export const getCampaignAnalytics = async (): Promise<CampaignWithAnalytics[]> => {
  // Simulons un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500));

  return [
    {
      id: '1',
      name: 'Newsletter Avril 2023',
      sentDate: '2023-04-15T10:00:00Z',
      sent: 250,
      delivered: 235,
      opened: 180,
      clicked: 85,
      replied: 12,
      bounces: [
        { email: 'john.doe@example.com', reason: 'Boîte pleine', timestamp: '2023-04-15T10:01:30Z' },
        { email: 'invalid@notexist.com', reason: 'Adresse invalide', timestamp: '2023-04-15T10:01:45Z' },
      ],
      timeData: [
        { hour: '10:00', opens: 12, clicks: 3 },
        { hour: '11:00', opens: 45, clicks: 15 },
        { hour: '12:00', opens: 68, clicks: 27 },
        { hour: '13:00', opens: 32, clicks: 18 },
        { hour: '14:00', opens: 23, clicks: 12 },
      ],
      consultantData: [
        { name: 'Jean Dupont', opens: 65, clicks: 28 },
        { name: 'Marie Martin', opens: 82, clicks: 35 },
        { name: 'Pierre Durand', opens: 33, clicks: 22 },
      ],
    },
    {
      id: '2',
      name: 'Newsletter Mai 2023',
      sentDate: '2023-05-15T10:00:00Z',
      sent: 275,
      delivered: 268,
      opened: 210,
      clicked: 95,
      replied: 15,
      bounces: [
        { email: 'jane.smith@example.com', reason: 'Serveur indisponible', timestamp: '2023-05-15T10:02:10Z' },
      ],
      timeData: [
        { hour: '10:00', opens: 18, clicks: 5 },
        { hour: '11:00', opens: 52, clicks: 22 },
        { hour: '12:00', opens: 75, clicks: 30 },
        { hour: '13:00', opens: 38, clicks: 19 },
        { hour: '14:00', opens: 27, clicks: 19 },
      ],
      consultantData: [
        { name: 'Jean Dupont', opens: 75, clicks: 32 },
        { name: 'Marie Martin', opens: 95, clicks: 41 },
        { name: 'Pierre Durand', opens: 40, clicks: 22 },
      ],
    },
    {
      id: '3',
      name: 'Newsletter Juin 2023',
      sentDate: '2023-06-15T10:00:00Z',
      sent: 300,
      delivered: 295,
      opened: 230,
      clicked: 120,
      replied: 18,
      bounces: [],
      timeData: [
        { hour: '10:00', opens: 22, clicks: 8 },
        { hour: '11:00', opens: 65, clicks: 28 },
        { hour: '12:00', opens: 85, clicks: 42 },
        { hour: '13:00', opens: 35, clicks: 25 },
        { hour: '14:00', opens: 23, clicks: 17 },
      ],
      consultantData: [
        { name: 'Jean Dupont', opens: 85, clicks: 38 },
        { name: 'Marie Martin', opens: 102, clicks: 52 },
        { name: 'Pierre Durand', opens: 43, clicks: 30 },
      ],
    },
  ];
};

// Fonction pour télécharger les données au format CSV
export const exportCampaignDataToCsv = (campaign: CampaignData): string => {
  // Créer l'en-tête CSV
  let csv = 'Métrique,Valeur\n';
  
  // Ajouter les données de base
  csv += `Nom,${campaign.name}\n`;
  csv += `Date d'envoi,${new Date(campaign.sentDate).toLocaleString()}\n`;
  csv += `Emails envoyés,${campaign.sent}\n`;
  csv += `Emails délivrés,${campaign.delivered}\n`;
  csv += `Emails ouverts,${campaign.opened}\n`;
  csv += `Liens cliqués,${campaign.clicked}\n`;
  csv += `Réponses reçues,${campaign.replied}\n`;
  csv += `Taux de délivrabilité,${((campaign.delivered / campaign.sent) * 100).toFixed(1)}%\n`;
  csv += `Taux d'ouverture,${((campaign.opened / campaign.delivered) * 100).toFixed(1)}%\n`;
  csv += `Taux de clic,${((campaign.clicked / campaign.delivered) * 100).toFixed(1)}%\n`;
  csv += `Taux de réponse,${((campaign.replied / campaign.delivered) * 100).toFixed(1)}%\n`;
  
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