'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function OAuthRedirectPage() {
  useEffect(() => {
    const handleOAuthRedirect = () => {
      // Récupérer le code d'autorisation de l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      // Envoyer le code ou l'erreur à la fenêtre parente
      if (window.opener) {
        if (code) {
          window.opener.postMessage({ code }, window.location.origin);
        } else if (error) {
          window.opener.postMessage({ error }, window.location.origin);
        }
      }
    };

    handleOAuthRedirect();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md flex flex-col items-center">
        <RefreshCw className="h-12 w-12 text-[#DC0032] animate-spin mb-4" />
        <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
          Authentification en cours...
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cette fenêtre va se fermer automatiquement.
        </p>
      </div>
    </div>
  );
} 