'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/hooks/useAuth';
import { useNotifications } from '@/app/hooks/useNotifications';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SendTestNotificationButton } from '@/components/notifications';

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
  const { status, requestPermission, checkStatus } = useNotifications(consultant);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper pour déterminer la couleur du badge
  const getBadgeColor = () => {
    if (status.isLoading) return 'bg-yellow-500';
    if (status.permission === 'granted' && status.hasTokens) return 'bg-green-500';
    if (status.permission === 'granted' && !status.hasTokens) return 'bg-yellow-500';
    if (status.permission === 'denied') return 'bg-red-500';
    return 'bg-yellow-500'; // default/prompt
  };

  // Helper pour déterminer le texte du statut
  const getStatusText = () => {
    if (status.isLoading) return 'Vérification...';
    if (status.permission === 'granted' && status.hasTokens) return 'Activées';
    if (status.permission === 'granted' && !status.hasTokens) return 'Partielles';
    if (status.permission === 'denied') return 'Bloquées';
    return 'Non activées';
  };

  // Actualiser manuellement le statut des notifications
  const refreshStatus = async () => {
    if (!user?.email) return;
    
    setIsRefreshing(true);
    try {
      await checkStatus();
      toast({
        title: 'Statut actualisé',
        description: `Notifications: ${getStatusText()}`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Erreur lors de l\'actualisation du statut:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier le statut des notifications',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Activer les notifications
  const activateNotifications = async () => {
    if (!user?.email) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour activer les notifications',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const success = await requestPermission();
      if (success) {
        toast({
          title: 'Notifications activées',
          description: 'Vous recevrez désormais des notifications sur cet appareil',
        });
      } else if (status.error) {
        toast({
          title: 'Erreur',
          description: status.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'activer les notifications',
        variant: 'destructive',
      });
    }
  };

  // Afficher uniquement l'icône avec une info-bulle
  if (iconOnly) {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 relative", className)}
              onClick={status.permission === 'granted' ? refreshStatus : activateNotifications}
              disabled={status.isLoading || isRefreshing}
            >
              {status.isLoading || isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status.permission === 'granted' && status.hasTokens ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              <span className={cn("absolute -top-1 -right-1 flex h-3 w-3 rounded-full", getBadgeColor())} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Notifications: {getStatusText()}</p>
            {status.permission !== 'granted' && <p>Cliquez pour activer</p>}
            {status.permission === 'granted' && !status.hasTokens && <p>Tokens manquants. Cliquez pour réactiver.</p>}
          </TooltipContent>
        </Tooltip>
        
        {/* Bouton de test uniquement si les notifications sont activées */}
        {status.permission === 'granted' && status.hasTokens && (
          <SendTestNotificationButton 
            consultant={consultant} 
            email={user?.email}
          />
        )}
      </div>
    );
  }

  // Affichage complet avec texte et bouton
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full", getBadgeColor())} />
          <span className="text-sm font-medium">
            Notifications: {getStatusText()}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={refreshStatus}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant={status.permission === 'granted' && status.hasTokens ? "outline" : "default"}
          size="sm"
          className="flex-1"
          onClick={activateNotifications}
          disabled={status.isLoading}
        >
          {status.isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement...</>
          ) : status.permission === 'granted' && status.hasTokens ? (
            <><Bell className="mr-2 h-4 w-4" /> Réactiver</>
          ) : (
            <><Bell className="mr-2 h-4 w-4" /> Activer les notifications</>
          )}
        </Button>
        
        {status.permission === 'granted' && status.hasTokens && (
          <SendTestNotificationButton 
            consultant={consultant} 
            email={user?.email}
            className="flex-1"
          />
        )}
      </div>
      
      {status.error && (
        <p className="text-sm text-red-500">{status.error}</p>
      )}
    </div>
  );
} 