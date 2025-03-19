"use client";

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import NotionPlanWorkspace from './components/NotionPlanWorkspace';
import NotificationDebugButton from './components/NotificationDebugButton';

// Composant principal avec Suspense pour résoudre l'erreur de déploiement
export default function NotionPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  
  // Récupérer le consultant depuis l'URL
  const consultant = searchParams.get('consultant') || '';
  
  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!loading && !user) {
    router.push('/login');
    return null;
  }
  
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="spinner"></div>
    </div>}>
      <div className="container px-0 py-4 md:py-6 flex flex-col h-full">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Plan de communication</h1>
          <div className="flex items-center gap-2">
            <NotificationDebugButton />
          </div>
        </header>
        <NotionPlanWorkspace consultant={consultant} />
      </div>
    </Suspense>
  );
} 