"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import NotionPlanWorkspace from './components/NotionPlanWorkspace';

// Composant principal avec Suspense pour résoudre l'erreur de déploiement
export default function NotionPlanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DC0032] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>}>
      <NotionPlanContent />
    </Suspense>
  );
}

// Composant effectif qui utilise useSearchParams
function NotionPlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const consultant = searchParams.get('consultant');

  useEffect(() => {
    // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
    if (!loading && !user) {
      router.push('/email-signin');
      return;
    }

    // Rediriger vers la page d'accueil si aucun consultant n'est sélectionné
    if (!loading && !consultant) {
      router.push('/');
      return;
    }
  }, [user, loading, consultant, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DC0032] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !consultant) {
    return null;
  }

  return <NotionPlanWorkspace consultant={consultant} />;
} 