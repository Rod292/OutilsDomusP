'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bell, BellRing, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NotificationDebugButtonProps {
  className?: string;
}

export default function NotificationDebugButton({ className = '' }: NotificationDebugButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResetNotifications = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Récupérer l'email de l'utilisateur
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      
      if (!userEmail) {
        setError('Email de l\'utilisateur non disponible. Veuillez vous reconnecter.');
        return;
      }

      // Importer dynamiquement
      const { debugNotifications } = await import('@/app/services/notificationService');
      
      // Tester pour Nathalie par défaut
      const result = await debugNotifications(userEmail, 'nathalie');
      
      if (result) {
        setSuccess('Notification envoyée avec succès.');
      } else {
        setError('Échec de l\'envoi de notification.');
      }
    } catch (error) {
      console.error('Erreur lors du débogage des notifications:', error);
      setError(`Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={error ? "destructive" : success ? "default" : "outline"}
            size="sm"
            className={`${className} h-9 px-3 text-xs inline-flex items-center gap-1.5`}
            onClick={handleResetNotifications}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4" />
            ) : error ? (
              <AlertCircle className="h-4 w-4" />
            ) : success ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Test notif
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {error 
              ? error 
              : success 
                ? success 
                : 'Cliquez pour tester les notifications'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 