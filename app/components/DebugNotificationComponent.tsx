'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../hooks/useAuth';
import { debugUserTokens, sendTestNotificationToToken } from '../services/notificationService';
import { ClipboardCopy, CheckCircle, AlertCircle, SendHorizontal, Search, RefreshCw } from 'lucide-react';

export default function DebugNotificationComponent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [consultant, setConsultant] = useState('');
  const [tokens, setTokens] = useState<any>({ specificTokensCount: 0, emailTokensCount: 0 });
  const [tokensList, setTokensList] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState('');

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleDebugTokens = async () => {
    if (!email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une adresse e-mail',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Démarrage du débogage...");
      const result = await debugUserTokens(email, consultant || undefined);
      setTokens(result || { specificTokensCount: 0, emailTokensCount: 0 });
      
      // Récupérer les tokens depuis la console
      const consoleOutput = (window as any).consoleOutput || [];
      const tokenEntries = consoleOutput
        .filter((entry: any) => entry.type === 'log' && entry.message.includes('Token:'))
        .map((entry: any) => {
          const tokenLine = entry.message;
          const nextLines = consoleOutput
            .slice(consoleOutput.indexOf(entry) + 1, consoleOutput.indexOf(entry) + 6)
            .filter((e: any) => e.type === 'log')
            .map((e: any) => e.message);
          
          const tokenInfo = {
            token: tokenLine.includes('Token:') ? tokenLine.split('Token:')[1].trim() : '',
            userId: nextLines.find((line: string) => line.includes('UserId:'))?.split('UserId:')[1]?.trim() || '',
            platform: nextLines.find((line: string) => line.includes('Platform:'))?.split('Platform:')[1]?.trim() || '',
            userAgent: nextLines.find((line: string) => line.includes('UserAgent:'))?.split('UserAgent:')[1]?.trim() || '',
            timestamp: nextLines.find((line: string) => line.includes('Timestamp:'))?.split('Timestamp:')[1]?.trim() || '',
          };
          
          return tokenInfo;
        });
      
      setTokensList(tokenEntries);
      
      toast({
        title: 'Débogage terminé',
        description: `${result?.specificTokensCount || 0} token(s) spécifique(s), ${result?.emailTokensCount || 0} token(s) par email`,
      });
    } catch (error) {
      console.error('Erreur lors du débogage:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du débogage',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!selectedToken) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un token',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await sendTestNotificationToToken(selectedToken);
      
      if (result.success) {
        toast({
          title: 'Notification envoyée',
          description: `Test envoyé avec succès (ID: ${result.messageId})`,
        });
      } else {
        toast({
          title: 'Échec',
          description: result.error || 'Échec de l\'envoi de la notification',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du test:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi du test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié',
      description: 'Texte copié dans le presse-papiers',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Débogage des notifications</CardTitle>
        <CardDescription>
          Vérifiez les tokens de notification et testez l'envoi de notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tokens" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tokens">Recherche de tokens</TabsTrigger>
            <TabsTrigger value="test">Test d'envoi</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tokens" className="space-y-4">
            <div className="flex flex-col space-y-3 mt-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-grow"
                />
                <Input
                  placeholder="Consultant (optionnel)"
                  value={consultant}
                  onChange={(e) => setConsultant(e.target.value)}
                />
                <Button 
                  onClick={handleDebugTokens}
                  disabled={loading || !email}
                  className="min-w-20"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  {loading ? '' : 'Chercher'}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-muted p-2 rounded">
                  <span className="text-sm font-medium">Tokens spécifiques:</span>
                  <Badge variant="outline" className="ml-2">{tokens.specificTokensCount || 0}</Badge>
                </div>
                <div className="bg-muted p-2 rounded">
                  <span className="text-sm font-medium">Tokens par email:</span>
                  <Badge variant="outline" className="ml-2">{tokens.emailTokensCount || 0}</Badge>
                </div>
              </div>
              
              {tokensList.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Tokens trouvés:</h4>
                  <div className="bg-muted rounded-md p-2 max-h-60 overflow-y-auto">
                    {tokensList.map((token, index) => (
                      <div 
                        key={index} 
                        className="p-2 border-b border-border last:border-0 cursor-pointer hover:bg-accent"
                        onClick={() => setSelectedToken(token.token)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Badge 
                              variant={selectedToken === token.token ? "default" : "outline"}
                              className="mr-2"
                            >
                              Token {index + 1}
                            </Badge>
                            <span className="text-xs truncate max-w-[150px]">{token.token.substring(0, 15)}...</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(token.token);
                            }}
                          >
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {token.platform && <div>Platform: {token.platform}</div>}
                          {token.userId && <div>UserId: {token.userId}</div>}
                          {token.timestamp && <div>Date: {token.timestamp}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="test" className="space-y-4">
            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Token FCM"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="flex-grow"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(selectedToken)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSendTestNotification}
                  disabled={loading || !selectedToken}
                  className="w-full"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <SendHorizontal className="h-4 w-4 mr-2" />}
                  {loading ? 'Envoi en cours...' : 'Envoyer une notification de test'}
                </Button>
              </div>
              
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-medium">Informations importantes</h3>
                </div>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  <li>La notification doit être activée sur l'appareil cible</li>
                  <li>Si le token est expiré ou invalide, le test échouera</li>
                  <li>Pour les appareils Apple, l'application doit être ouverte récemment ou en arrière-plan</li>
                  <li>Pour les appareils Android, les notifications fonctionnent même si l'app est fermée</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {tokens.specificTokensCount > 0 || tokens.emailTokensCount > 0 ? 
            `${tokens.specificTokensCount + tokens.emailTokensCount} token(s) trouvé(s)` : 
            'Aucun token trouvé'}
        </div>
      </CardFooter>
    </Card>
  );
} 