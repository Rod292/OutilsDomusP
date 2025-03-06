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

// Données simulées pour le prototype
const mockCampaigns: CampaignData[] = [
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
  },
];

export default function NewsletterDashboard() {
  const [campaigns, setCampaigns] = useState<CampaignWithAnalytics[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const data = await getCampaignAnalytics();
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

  if (!currentCampaign) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-center text-gray-600">Aucune campagne disponible</p>
      </div>
    );
  }

  // Calcul des taux
  const deliveryRate = ((currentCampaign.delivered / currentCampaign.sent) * 100).toFixed(1);
  const openRate = ((currentCampaign.opened / currentCampaign.delivered) * 100).toFixed(1);
  const clickRate = ((currentCampaign.clicked / currentCampaign.delivered) * 100).toFixed(1);
  const replyRate = ((currentCampaign.replied / currentCampaign.delivered) * 100).toFixed(1);

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
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner une campagne</label>
        <select 
          value={selectedCampaign} 
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {campaigns.map(campaign => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name} ({new Date(campaign.sentDate).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Cards avec les KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <h3 className="text-sm text-blue-500 font-medium">Taux de délivrabilité</h3>
          <p className="text-2xl font-bold">{deliveryRate}%</p>
          <p className="text-sm text-gray-500">
            {currentCampaign.delivered} / {currentCampaign.sent}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <h3 className="text-sm text-green-500 font-medium">Taux d'ouverture</h3>
          <p className="text-2xl font-bold">{openRate}%</p>
          <p className="text-sm text-gray-500">
            {currentCampaign.opened} / {currentCampaign.delivered}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg shadow">
          <h3 className="text-sm text-purple-500 font-medium">Taux de clic</h3>
          <p className="text-2xl font-bold">{clickRate}%</p>
          <p className="text-sm text-gray-500">
            {currentCampaign.clicked} / {currentCampaign.delivered}
          </p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <h3 className="text-sm text-yellow-600 font-medium">Taux de réponse</h3>
          <p className="text-2xl font-bold">{replyRate}%</p>
          <p className="text-sm text-gray-500">
            {currentCampaign.replied} / {currentCampaign.delivered}
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Activité dans le temps</h3>
          {currentCampaign.timeData && currentCampaign.timeData.length > 0 ? (
            <Line data={timeChartData} options={{ responsive: true, maintainAspectRatio: true }} />
          ) : (
            <p className="text-center text-gray-500 py-8">Aucune donnée temporelle disponible</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Performance par consultant</h3>
          {currentCampaign.consultantData && currentCampaign.consultantData.length > 0 ? (
            <Bar data={consultantChartData} options={{ responsive: true, maintainAspectRatio: true }} />
          ) : (
            <p className="text-center text-gray-500 py-8">Aucune donnée par consultant disponible</p>
          )}
        </div>
      </div>

      {/* Synthèse de la campagne */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Synthèse de la campagne</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p><span className="font-medium">Nom:</span> {currentCampaign.name}</p>
          <p><span className="font-medium">Date d'envoi:</span> {new Date(currentCampaign.sentDate).toLocaleString()}</p>
          <p><span className="font-medium">Emails envoyés:</span> {currentCampaign.sent}</p>
          <p><span className="font-medium">Emails délivrés:</span> {currentCampaign.delivered}</p>
          <p><span className="font-medium">Emails ouverts:</span> {currentCampaign.opened}</p>
          <p><span className="font-medium">Liens cliqués:</span> {currentCampaign.clicked}</p>
          <p><span className="font-medium">Réponses reçues:</span> {currentCampaign.replied}</p>
        </div>
      </div>

      {/* Emails non délivrés */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Emails non délivrés ({currentCampaign.bounces.length})</h2>
        {currentCampaign.bounces.length > 0 ? (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raison
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCampaign.bounces.map((bounce, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bounce.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bounce.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(bounce.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
            Tous les emails ont été délivrés avec succès!
          </div>
        )}
      </div>

      {/* Boutons d'export */}
      <div className="flex gap-4">
        <button 
          onClick={handleExportCsv}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Exporter en CSV
        </button>
        <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
          Exporter en PDF
        </button>
      </div>
    </div>
  );
} 