import React, { Suspense } from 'react';
import { Header } from '../components/header';
import NewsletterEditorVisual from './components/NewsletterEditorVisual';

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
          <h1 className="text-3xl font-bold mb-2 text-[#2D2D2D]">Outil Newsletter</h1>
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