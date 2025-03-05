"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/header';
import EmailProfessionnelEditor from './components/EmailProfessionnelEditor';

// Composant client qui utilise useSearchParams
function EmailProfessionnelClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const { user, loading } = useAuth();
  const [transitionOpacity, setTransitionOpacity] = useState('opacity-0');

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

    // Animation d'entrée
    const timer = setTimeout(() => {
      setTransitionOpacity('opacity-100');
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, router, consultant]);

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
    <div className={`min-h-screen bg-gray-50 transition-opacity duration-300 ${transitionOpacity}`}>
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-[#2D2D2D]">Éditeur d'Emails Professionnels</h1>
          {consultant && <span className="mt-2 text-[#DC0032] font-medium text-sm bg-red-50 px-3 py-1 rounded-md">Consultant: {consultant}</span>}
          <p className="mb-6 text-gray-600 pb-2 border-b border-gray-200 mt-2">
            Créez et personnalisez des emails professionnels pour vos clients.
          </p>

          <EmailProfessionnelEditor consultant={consultant} />
        </div>
      </div>
    </div>
  );
}

// Page principale avec Suspense
export default function EmailProfessionnel() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <EmailProfessionnelClient />
    </Suspense>
  );
} 