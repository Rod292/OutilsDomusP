"use client";

import { useEffect, Suspense } from 'react';
import { useTheme } from 'next-themes';
import MainLayout from './components/MainLayout';

function EtatDesLieuxContent() {
  const { setTheme } = useTheme();
  
  // Définir le thème clair pour cette page
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  
  return <MainLayout />;
}

export default function EtatDesLieuxPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
      <EtatDesLieuxContent />
    </Suspense>
  );
} 