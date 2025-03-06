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
};

export default function NewsletterDashboard() {
  const [campaigns, setCampaigns] = useState<CampaignWithAnalytics[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const data = await getCampaignAnalytics();
        console.log('Campagnes chargées:', data);
        setCampaigns(data);
        if (data.length > 0) {
          setSelectedCampaign(data[0].id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const currentCampaign = campaigns.find(c => c.id === selectedCampaign);

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
  const handleExportCsv = () => {
    const csvContent = exportCampaignDataToCsv(currentCampaign);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter_${currentCampaign.name.replace(/\s+/g, '_')}.csv`);
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
          onChange={(e) => setSelectedCampaign(e.target.value)}
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
          onClick={handleExportCsv}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Exporter les données (CSV)
        </button>
      </div>
    </div>
  );
} 