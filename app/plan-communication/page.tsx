"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/header';
import PlanCommunicationTableau from '../components/plan-communication-tableau';

// Composant client qui utilise useSearchParams
function PlanCommunicationClient() {
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
          <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <PlanCommunicationTableau consultant={consultant} />
      </div>
    </div>
  );
}

// Fallback à afficher pendant le chargement du composant client
function PlanCommunicationFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement de la page...</p>
      </div>
    </div>
  );
}

// Composant principal qui enveloppe le client avec Suspense
export default function PlanCommunicationPage() {
  return (
    <Suspense fallback={<PlanCommunicationFallback />}>
      <PlanCommunicationClient />
    </Suspense>
  );
} 