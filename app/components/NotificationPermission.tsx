'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/hooks/useAuth';
import {
  areNotificationsSupported,
  checkNotificationPermission,
  requestNotificationPermission,
  saveNotificationToken,
  checkConsultantPermission,
  NOTIFICATION_CONFIG
} from '@/app/services/notificationService';
import {
  checkNotificationsSupport,
  requestNotificationPermissionAndToken
} from '@/app/services/firebase';

export interface NotificationPermissionProps {
  className?: string;
  iconOnly?: boolean;
  email?: string;
  consultant?: string;
}

export function NotificationPermission({
  className,
  iconOnly = false,
  email,
  consultant
}: NotificationPermissionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported' | 'loading'>('loading');
  const [isRegistering, setIsRegistering] = useState(false);

  // Vérifier la compatibilité des notifications et la permission actuelle
  useEffect(() => {
    async function checkSupport() {
      // Vérifier si les notifications sont supportées
      const supported = await checkNotificationsSupport();
      setIsSupported(supported);
      
      if (!supported) {
        setPermissionStatus('unsupported');
        return;
      }
      
      // Vérifier la permission actuelle si les notifications sont supportées
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionStatus(Notification.permission);
      } else {
        setPermissionStatus('unsupported');
      }
    }
    
    checkSupport();
  }, []);

  // Demander la permission et enregistrer le token
  const requestPermission = async () => {
    setIsRegistering(true);
    
    try {
      const result = await requestNotificationPermissionAndToken();
      
      if (result) {
        setPermissionStatus('granted');
        
        // Enregistrer le token avec les informations de l'utilisateur
        if (result && email) {
          // Créer le userId au format attendu
          const userId = consultant ? `${email}_${consultant}` : email;
          
          // Envoyer le token au serveur
          const response = await fetch('/api/notifications/tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: result,
              userId,
              deviceInfo: {
                userAgent: navigator.userAgent,
              },
            }),
          });
          
          if (response.ok) {
            toast({
              title: "Notifications activées",
              description: "Vous recevrez des notifications pour les événements importants.",
              variant: "default",
            });
          } else {
            console.error('Erreur lors de l\'enregistrement du token:', await response.text());
            toast({
              title: "Erreur",
              description: "Impossible d'enregistrer le token de notification.",
              variant: "destructive",
            });
          }
        }
      } else if (result === null) {
        setPermissionStatus('denied');
        toast({
          title: "Notifications refusées",
          description: "Vous devez autoriser les notifications dans les paramètres de votre navigateur.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'activation des notifications.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Afficher le bouton en fonction de l'état
  const renderButton = () => {
    // Si l'état est en cours de chargement
    if (permissionStatus === 'loading' || isSupported === null) {
      return (
        <Button variant="outline" size="sm" className={className} disabled>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {!iconOnly && <span>Chargement...</span>}
        </Button>
      );
    }
    
    // Si les notifications ne sont pas supportées
    if (permissionStatus === 'unsupported' || isSupported === false) {
      return (
        <Button variant="outline" size="sm" className={className} disabled>
          <BellOff className="h-4 w-4 mr-2" />
          {!iconOnly && <span>Non supporté</span>}
        </Button>
      );
    }
    
    // Si l'autorisation est déjà accordée
    if (permissionStatus === 'granted') {
      return (
        <Button variant="outline" size="sm" className={cn("bg-green-50", className)} disabled>
          <Check className="h-4 w-4 mr-2 text-green-500" />
          {!iconOnly && <span>Notifications activées</span>}
        </Button>
      );
    }
    
    // Si l'autorisation est refusée
    if (permissionStatus === 'denied') {
      return (
        <Button variant="outline" size="sm" className={cn("bg-red-50", className)}>
          <X className="h-4 w-4 mr-2 text-red-500" />
          {!iconOnly && <span>Notifications refusées</span>}
        </Button>
      );
    }
    
    // Par défaut, afficher le bouton pour demander l'autorisation
    return (
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={requestPermission}
        disabled={isRegistering}
      >
        {isRegistering ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Bell className="h-4 w-4 mr-2" />
        )}
        {!iconOnly && <span>{isRegistering ? "Activation..." : "Activer les notifications"}</span>}
      </Button>
    );
  };

  return renderButton();
} 