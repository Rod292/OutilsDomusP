"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Header } from '../../components/header';
import { EtatDesLieuxForm } from '@/app/components/etat-des-lieux-form';
import { useAuth } from '@/app/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function NouvelEtatDesLieux() {
  const { setTheme } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Définir le thème clair pour cette page
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  
  // Rediriger si non connecté
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/etat-des-lieux/nouveau');
    }
  }, [user, loading, router]);
  
  const handleRapportGenerated = (rapport: any, formData: any) => {
    // Gérer la génération du rapport PDF
    console.log("Rapport généré avec succès");
  };
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <h2 className="text-lg font-medium">Chargement...</h2>
          </div>
        </main>
      </div>
    );
  }
  
  if (!user) {
    return null; // Redirection en cours
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Nouvel État des Lieux</h1>
            <button
              onClick={() => router.push('/etat-des-lieux')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 flex items-center text-sm"
            >
              Retour
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700 text-sm">
              <strong>Important :</strong> Votre travail est automatiquement sauvegardé à chaque modification.
              Vous pouvez quitter cette page et y revenir plus tard, votre état des lieux sera accessible depuis la page d'accueil.
            </p>
          </div>
          
          <EtatDesLieuxForm
            onRapportGenerated={handleRapportGenerated}
            onProgressUpdate={(data: any) => console.log("Progression mise à jour")}
            consultantName={user?.displayName || user?.email || "Consultant"}
          />
        </div>
      </main>
    </div>
  );
} 