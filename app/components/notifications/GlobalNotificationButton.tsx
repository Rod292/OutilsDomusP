'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, BellRing, RefreshCw, Settings, RotateCcw } from 'lucide-react';
import { 
  requestNotificationPermission, 
  checkConsultantPermission, 
  regenerateAndSaveToken, 
  checkRealNotificationPermission,
  resetNotificationSettings
} from '@/app/services/clientNotificationService';
import { useAuth } from '@/app/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  // Vérifier le statut des notifications au chargement du composant
  useEffect(() => {
    if (user?.email && consultantName) {
      checkNotificationStatus();
      
      // Ajouter un écouteur d'événement pour les changements de permission
      const handlePermissionChange = (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('Événement de changement de permission détecté:', customEvent.detail);
        checkNotificationStatus();
      };
      
      window.addEventListener('notification-permission-changed', handlePermissionChange);
      
      // Nettoyage lors du démontage du composant
      return () => {
        window.removeEventListener('notification-permission-changed', handlePermissionChange);
      };
    }
  }, [user?.email, consultantName]);

  // Fonction séparée pour vérifier le statut des notifications
  const checkNotificationStatus = async () => {
    if (!user?.email || !consultantName) return;
    
    // Vérifier d'abord le statut réel des permissions dans le navigateur
    const realStatus = await checkRealNotificationPermission();
    console.log(`Statut réel des notifications: ${realStatus}`);
    
    if (realStatus === 'denied') {
      setPermissionStatus('denied');
    } else {
      // Si ce n'est pas bloqué, vérifier si l'utilisateur a activé les notifications pour ce consultant
      try {
        const hasPermission = await checkConsultantPermission(user.email as string, consultantName);
        setPermissionStatus(hasPermission ? 'granted' : 'default');
      } catch (error) {
        console.error("Erreur lors de la vérification des permissions:", error);
        setPermissionStatus('default');
      }
    }
  };

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

  const handleResetNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notificationId) return;
    
    setLoading(true);
    try {
      const success = await resetNotificationSettings(notificationId);
      if (success) {
        toast({
          title: "Notifications réinitialisées",
          description: "Les paramètres de notification ont été réinitialisés avec succès.",
          variant: "default"
        });
        setPermissionStatus('granted');
      } else {
        toast({
          title: "Échec",
          description: "Impossible de réinitialiser les paramètres de notification.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la réinitialisation des notifications.",
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
    tooltipText = 'Notifications bloquées - Cliquez pour les options';
    buttonClass += ' text-red-500';
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Si les notifications sont actuellement activées, vérifier d'abord si elles le sont réellement
    if (permissionStatus === 'granted') {
      checkRealNotificationPermission().then(realStatus => {
        if (realStatus !== 'granted') {
          // Si le statut réel est différent, mettre à jour notre état
          setPermissionStatus(realStatus);
          
          // Afficher un message
          toast({
            title: "Statut des notifications incorrect",
            description: "Les notifications semblaient activées mais ne le sont plus. Tentative de réactivation...",
            variant: "destructive"
          });
          
          // Essayer de les réactiver
          handleRequestPermission();
        } else {
          // Si elles sont bien activées, permettre de les réactiver
          handleRequestPermission();
        }
      });
    } else if (permissionStatus === 'denied') {
      // Afficher un message explicatif
      toast({
        title: "Notifications bloquées",
        description: "Les notifications sont bloquées dans les paramètres de votre navigateur. Utilisez le bouton 'Paramètres du navigateur' pour les activer.",
        variant: "destructive"
      });
    } else {
      handleRequestPermission();
    }
  };
  
  const openBrowserSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.userAgent.includes('Chrome')) {
        // Ouvrir directement les paramètres Chrome
        window.open('chrome://settings/content/notifications', '_blank');
        
        // Également ouvrir notre page d'aide au cas où l'ouverture des paramètres Chrome échoue
        setTimeout(() => {
          router.push('/help/notifications');
        }, 500);
      } else if (navigator.userAgent.includes('Firefox')) {
        window.open('about:preferences#privacy', '_blank');
        
        // Également ouvrir notre page d'aide au cas où l'ouverture des paramètres Firefox échoue
        setTimeout(() => {
          router.push('/help/notifications');
        }, 500);
      } else {
        // Pour les autres navigateurs, rediriger vers notre page d'aide
        router.push('/help/notifications');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture des paramètres:', error);
      
      // Rediriger vers notre page d'aide
      router.push('/help/notifications');
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
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleResetNotifications}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser complètement
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={openBrowserSettings}>
          <Settings className="h-4 w-4 mr-2" />
          Paramètres du navigateur
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 