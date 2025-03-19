"use client";

import React, { Suspense, useEffect } from 'react';
import { Header } from '../components/header';
import NewsletterEditorVisual from './components/NewsletterEditorVisual';
import Link from 'next/link';
import { useTheme } from "next-themes";

export default function NewsletterPage() {
  const { setTheme } = useTheme();
  
  // Définir le thème clair pour cette page
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Éditeur de Newsletter</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
            Retour à l'accueil
          </Link>
        </div>
        
        <Suspense fallback={<div>Chargement de l'éditeur...</div>}>
          <NewsletterEditorVisual />
        </Suspense>
      </div>
    </div>
  );
} 