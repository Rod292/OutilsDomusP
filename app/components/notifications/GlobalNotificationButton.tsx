'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, BellRing, RefreshCw } from 'lucide-react';
import { requestNotificationPermission, checkConsultantPermission, regenerateAndSaveToken } from '@/app/services/clientNotificationService';
import { useAuth } from '@/app/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';

interface GlobalNotificationButtonProps {
  consultantName: string;
  className?: string;
  size?: 'icon' | 'default';
}

export default function GlobalNotificationButton({ 
  consultantName, 
  className = '', 
  size = 'icon' 
}: GlobalNotificationButtonProps) {
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

  const handleRegenerateToken = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const success = await regenerateAndSaveToken(user.email, consultantName);
      if (success) {
        toast({
          title: "Token régénéré",
          description: "Le token a été régénéré avec succès.",
          variant: "default"
        });
        setPermissionStatus('granted');
      } else {
        toast({
          title: "Échec",
          description: "Impossible de régénérer le token.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la régénération du token.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !consultantName) {
    return null;
  }

  // Déterminer l'icône et le message en fonction du statut
  let icon = <Bell className={`h-5 w-5 ${loading ? 'animate-ping' : ''}`} />;
  let tooltipText = `Activer les notifications pour ${consultantName}`;
  let disabled = loading;
  let buttonClass = className;

  if (permissionStatus === 'granted') {
    icon = <BellRing className="h-5 w-5 text-green-500" />;
    tooltipText = `Notifications activées pour ${consultantName} (cliquez pour réactiver)`;
    buttonClass += ' text-green-500';
  } else if (permissionStatus === 'denied') {
    icon = <BellOff className="h-5 w-5 text-red-500" />;
    tooltipText = 'Notifications bloquées - Cliquez pour ouvrir les paramètres';
    buttonClass += ' text-red-500';
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissionStatus === 'denied') {
      window.open('chrome://settings/content/notifications', '_blank');
    } else {
      handleRequestPermission();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={size}
                className={buttonClass}
                disabled={disabled}
              >
                {icon}
                <span className="sr-only">Notifications</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleClick}>
          {permissionStatus === 'granted' ? 'Réactiver les notifications' : 'Activer les notifications'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRegenerateToken}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Régénérer le token
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 