import React, { Suspense } from 'react';
import { Header } from '../components/header';
import NewsletterEditorVisual from './components/NewsletterEditorVisual';
import Link from 'next/link';

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-[#2D2D2D]">Outil Newsletter</h1>
            <Link href="/newsletter/dashboard">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Dashboard des statistiques
              </button>
            </Link>
          </div>
          <p className="mb-6 text-gray-600 pb-2 border-b border-gray-200">
            Créez, modifiez et envoyez des newsletters personnalisées à vos clients.
          </p>
          
          <Suspense fallback={
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DC0032]"></div>
            </div>
          }>
            <NewsletterEditorVisual />
          </Suspense>
        </div>
      </div>
    </div>
  );
} 