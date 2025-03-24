'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Check } from 'lucide-react';
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

export interface NotificationPermissionProps {
  className?: string;
  iconOnly?: boolean;
  consultant?: string;
}

export default function NotificationPermission({ 
  className, 
  iconOnly = true,
  consultant
}: NotificationPermissionProps) {
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
          const isEnabled = await checkConsultantPermission(user.email, consultant);
          setIsEnabled(isEnabled);
        }
      }
    };
    
    checkSupport();
  }, [user?.email, consultant]);
  
  const handleActivate = async () => {
    if (!isSupported) {
      toast({
        title: "Notifications non supportées",
        description: "Votre navigateur ne prend pas en charge les notifications.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.email) {
      toast({
        title: "Erreur d'authentification",
        description: "Vous devez être connecté pour activer les notifications.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Temporairement désactivé pendant la refonte
      if (!NOTIFICATION_CONFIG.ENABLED) {
        toast({
          title: "Système en cours de refonte",
          description: "Le système de notification est temporairement désactivé pendant la reconstruction.",
        });
        setLoading(false);
        return;
      }
      
      // Demander la permission si nécessaire
      if (permission !== 'granted') {
        const result = await requestNotificationPermission();
        setPermission(result.status);
        
        if (result.status !== 'granted') {
          toast({
            title: "Permission refusée",
            description: "Vous devez autoriser les notifications dans les paramètres de votre navigateur.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        // Si un token a été obtenu, l'enregistrer
        if (result.token) {
          await saveNotificationToken(result.token, user.email, consultant);
          setIsEnabled(true);
          
          toast({
            title: "Notifications activées",
            description: "Vous recevrez désormais des notifications pour ce consultant.",
          });
        }
      } else {
        // Si la permission est déjà accordée, vérifier/enregistrer le token
        if (NOTIFICATION_CONFIG.USE_FCM) {
          try {
            // Cette partie sera implémentée lorsque les notifications seront réactivées
            toast({
              title: "Notifications configurées",
              description: "Votre appareil est déjà configuré pour recevoir des notifications.",
            });
          } catch (error) {
            console.error('Erreur lors de la configuration des notifications:', error);
            toast({
              title: "Erreur de configuration",
              description: "Une erreur est survenue lors de la configuration des notifications.",
              variant: "destructive"
            });
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      toast({
        title: "Erreur d'activation",
        description: "Une erreur est survenue lors de l'activation des notifications.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Affichage de l'icône uniquement
  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 relative", className)}
        onClick={handleActivate}
        disabled={loading || !isSupported || !NOTIFICATION_CONFIG.ENABLED}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isEnabled ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {isEnabled && (
          <span className={cn("absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-green-500")} />
        )}
        {!isEnabled && permission === 'granted' && (
          <span className={cn("absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-yellow-500")} />
        )}
      </Button>
    );
  }

  // Affichage complet
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <Button
        variant={isEnabled ? "outline" : "default"}
        size="sm"
        onClick={handleActivate}
        disabled={loading || !isSupported || !NOTIFICATION_CONFIG.ENABLED}
        className={cn(isEnabled && "border-green-500")}
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configuration...</>
        ) : isEnabled ? (
          <><Check className="mr-2 h-4 w-4 text-green-500" /> Notifications activées</>
        ) : (
          <><Bell className="mr-2 h-4 w-4" /> Activer les notifications</>
        )}
      </Button>
      
      {!NOTIFICATION_CONFIG.ENABLED && (
        <p className="text-xs text-muted-foreground">Le système de notification est en cours de reconstruction.</p>
      )}
      
      {!isSupported && (
        <p className="text-xs text-muted-foreground">Votre navigateur ne prend pas en charge les notifications.</p>
      )}
      
      {permission === 'denied' && (
        <p className="text-xs text-muted-foreground">Vous avez refusé les notifications. Vérifiez les paramètres de votre navigateur.</p>
      )}
    </div>
  );
} 