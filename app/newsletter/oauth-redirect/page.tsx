'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function OAuthHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Extraire le code d'autorisation de l'URL
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Envoyer le code à la fenêtre parente
    if (window.opener) {
      window.opener.postMessage(
        { 
          type: 'gmail-auth', 
          code: code,
          error: error
        }, 
        window.location.origin
      );
    }
  }, [searchParams]);

  return null;
}

export default function OAuthRedirect() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-[#DC0032] mb-4">
          Authentification Gmail
        </h1>
        <p className="text-gray-600 mb-2">
          Authentification en cours, veuillez patienter...
        </p>
        <p className="text-gray-500 text-sm">
          Cette fenêtre va se fermer automatiquement.
        </p>
        <Suspense fallback={null}>
          <OAuthHandler />
        </Suspense>
      </div>
    </div>
  );
} 