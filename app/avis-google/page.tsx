"use client";

import { Box, Typography, Container, Paper, Divider } from '@mui/material';
import AvisGoogleEditorVisual from './components/AvisGoogleEditorVisual';
import { useTheme } from '@mui/material/styles';
import { Header } from '../components/header';
import { Suspense } from 'react';
import { Star } from 'lucide-react';
import Head from 'next/head';

export default function AvisGooglePage() {
  const theme = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <style jsx global>{`
        /* Correction pour l'affichage du header avec TinyMCE */
        .tox-tinymce-aux {
          z-index: 100 !important;
        }
        .tox-editor-header {
          z-index: 99 !important;
        }
        .tox-dialog-wrap {
          z-index: 1300 !important;
        }
        .tox-menu {
          z-index: 1300 !important;
        }
      `}</style>
      
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* En-tête de la page */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#DC0032] text-white p-2 rounded-full w-12 h-12 flex items-center justify-center shadow-md">
                <Star size={24} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2D2D2D] dark:text-white">
                Demandes d'avis Google
              </h1>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
              Envoyez facilement des demandes d'avis Google à vos clients. Personnalisez vos messages et suivez les réponses pour améliorer votre visibilité en ligne.
            </p>
            
            <div className="border-b border-gray-200 dark:border-gray-700 my-2"></div>
          </div>
          
          {/* Contenu principal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <Suspense fallback={
              <div className="flex justify-center items-center p-12">
                <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin"></div>
              </div>
            }>
              <AvisGoogleEditorVisual />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
} 