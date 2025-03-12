"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../components/header';
import ChatInterface from './components/ChatInterface';
import { useAuth } from '../hooks/useAuth';
import { Cat } from 'lucide-react';

// Composant client séparé pour gérer useSearchParams
function ChatContent() {
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
      <Suspense fallback={
        <div className="h-14 sm:h-16 bg-[#DC0032]">
          <div className="container mx-auto px-2 sm:px-4">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="w-32 h-8 bg-white/20 animate-pulse rounded"></div>
              <div className="w-8 h-8 bg-white/20 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      }>
        <Header />
      </Suspense>
      
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
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
          
          <Suspense fallback={
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DC0032]"></div>
            </div>
          }>
            <ChatInterface />
          </Suspense>
          
          <div className="mt-3 text-center text-xs text-gray-500">
            <p>Arthur est propulsé par Mistral AI et personnalisé pour Arthur Loyd.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant principal avec Suspense boundary
export default function ArthurLeChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-gray-700 font-medium">Chargement...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
} 