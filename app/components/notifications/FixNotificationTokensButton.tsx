import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { updateNotificationTokensForConsultant } from '@/app/services/notificationService';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FixNotificationTokensButtonProps {
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  email?: string;
  consultant?: string;
  onSuccess?: () => void;
}

export default function FixNotificationTokensButton({ 
  className = '', 
  showText = true,
  variant = 'outline',
  size = 'sm',
  email,
  consultant,
  onSuccess 
}: FixNotificationTokensButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFixTokens = async () => {
    const userEmail = email || user?.email;
    
    if (!userEmail) {
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
      // Appeler la fonction pour mettre à jour les tokens
      const updatedCount = await updateNotificationTokensForConsultant(userEmail, consultant || '');
      
      toast({
        title: "Tokens corrigés",
        description: `${updatedCount} token(s) ont été mis à jour.`,
        variant: "default",
      });
      setStatus('success');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erreur lors de la correction des tokens:', error);
      toast({
        title: "Erreur",
        description: "Impossible de corriger les tokens de notification.",
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

  // Icône en fonction du statut
  const IconComponent = isLoading ? Loader2 : 
                       status === 'success' ? CheckCircle : 
                       status === 'error' ? AlertCircle : 
                       Wrench;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleFixTokens}
            disabled={isLoading}
          >
            <IconComponent className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''} ${status === 'success' ? 'text-green-500' : ''} ${status === 'error' ? 'text-red-500' : ''} mr-2`} />
            {showText && (
              <span>Corriger les tokens</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Corriger les tokens de notification {consultant ? `pour ${consultant}` : ''}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 