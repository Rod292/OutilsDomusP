'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { requestNotificationPermission, checkConsultantPermission } from '@/app/services/notificationService';
import { useAuth } from '@/app/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskNotificationButtonProps {
  consultantName: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function TaskNotificationButton({ 
  consultantName, 
  className = '', 
  size = 'icon' 
}: TaskNotificationButtonProps) {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [loading, setLoading] = useState<boolean>(false);

  // Vérifier le statut des notifications au chargement du composant
  useEffect(() => {
    if (user?.email && consultantName) {
      checkConsultantPermission(user.email, consultantName)
        .then(hasPermission => {
          setPermissionStatus(hasPermission ? 'granted' : 'default');
        })
        .catch(() => {
          setPermissionStatus('default');
        });
    }
  }, [user?.email, consultantName]);

  // Identifiant pour les notifications - combinaison de l'email de l'utilisateur et du consultant
  const notificationId = user?.email && consultantName ? `${user.email}_${consultantName}` : null;

  // Demander la permission pour les notifications
  const handleRequestPermission = async () => {
    if (!notificationId) {
      console.error('Utilisateur non connecté ou consultant non spécifié');
      return;
    }
    
    setLoading(true);
    try {
      // Même si les notifications sont déjà activées, on permet de les réactiver
      const result = await requestNotificationPermission(notificationId);
      
      if (result === true) {
        setPermissionStatus('granted');
        console.log(`Notifications activées pour: ${notificationId}`);
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !consultantName) {
    return null;
  }

  // Déterminer l'icône et le message en fonction du statut
  let icon = <Bell className={`h-4 w-4 ${loading ? 'animate-ping' : ''}`} />;
  let tooltipText = `Activer les notifications pour ${consultantName}`;
  let disabled = loading;
  let buttonClass = className;

  if (permissionStatus === 'granted') {
    icon = <BellRing className="h-4 w-4 text-green-500" />;
    tooltipText = `Notifications activées pour ${consultantName} (cliquez pour réactiver)`;
    buttonClass += ' text-green-500';
  } else if (permissionStatus === 'denied') {
    icon = <BellOff className="h-4 w-4 text-red-500" />;
    tooltipText = 'Notifications bloquées - Cliquez pour ouvrir les paramètres';
    buttonClass += ' text-red-500';
  }

  const handleClick = permissionStatus === 'denied' 
    ? () => window.open('chrome://settings/content/notifications', '_blank')
    : handleRequestPermission;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            className={buttonClass}
            onClick={handleClick}
            disabled={disabled}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 