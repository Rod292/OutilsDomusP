'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, SendHorizontal, Check } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';

interface SendTestNotificationButtonProps {
  email?: string;
  consultant?: string;
  className?: string;
}

export default function SendTestNotificationButton({ 
  email, 
  consultant, 
  className 
}: SendTestNotificationButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [title, setTitle] = useState('🔔 Test de notification');
  const [body, setBody] = useState('');
  const [manualToken, setManualToken] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Si l'email n'est pas fourni, utiliser celui de l'utilisateur connecté
  const recipientEmail = email || user?.email || '';

  // Préparer le message du corps de la notification
  const getDefaultBody = () => {
    const timestamp = new Date().toLocaleTimeString();
    let message = `Test envoyé à ${timestamp}`;
    
    if (consultant) {
      message = `Test envoyé à ${consultant} (${timestamp})`;
    }
    
    return message;
  };

  // Réinitialiser le formulaire à l'ouverture
  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setBody(getDefaultBody());
      setSuccess(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      setSuccess(false);
      
      // Validation
      if (!title.trim()) {
        toast({
          title: "Erreur",
          description: "Veuillez saisir un titre",
          variant: "destructive",
        });
        return;
      }
      
      if (!body.trim()) {
        toast({
          title: "Erreur",
          description: "Veuillez saisir un message",
          variant: "destructive",
        });
        return;
      }

      let response;
      
      if (manualToken) {
        // Envoyer la notification directement au token spécifié
        response = await fetch('/api/notifications/send-to-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: manualToken,
            title,
            body,
            data: {
              timestamp: Date.now(),
              type: 'test'
            }
          }),
        });
      } else {
        // Envoyer la notification via le système standard
        const userId = consultant 
          ? `${recipientEmail}_${consultant}` 
          : recipientEmail;
        
        response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            title,
            body,
            type: 'system',
            taskId: `test_${Date.now()}`
          }),
        });
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Succès",
          description: "Notification envoyée",
        });
        setSuccess(true);
      } else {
        let errorMessage = "Échec de l'envoi";
        
        if (result.error) {
          errorMessage = result.error;
        } else if (result.total === 0) {
          errorMessage = "Aucun appareil trouvé pour recevoir la notification";
        }
        
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de test:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          Tester les notifications
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Envoyer une notification de test</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipient" className="text-right">
              Destinataire
            </Label>
            <div className="col-span-3">
              <Input
                id="recipient"
                value={consultant ? `${recipientEmail} (${consultant})` : recipientEmail}
                disabled
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Titre
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="body" className="text-right">
              Message
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="token" className="text-right">
              Token (optionnel)
            </Label>
            <Input
              id="token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Token FCM spécifique (facultatif)"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={sendTestNotification} 
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</>
            ) : success ? (
              <><Check className="mr-2 h-4 w-4" /> Envoyé</>
            ) : (
              <><SendHorizontal className="mr-2 h-4 w-4" /> Envoyer</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 