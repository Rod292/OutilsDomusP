'use client';

import React, { useState, useEffect } from 'react';
import { 
  CampaignWithAnalytics, 
  getCampaignAnalytics,
  exportCampaignDataToCsv
} from '../services/analytics';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Types pour les données de campagne
type EmailBounce = {
  email: string;
  reason: string;
  timestamp: string;
};

type EmailDelivery = {
  email: string;
  timestamp: string;
  status: 'delivered' | 'failed' | 'pending';
  reason?: string;
  pendingReason?: string;
};

type CampaignData = {
  id: string;
  name: string;
  sentDate: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounces: EmailBounce[];
  deliveries?: EmailDelivery[];
};

export default function NewsletterDashboard() {
  const [campaigns, setCampaigns] = useState<CampaignWithAnalytics[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentCampaign, setCurrentCampaign] = useState<CampaignWithAnalytics | null>(null);

  // Ajout des états pour la pagination
  const [deliveredPage, setDeliveredPage] = useState<number>(1);
  const [failedPage, setFailedPage] = useState<number>(1);
  const [pendingPage, setPendingPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const data = await getCampaignAnalytics();
        console.log('Campagnes chargées:', data);
        setCampaigns(data);
        if (data.length > 0) {
          setSelectedCampaign(data[0].id);
          setCurrentCampaign(data[0]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  // Effet pour charger les emails lorsque la campagne sélectionnée change
  useEffect(() => {
    if (selectedCampaign) {
      loadAllEmails(selectedCampaign);
    }
  }, [selectedCampaign]);

  // Fonction pour charger tous les types d'emails pour une campagne
  const loadAllEmails = async (campaignId: string) => {
    try {
      console.log('Chargement des emails pour la campagne:', campaignId);
      
      // Charger les emails délivrés
      const deliveredResponse = await fetch('/api/get-delivered-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
        cache: 'no-store',
      });
      
      // Charger les emails en attente
      const pendingResponse = await fetch('/api/get-pending-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
        cache: 'no-store',
      });
      
      // Charger les emails non délivrés
      const failedResponse = await fetch('/api/get-failed-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
        cache: 'no-store',
      });
      
      if (!deliveredResponse.ok || !pendingResponse.ok || !failedResponse.ok) {
        throw new Error(`Erreur HTTP lors du chargement des emails`);
      }
      
      const deliveredData = await deliveredResponse.json();
      const pendingData = await pendingResponse.json();
      const failedData = await failedResponse.json();
      
      console.log('Emails délivrés récupérés:', deliveredData.deliveredEmails.length);
      console.log('Emails en attente récupérés:', pendingData.pendingEmails.length);
      console.log('Emails non délivrés récupérés:', failedData.failedEmails.length);
      
      // Combiner tous les emails
      const allDeliveries = [
        ...deliveredData.deliveredEmails,
        ...pendingData.pendingEmails,
        ...failedData.failedEmails
      ];
      
      // Mettre à jour la campagne actuelle avec tous les emails
      if (currentCampaign) {
        setCurrentCampaign({
          ...currentCampaign,
          deliveries: allDeliveries,
          delivered: deliveredData.deliveredEmails.length
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des emails:', error);
    }
  };

  // Lorsqu'une campagne est sélectionnée
  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    const selected = campaigns.find(c => c.id === campaignId);
    if (selected) {
      setCurrentCampaign(selected);
    }
  };

  // Fonction pour paginer les données
  const paginateData = (data: any[], page: number, itemsPerPage: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-center text-gray-600">Aucune campagne disponible. Veuillez créer une campagne dans l'éditeur de newsletter.</p>
      </div>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-center text-gray-600">Veuillez sélectionner une campagne</p>
      </div>
    );
  }

  // Calcul des taux
  const deliveryRate = currentCampaign.sent > 0 
    ? ((currentCampaign.delivered / currentCampaign.sent) * 100).toFixed(1) 
    : '0.0';
  const openRate = currentCampaign.delivered > 0 
    ? ((currentCampaign.opened / currentCampaign.delivered) * 100).toFixed(1) 
    : '0.0';
  const clickRate = currentCampaign.delivered > 0 
    ? ((currentCampaign.clicked / currentCampaign.delivered) * 100).toFixed(1) 
    : '0.0';
  const replyRate = currentCampaign.delivered > 0 
    ? ((currentCampaign.replied / currentCampaign.delivered) * 100).toFixed(1) 
    : '0.0';

  // Préparation des données pour les graphiques
  const timeChartData = {
    labels: currentCampaign.timeData?.map(d => d.hour) || [],
    datasets: [
      {
        label: 'Ouvertures',
        data: currentCampaign.timeData?.map(d => d.opens) || [],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Clics',
        data: currentCampaign.timeData?.map(d => d.clicks) || [],
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const consultantChartData = {
    labels: currentCampaign.consultantData?.map(d => d.name) || [],
    datasets: [
      {
        label: 'Ouvertures',
        data: currentCampaign.consultantData?.map(d => d.opens) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Clics',
        data: currentCampaign.consultantData?.map(d => d.clicks) || [],
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  };

  // Fonction pour télécharger les données CSV
  const handleExportCsv = (status: 'delivered' | 'failed' | 'pending') => {
    const csvContent = exportCampaignDataToCsv(currentCampaign, status);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter_${currentCampaign.name.replace(/\s+/g, '_')}_${status}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Dashboard des Newsletters</h1>
      
      {/* Sélecteur de campagne */}
      <div className="mb-6">
        <label htmlFor="campaign-select" className="block text-sm font-medium text-gray-700 mb-1">
          Sélectionner une campagne
        </label>
        <select
          id="campaign-select"
          value={selectedCampaign}
          onChange={(e) => {
            setSelectedCampaign(e.target.value);
            handleCampaignSelect(e.target.value);
          }}
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name} {campaign.status === 'active' ? '(Active)' : campaign.status === 'completed' ? '(Terminée)' : '(Brouillon)'}
            </option>
          ))}
        </select>
      </div>
      
      {/* Informations sur la campagne */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">{currentCampaign.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600"><span className="font-medium">Description:</span> {currentCampaign.description || 'Non spécifiée'}</p>
            <p className="text-gray-600"><span className="font-medium">Statut:</span> {
              currentCampaign.status === 'active' ? 'Active' : 
              currentCampaign.status === 'completed' ? 'Terminée' : 'Brouillon'
            }</p>
            {currentCampaign.sentDate && (
              <p className="text-gray-600">
                <span className="font-medium">Date d'envoi:</span> {new Date(currentCampaign.sentDate).toLocaleString()}
              </p>
            )}
            <p className="text-gray-600">
              <span className="font-medium">Créée le:</span> {currentCampaign.createdAt 
                ? new Date(currentCampaign.createdAt).toLocaleDateString() 
                : 'Non spécifiée'}
            </p>
          </div>
          <div>
            <p className="text-gray-600"><span className="font-medium">Emails envoyés:</span> {currentCampaign.sent}</p>
            <p className="text-gray-600"><span className="font-medium">Emails délivrés:</span> {currentCampaign.delivered}</p>
            <p className="text-gray-600"><span className="font-medium">Emails ouverts:</span> {currentCampaign.opened}</p>
            <p className="text-gray-600"><span className="font-medium">Liens cliqués:</span> {currentCampaign.clicked}</p>
          </div>
        </div>
      </div>
      
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-blue-800 text-sm font-medium mb-1">Taux de délivrabilité</h3>
          <p className="text-4xl font-bold text-blue-900">{deliveryRate}%</p>
          <p className="text-sm text-blue-700">{currentCampaign.delivered} / {currentCampaign.sent}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-green-800 text-sm font-medium mb-1">Taux d'ouverture</h3>
          <p className="text-4xl font-bold text-green-900">{openRate}%</p>
          <p className="text-sm text-green-700">{currentCampaign.opened} / {currentCampaign.delivered}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-purple-800 text-sm font-medium mb-1">Taux de clic</h3>
          <p className="text-4xl font-bold text-purple-900">{clickRate}%</p>
          <p className="text-sm text-purple-700">{currentCampaign.clicked} / {currentCampaign.delivered}</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-yellow-800 text-sm font-medium mb-1">Taux de réponse</h3>
          <p className="text-4xl font-bold text-yellow-900">{replyRate}%</p>
          <p className="text-sm text-yellow-700">{currentCampaign.replied} / {currentCampaign.delivered}</p>
        </div>
      </div>
      
      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Activité dans le temps</h3>
          <div className="bg-gray-50 p-4 rounded-lg h-64">
            {currentCampaign.timeData && currentCampaign.timeData.length > 0 ? (
              <Line 
                data={timeChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Données temporelles non disponibles</p>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Performance par consultant</h3>
          <div className="bg-gray-50 p-4 rounded-lg h-64">
            {currentCampaign.consultantData && currentCampaign.consultantData.length > 0 ? (
              <Bar 
                data={consultantChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Données par consultant non disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bouton d'export */}
      <div className="flex justify-end">
        <button
          onClick={() => handleExportCsv('delivered')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Exporter les données (CSV)
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Statistiques détaillées</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Graphique des ouvertures et clics par heure */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-medium mb-4">Activité par heure</h4>
            {currentCampaign?.timeData && currentCampaign.timeData.length > 0 ? (
              <div className="h-64">
                <Bar 
                  data={{
                    labels: currentCampaign.timeData.map(d => d.hour),
                    datasets: [
                      {
                        label: 'Ouvertures',
                        data: currentCampaign.timeData.map(d => d.opens),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                      },
                      {
                        label: 'Clics',
                        data: currentCampaign.timeData.map(d => d.clicks),
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <p className="text-gray-500 text-center py-10">Aucune donnée disponible</p>
            )}
          </div>

          {/* Graphique des ouvertures et clics par consultant */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-medium mb-4">Performance par consultant</h4>
            {currentCampaign?.consultantData && currentCampaign.consultantData.length > 0 ? (
              <div className="h-64">
                <Bar 
                  data={{
                    labels: currentCampaign.consultantData.map(d => d.name),
                    datasets: [
                      {
                        label: 'Ouvertures',
                        data: currentCampaign.consultantData.map(d => d.opens),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                      },
                      {
                        label: 'Clics',
                        data: currentCampaign.consultantData.map(d => d.clicks),
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <p className="text-gray-500 text-center py-10">Aucune donnée disponible</p>
            )}
          </div>
        </div>
      </div>

      {/* Tableaux des emails délivrés, en attente et non délivrés */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tableau des emails délivrés */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Emails délivrés</h4>
            <button 
              onClick={() => handleExportCsv('delivered')}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Exporter CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCampaign?.deliveries?.filter((d: EmailDelivery) => d.status === 'delivered')
                  .length > 0 ? (
                  paginateData(
                    currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered'),
                    deliveredPage,
                    itemsPerPage
                  ).map((delivery: EmailDelivery, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {delivery.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(delivery.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Délivré
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucun email délivré enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {currentCampaign?.deliveries && currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length > itemsPerPage && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Affichage de {Math.min((deliveredPage - 1) * itemsPerPage + 1, currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length)} à {Math.min(deliveredPage * itemsPerPage, currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length)} sur {currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDeliveredPage(prev => Math.max(prev - 1, 1))}
                    disabled={deliveredPage === 1}
                    className={`px-3 py-1 rounded ${deliveredPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setDeliveredPage(prev => Math.min(prev + 1, Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length / itemsPerPage)))}
                    disabled={deliveredPage >= Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length / itemsPerPage)}
                    className={`px-3 py-1 rounded ${deliveredPage >= Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'delivered').length / itemsPerPage) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tableau des emails en attente */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Emails en attente</h4>
            <button 
              onClick={() => handleExportCsv('pending')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Exporter CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCampaign?.deliveries?.filter((d: EmailDelivery) => d.status === 'pending')
                  .length > 0 ? (
                  paginateData(
                    currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending'),
                    pendingPage,
                    itemsPerPage
                  ).map((delivery: EmailDelivery, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {delivery.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(delivery.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          En attente
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucun email en attente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {currentCampaign?.deliveries && currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending').length > itemsPerPage && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Affichage de {Math.min((pendingPage - 1) * itemsPerPage + 1, currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending').length)} à {Math.min(pendingPage * itemsPerPage, currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending').length)} sur {currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending').length}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPendingPage(prev => Math.max(prev - 1, 1))}
                    disabled={pendingPage === 1}
                    className={`px-3 py-1 rounded ${pendingPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setPendingPage(prev => Math.min(prev + 1, Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending').length / itemsPerPage)))}
                    disabled={pendingPage >= Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending').length / itemsPerPage)}
                    className={`px-3 py-1 rounded ${pendingPage >= Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'pending').length / itemsPerPage) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tableau des emails non délivrés */}
        <div className="bg-white p-6 rounded-lg shadow-lg md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Emails non délivrés</h4>
            <button 
              onClick={() => handleExportCsv('failed')}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Exporter CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raison
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCampaign?.deliveries?.filter((d: EmailDelivery) => d.status === 'failed')
                  .length > 0 ? (
                  paginateData(
                    currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed'),
                    failedPage,
                    itemsPerPage
                  ).map((delivery: EmailDelivery, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {delivery.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(delivery.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                        {delivery.reason || 'Erreur inconnue'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      Aucun email non délivré enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {currentCampaign?.deliveries && currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length > itemsPerPage && (
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Affichage de {Math.min((failedPage - 1) * itemsPerPage + 1, currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length)} à {Math.min(failedPage * itemsPerPage, currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length)} sur {currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFailedPage(prev => Math.max(prev - 1, 1))}
                    disabled={failedPage === 1}
                    className={`px-3 py-1 rounded ${failedPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setFailedPage(prev => Math.min(prev + 1, Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length / itemsPerPage)))}
                    disabled={failedPage >= Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length / itemsPerPage)}
                    className={`px-3 py-1 rounded ${failedPage >= Math.ceil(currentCampaign.deliveries.filter((d: EmailDelivery) => d.status === 'failed').length / itemsPerPage) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 