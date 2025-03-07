'use client';

import React, { useState, useEffect } from 'react';
import { Campaign, createCampaign, getAllCampaigns, deleteCampaign } from '../services/campaigns';

type CampaignManagerProps = {
  onSelectCampaign: (campaignId: string) => void;
  selectedCampaignId?: string;
};

export default function CampaignManager({ onSelectCampaign, selectedCampaignId }: CampaignManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>>({
    name: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getAllCampaigns();
      setCampaigns(data);
      
      // Si aucune campagne n'est sélectionnée et qu'il y a des campagnes disponibles, sélectionner la première
      if (!selectedCampaignId && data.length > 0) {
        onSelectCampaign(data[0].id!);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des campagnes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newCampaign.name.trim()) {
        alert('Le nom de la campagne est requis');
        return;
      }
      
      const campaign = await createCampaign(newCampaign);
      setNewCampaign({ name: '', description: '', status: 'active' });
      setShowCreateForm(false);
      await loadCampaigns();
      if (campaign.id) {
        onSelectCampaign(campaign.id);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la campagne:', error);
      alert('Erreur lors de la création de la campagne');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) {
      try {
        await deleteCampaign(id);
        await loadCampaigns();
      } catch (error) {
        console.error('Erreur lors de la suppression de la campagne:', error);
        alert('Erreur lors de la suppression de la campagne');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="animate-pulse h-10 bg-gray-200 rounded mb-4"></div>
        <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Campagnes</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          {showCreateForm ? 'Annuler' : 'Nouvelle campagne'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateCampaign} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la campagne*
            </label>
            <input
              type="text"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Ex: PEM SUD"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Description de la campagne"
              rows={3}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={newCampaign.status}
              onChange={(e) => setNewCampaign({ 
                ...newCampaign, 
                status: e.target.value as 'active' | 'completed' | 'draft' 
              })}
              className="w-full p-2 border rounded"
            >
              <option value="active">Active</option>
              <option value="draft">Brouillon</option>
              <option value="completed">Terminée</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Créer la campagne
            </button>
          </div>
        </form>
      )}

      {campaigns.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          Aucune campagne disponible. Créez votre première campagne !
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedCampaignId === campaign.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => onSelectCampaign(campaign.id!)}
            >
              <div>
                <h3 className="font-medium">{campaign.name}</h3>
                {campaign.description && (
                  <p className="text-sm text-gray-600">{campaign.description}</p>
                )}
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {campaign.status === 'active' ? 'Active' : 
                     campaign.status === 'completed' ? 'Terminée' : 'Brouillon'}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    Créée le {campaign.createdAt instanceof Date 
                      ? campaign.createdAt.toLocaleDateString() 
                      : new Date((campaign.createdAt as any)?.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCampaign(campaign.id!);
                  }}
                  className="ml-2 text-red-600 hover:text-red-800"
                  title="Supprimer la campagne"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 