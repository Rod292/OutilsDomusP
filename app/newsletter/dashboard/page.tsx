import React, { Suspense } from 'react';
import NewsletterDashboard from '../components/NewsletterDashboard';
import Link from 'next/link';
import { Header } from '../../components/header';

export default function DashboardPage() {
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
      
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Statistiques des Newsletters</h1>
          <Link href="/newsletter">
            <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Retour à l'éditeur
            </button>
          </Link>
        </div>
        <NewsletterDashboard />
      </div>
    </div>
  );
} 