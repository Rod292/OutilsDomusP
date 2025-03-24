'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/app/hooks/useAuth';
import {
  requestNotificationPermission,
  checkNotificationPermission,
  areNotificationsSupported,
  checkConsultantPermission,
  saveNotificationToken,
  NOTIFICATION_CONFIG
} from '@/app/services/notificationService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GlobalNotificationButtonProps {
  consultantName?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function GlobalNotificationButton({ 
  consultantName, 
  size = 'default',
  className = ''
}: GlobalNotificationButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Vérifier si les notifications sont supportées et l'état actuel
  useEffect(() => {
    if (!user?.email) return;
    
    const checkSupport = async () => {
      const supported = await areNotificationsSupported();
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = checkNotificationPermission();
        setPermission(currentPermission);
        
        // Vérifier si les notifications sont activées pour ce consultant
        if (currentPermission === 'granted' && user.email) {
          const isEnabled = await checkConsultantPermission(user.email, consultantName);
          setIsEnabled(isEnabled);
        }
      }
    };
    
    checkSupport();
  }, [user?.email, consultantName]);

  const handleActivateNotifications = async () => {
    if (!user?.email) {
      toast({
        title: "Utilisateur non connecté",
        description: "Vous devez être connecté pour activer les notifications.",
        variant: "destructive"
      });
      return;
    }

    if (!isSupported) {
      toast({
        title: "Notifications non supportées",
        description: "Votre navigateur ne prend pas en charge les notifications.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Vérifier si les notifications sont activées
      if (!NOTIFICATION_CONFIG.ENABLED) {
        toast({
          title: "Notifications désactivées",
          description: "Le système de notifications est temporairement désactivé.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const result = await requestNotificationPermission();
      setPermission(result.status);

      if (result.status === 'granted') {
        if (result.token) {
          // Enregistrer le token pour ce consultant spécifique si fourni
          await saveNotificationToken(result.token, user.email, consultantName);
          setIsEnabled(true);
          
          toast({
            title: "Notifications activées",
            description: "Vous recevrez désormais des notifications.",
          });
        } else {
          toast({
            title: "Erreur d'activation",
            description: "Impossible d'obtenir un token de notification.",
            variant: "destructive"
          });
        }
      } else if (result.status === 'denied') {
        toast({
          title: "Permission refusée",
          description: "Vous avez refusé les notifications. Vérifiez les paramètres de votre navigateur.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'activation des notifications.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Personnaliser l'apparence en fonction de la taille
  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-3';
      case 'lg':
        return 'h-12 px-5';
      case 'icon':
        return 'h-10 w-10 p-2';
      default:
        return 'h-10 px-4';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size === 'icon' ? 'icon' : 'default'}
            className={`relative ${getButtonSize()} ${className}`}
            onClick={handleActivateNotifications}
            disabled={loading}
          >
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : isEnabled ? (
              <>
                <BellRing className="h-4 w-4 mr-2" />
                {size !== 'icon' && "Notifications activées"}
                <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-green-500" />
              </>
            ) : permission === 'granted' ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                {size !== 'icon' && "Activer les notifications"}
                <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-yellow-500" />
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                {size !== 'icon' && "Activer les notifications"}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isEnabled 
            ? "Notifications activées" 
            : permission === 'granted' 
              ? "Notifications autorisées mais non activées pour ce consultant" 
              : "Activer les notifications"
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 