"use client";

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import NotionPlanWorkspace from './components/NotionPlanWorkspace';
import NotificationDebugButton from './components/NotificationDebugButton';

// Composant principal qui ne contient pas useSearchParams()
export default function NotionPlanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <NotionPlanContent />
    </Suspense>
  );
}

// Composant interne qui utilise useSearchParams()
import { useSearchParams } from 'next/navigation';

function NotionPlanContent() {
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
    <>
      <NotificationDebugButton />
      <NotionPlanWorkspace consultant={consultant} />
    </>
  );
} 