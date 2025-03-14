"use client";

import React from 'react';
import { Header } from '../components/header';
import { Cat } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

// Composant qui utilise useSearchParams (enveloppé dans Suspense)
function ChatContent() {
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="bg-[#DC0032] text-white p-3 rounded-full w-12 h-12 flex items-center justify-center shadow-md mr-4">
            <Cat size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#2D2D2D]">Arthur le chat</h1>
            <p className="text-gray-600 text-sm">Votre assistant immobilier intelligent</p>
          </div>
        </div>
        
        {consultant && (
          <div>
            <span className="text-[#DC0032] font-medium text-sm bg-red-50 px-4 py-1.5 rounded-full shadow-sm border border-red-100">
              Consultant: {consultant}
            </span>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="mb-6">
          <Cat size={64} className="mx-auto text-[#DC0032]" />
        </div>
        <h2 className="text-xl font-semibold mb-4">Fonctionnalité en cours de développement</h2>
        <p className="text-gray-600 mb-6">
          Arthur le chat est actuellement en phase de développement et sera bientôt disponible.
        </p>
      </div>
    </>
  );
}

// Page temporaire en attendant le développement complet
export default function ArthurLeChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [transitionOpacity, setTransitionOpacity] = useState('opacity-0');

  useEffect(() => {
    // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
    if (!loading && !user) {
      router.push('/email-signin');
      return;
    }

    // Animation d'entrée
    const timer = setTimeout(() => {
      setTransitionOpacity('opacity-100');
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-gray-700 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 transition-opacity duration-500 ${transitionOpacity}`}>
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Utiliser Suspense pour envelopper le composant qui utilise useSearchParams */}
          <Suspense fallback={
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DC0032]"></div>
            </div>
          }>
            <ChatContent />
          </Suspense>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Arthur est propulsé par Mistral AI et personnalisé pour Arthur Loyd.</p>
          </div>
          
          <div className="mt-4 text-center">
            <button 
              onClick={() => router.push('/')}
              className="bg-[#DC0032] text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 