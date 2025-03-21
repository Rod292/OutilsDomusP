'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { requestNotificationPermission, checkConsultantPermission } from '@/app/services/notificationService';
import { useAuth } from '@/app/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getFirestore } from 'firebase/firestore';
import { query, collection, getDocs, where } from 'firebase/firestore';

interface GlobalNotificationButtonProps {
  consultantName: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
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

  // Vérifier si des tokens existent pour cet utilisateur
  useEffect(() => {
    const checkNotificationToken = async () => {
      if (user?.email && consultantName) {
        try {
          const db = getFirestore();
          if (!db) return;
          
          const notificationId = `${user.email}_${consultantName}`;
          const q = query(
            collection(db, 'notificationTokens'),
            where('userId', '==', notificationId)
          );
          
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            console.log(`Aucun token trouvé pour ${notificationId}, affichage d'un indicateur d'erreur`);
            setPermissionStatus(snapshot.empty ? 'missing' : permissionStatus);
          } else {
            console.log(`${snapshot.size} token(s) trouvé(s) pour ${notificationId}`);
          }
        } catch (error) {
          console.error('Erreur lors de la vérification des tokens:', error);
        }
      }
    };
    
    checkNotificationToken();
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
  } else if (permissionStatus === 'missing') {
    icon = <Bell className="h-5 w-5 text-yellow-500" />;
    tooltipText = `Aucun token trouvé pour ${consultantName} - Cliquez pour activer`;
    buttonClass += ' text-yellow-500 animate-pulse';
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
            <span className="sr-only">Notifications</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 