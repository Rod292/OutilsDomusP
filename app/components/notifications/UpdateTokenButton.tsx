import { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from '../../../components/ui/use-toast';
import { requestNotificationPermissionAndToken } from '../../services/firebase';
import { saveNotificationToken } from '../../services/notificationService';

interface UpdateTokenButtonProps {
  email?: string;
  consultant?: string;
}

export function UpdateTokenButton({ email, consultant }: UpdateTokenButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateToken = async () => {
    if (!email) {
      toast({
        title: 'Erreur',
        description: 'Email requis pour mettre à jour le token',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const token = await requestNotificationPermissionAndToken();
      if (token) {
        const saved = await saveNotificationToken(token, email, consultant);
        if (saved) {
          toast({
            title: 'Token mis à jour',
            description: 'Le token de notification a été mis à jour avec succès.',
          });
        } else {
          throw new Error('Échec de la sauvegarde du token');
        }
      } else {
        throw new Error('Impossible d\'obtenir un nouveau token');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du token:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le token de notification.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleUpdateToken}
      disabled={isUpdating || !email}
    >
      {isUpdating ? 'Mise à jour...' : 'Forcer la mise à jour du token'}
    </Button>
  );
} 