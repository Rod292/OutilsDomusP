"use client";

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import MainLayout from './components/MainLayout';

export default function EtatDesLieuxPage() {
  const { setTheme } = useTheme();
  
  // Définir le thème clair pour cette page
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  
  return <MainLayout />;
} 