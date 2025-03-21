'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { requestNotificationPermission, logNotificationPermissionStatus, checkConsultantPermission } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSearchParams } from 'next/navigation';
import { getFirestore, query, collection, getDocs, where } from 'firebase/firestore';

interface NotificationPermissionProps {
  className?: string;
  iconOnly?: boolean;
}

export default function NotificationPermission({ className, iconOnly = true }: NotificationPermissionProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [consultantPermissionStatus, setConsultantPermissionStatus] = useState<string>('default');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Identifiant pour les notifications - combinaison de l'email de l'utilisateur et du consultant
  const notificationId = consultant ? `${user?.email}_${consultant}` : user?.email;

  // Vérifier l'état des notifications au chargement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Vérifier le statut global des notifications du navigateur
      const status = logNotificationPermissionStatus();
      setPermissionStatus(status);
      
      // Vérifier si ce consultant spécifique a déjà des notifications activées
      if (user?.email && consultant) {
        checkConsultantPermission(user.email, consultant)
          .then(hasPermission => {
            console.log(`Vérification des permissions pour ${consultant}: ${hasPermission ? 'activées' : 'désactivées'}`);
            setConsultantPermissionStatus(hasPermission ? 'granted' : 'default');
            
            // Vérifier si des tokens existent pour cet utilisateur
            const checkNotificationToken = async () => {
              try {
                const db = getFirestore();
                if (!db) return;
                
                const notificationId = `${user.email}_${consultant}`;
                const q = query(
                  collection(db, 'notificationTokens'),
                  where('userId', '==', notificationId)
                );
                
                const snapshot = await getDocs(q);
                if (snapshot.empty && hasPermission) {
                  console.log(`Aucun token trouvé pour ${notificationId}, mais permissions accordées`);
                  setConsultantPermissionStatus('missing');
                } else if (!snapshot.empty) {
                  console.log(`${snapshot.size} token(s) trouvé(s) pour ${notificationId}`);
                }
              } catch (error) {
                console.error('Erreur lors de la vérification des tokens:', error);
              }
            };
            
            checkNotificationToken();
          })
          .catch(error => {
            console.error(`Erreur lors de la vérification des permissions pour ${consultant}:`, error);
            setConsultantPermissionStatus('default');
          });
      } else {
        setConsultantPermissionStatus('default');
      }
    }
  }, [user?.email, consultant]); // Réexécuter quand le consultant change

  // Demander la permission pour les notifications
  const handleRequestPermission = async () => {
    if (!notificationId) {
      console.error('Utilisateur non connecté ou consultant non spécifié');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Demande de permission pour les notifications pour: ${notificationId}`);
      
      // Même si les notifications sont déjà activées, on permet de les réactiver
      // Cela permet de renouveler le token FCM si nécessaire
      const result = await requestNotificationPermission(notificationId);
      
      if (result === true) {
        setPermissionStatus('granted');
        setConsultantPermissionStatus('granted');
        console.log(`Notifications activées pour: ${notificationId}`);
      } else {
        setPermissionStatus('denied');
        setConsultantPermissionStatus('default');
        console.error(`Échec de l'activation des notifications pour: ${notificationId}`);
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
    } finally {
      setLoading(false);
    }
  };

  // Si on est côté serveur ou si les notifications ne sont pas supportées
  if (permissionStatus === 'server-side' || permissionStatus === 'not-supported') {
    return null;
  }

  // Déterminer le statut de notification pour les styles et tooltip
  const getStatusInfo = () => {
    // Le message à afficher dépend de si un consultant est sélectionné
    const tooltipMessage = consultant 
      ? `Notifications pour ${consultant}`
      : "Notifications";
    
    // Priorité au statut du consultant spécifique
    if (consultantPermissionStatus === 'granted') {
      return {
        icon: <BellRing className={`h-5 w-5 ${iconOnly ? 'text-green-500' : ''}`} />,
        text: 'Notifications activées',
        tooltip: `${tooltipMessage} activées (cliquez pour réactiver)`,
        variant: 'ghost' as const,
        onClick: handleRequestPermission, // Permettre la réactivation
        disabled: false,
        className: iconOnly ? 'text-green-500' : 'text-green-600'
      };
    } else if (consultantPermissionStatus === 'missing') {
      return {
        icon: <Bell className={`h-5 w-5 ${iconOnly ? 'text-yellow-500' : ''} animate-pulse`} />,
        text: 'Réactivation nécessaire',
        tooltip: `Aucun token trouvé pour ${consultant} - Cliquez pour réactiver`,
        variant: 'ghost' as const,
        onClick: handleRequestPermission,
        disabled: false,
        className: iconOnly ? 'text-yellow-500' : 'text-yellow-600'
      };
    } else if (permissionStatus === 'denied') {
      return {
        icon: <BellOff className={`h-5 w-5 ${iconOnly ? 'text-red-500' : ''}`} />,
        text: 'Notifications bloquées',
        tooltip: 'Notifications bloquées - Cliquez pour ouvrir les paramètres',
        variant: 'ghost' as const,
        onClick: () => window.open('chrome://settings/content/notifications', '_blank'),
        disabled: false,
        className: iconOnly ? 'text-red-500' : 'text-red-600'
      };
    } else {
      return {
        icon: <Bell className={`h-5 w-5 ${loading ? 'animate-ping' : ''}`} />,
        text: loading ? 'Activation...' : 'Activer',
        tooltip: `Activer les ${tooltipMessage.toLowerCase()}`,
        variant: 'ghost' as const,
        onClick: handleRequestPermission,
        disabled: loading || !notificationId,
        className: loading ? 'animate-pulse' : ''
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={statusInfo.variant}
            size="icon"
            className={`${className} ${statusInfo.className}`}
            onClick={statusInfo.onClick}
            disabled={statusInfo.disabled}
          >
            {statusInfo.icon}
            {!iconOnly && <span className="ml-2">{statusInfo.text}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusInfo.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 