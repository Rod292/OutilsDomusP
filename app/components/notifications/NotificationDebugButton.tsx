"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellIcon } from 'lucide-react';
import { debugNotifications } from '@/app/services/notificationService';

interface NotificationDebugButtonProps {
  className?: string;
}

export default function NotificationDebugButton({ className = '' }: NotificationDebugButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);

  const handleTestNotifications = async () => {
    try {
      setIsLoading(true);
      setSuccess(null);
      
      // Passer le nom d'utilisateur et le consultant pour les tests
      const result = await debugNotifications("test_user", "test_consultant");
      
      console.log('Test de notification effectué:', result);
      setSuccess(true);
      
      // Réinitialiser l'état après 3 secondes
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Erreur lors du test de notification:', error);
      setSuccess(false);
      
      // Réinitialiser l'état après 3 secondes
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={handleTestNotifications}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
      >
        <BellIcon className="h-4 w-4 text-yellow-500" />
        Test notifications
      </Button>
      
      {success === true && (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          Notification envoyée
        </Badge>
      )}
      
      {success === false && (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
          Échec de l'envoi
        </Badge>
      )}
    </div>
  );
} 