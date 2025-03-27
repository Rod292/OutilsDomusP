"use client";

import { useEffect, Suspense } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';

// Utiliser dynamic pour éviter les problèmes de rendu côté serveur
const DynamicMainLayout = dynamic(() => import('./components/MainLayout'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen">Chargement...</div>
});

function EtatDesLieuxContent() {
  const { setTheme } = useTheme();
  
  // Définir le thème clair pour cette page
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  
  return <DynamicMainLayout />;
}

export default function EtatDesLieuxPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
      <EtatDesLieuxContent />
    </Suspense>
  );
} 