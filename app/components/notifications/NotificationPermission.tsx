import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { toast } from '../../../components/ui/use-toast';
import { 
  areNotificationsSupported, 
  checkNotificationPermission,
  requestNotificationPermission,
  saveNotificationToken
} from '../../services/notificationService';
import { getAuth } from 'firebase/auth';

interface NotificationPermissionProps {
  email?: string;
  consultant?: string;
  onPermissionChange?: (status: NotificationPermission | 'unsupported') => void;
}

export function NotificationPermission({ 
  email, 
  consultant, 
  onPermissionChange 
}: NotificationPermissionProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier le support des notifications et la permission actuelle
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await areNotificationsSupported();
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = checkNotificationPermission();
        setPermissionStatus(currentPermission);
        onPermissionChange?.(currentPermission);
      } else {
        setPermissionStatus('unsupported');
        onPermissionChange?.('unsupported');
      }
    };

    checkSupport();
  }, [onPermissionChange]);

  // Demander la permission et enregistrer le token
  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const { status, token } = await requestNotificationPermission();
      setPermissionStatus(status);
      onPermissionChange?.(status);

      if (status === 'granted' && token && email) {
        const saved = await saveNotificationToken(token, email, consultant);
        if (saved) {
          toast({
            title: 'Notifications activées',
            description: 'Vous recevrez désormais des notifications sur cet appareil.',
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'activer les notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground">
        Les notifications ne sont pas supportées sur ce navigateur.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h4 className="font-medium">Notifications</h4>
          <p className="text-sm text-muted-foreground">
            {permissionStatus === 'granted' 
              ? 'Les notifications sont activées sur cet appareil.'
              : 'Activez les notifications pour être informé des nouvelles tâches.'}
          </p>
        </div>
        {permissionStatus !== 'granted' && (
          <Button 
            onClick={handleRequestPermission}
            disabled={isLoading || permissionStatus === 'denied'}
          >
            {isLoading ? 'Activation...' : 'Activer'}
          </Button>
        )}
      </div>
      
      {permissionStatus === 'denied' && (
        <div className="text-sm text-yellow-600 dark:text-yellow-500">
          Les notifications ont été bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.
        </div>
      )}
    </div>
  );
} 