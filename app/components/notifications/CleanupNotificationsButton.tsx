import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { cleanupDuplicateTokens } from '@/app/services/notificationService';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CleanupNotificationsButtonProps {
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onSuccess?: () => void;
}

export default function CleanupNotificationsButton({ 
  className = '', 
  showText = true,
  variant = 'outline',
  size = 'sm',
  onSuccess 
}: CleanupNotificationsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCleanup = async () => {
    if (!user?.email) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour effectuer cette action.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      const deletedCount = await cleanupDuplicateTokens(user.email);
      
      if (deletedCount > 0) {
        toast({
          title: "Nettoyage terminé",
          description: `${deletedCount} notification${deletedCount > 1 ? 's' : ''} dupliquée${deletedCount > 1 ? 's' : ''} supprimée${deletedCount > 1 ? 's' : ''}.`,
          variant: "default",
        });
        setStatus('success');
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Aucun doublon trouvé",
          description: "Tous vos appareils sont correctement enregistrés.",
          variant: "default",
        });
        setStatus('success');
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des tokens:', error);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer les notifications.",
        variant: "destructive",
      });
      setStatus('error');
    } finally {
      setIsLoading(false);
      
      // Réinitialiser le statut après 5 secondes
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    }
  };

  // Choisir l'icône en fonction du statut
  const getIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Eraser className="h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleCleanup}
            disabled={isLoading}
            className={`${className} ${showText ? '' : 'p-2'}`}
          >
            {getIcon()}
            {showText && <span className="ml-2">Nettoyer les doublons</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === 'success' 
              ? 'Nettoyage effectué avec succès' 
              : status === 'error' 
                ? 'Erreur lors du nettoyage' 
                : 'Supprime les appareils en double pour éviter les notifications multiples'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 