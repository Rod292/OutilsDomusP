'use client';

import React, { useState } from 'react';

interface TemplateSaveFormProps {
  onSave: (templateName: string) => Promise<void>;
}

export default function TemplateSaveForm({ onSave }: TemplateSaveFormProps) {
  const [templateName, setTemplateName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      setError('Veuillez entrer un nom pour le template');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      await onSave(templateName);
      
      setSuccess(true);
      // Réinitialiser le message de succès après 3 secondes
      setTimeout(() => setSuccess(false), 3000);
      
      // Réinitialiser le formulaire
      setTemplateName('');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError('Une erreur est survenue lors de la sauvegarde du template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Sauvegarder le template</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du template
          </label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Ex: PEM SUD - Version 1"
            disabled={saving}
          />
        </div>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
            Template sauvegardé avec succès!
          </div>
        )}
        
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400"
          disabled={saving}
        >
          {saving ? 'Sauvegarde en cours...' : 'Sauvegarder le template'}
        </button>
      </form>
    </div>
  );
} 