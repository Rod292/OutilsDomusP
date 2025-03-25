'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, CheckCircle, Mail, LogOut, Upload, 
  PlusCircle, RefreshCw, Send, Pause, Play, Users, Loader2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { GMAIL_CONFIG } from '@/lib/gmail-config';

const { CLIENT_ID, SCOPES } = GMAIL_CONFIG;

// Taille des micro-lots
const MICRO_BATCH_SIZE = 3;
// Délai entre les micro-lots (en millisecondes)
const BATCH_DELAY = 1000;

type GmailSenderProps = {
  newsletterHtml: string;
  recipients?: Array<{ email: string; name: string; company?: string }>;
  subject: string;
  senderName?: string;
  onComplete: (results: { success: number; failed: number }) => void;
  disabled?: boolean;
  campaignId?: string;
};

type Recipient = {
  email: string;
  name: string;
  company?: string;
};

type BatchStatus = {
  batchNumber: number;
  totalBatches: number;
  successCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors?: string[];
};

export default function GmailSenderClient({ newsletterHtml, recipients = [], subject, senderName, onComplete, disabled = false, campaignId }: GmailSenderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState({ success: 0, failed: 0 });
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // États pour la gestion des destinataires
  const [inputMethod, setInputMethod] = useState<'csv' | 'manual'>('manual');
  const [allRecipients, setAllRecipients] = useState<Recipient[]>(recipients);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [csvPreview, setCsvPreview] = useState<Recipient[]>([]);
  const [testMode, setTestMode] = useState(false);
  
  // Configuration de react-dropzone pour les fichiers CSV
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv']
    },
    onDrop: async (acceptedFiles) => {
      try {
        const file = acceptedFiles[0];
        if (!file) {
          setError('Aucun fichier CSV sélectionné');
          return;
        }

        const text = await file.text();
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            const parsedRecipients = results.data
              .filter((row: any) => row.email && row.email.trim() !== '')
              .map((row: any) => ({
                email: row.email.trim(),
                name: (row.name || '').trim(),
                company: (row.company || '').trim()
              }));

            if (parsedRecipients.length === 0) {
              setError('Aucun destinataire valide trouvé dans le fichier CSV');
              return;
            }

            setAllRecipients(parsedRecipients);
            setCsvPreview(parsedRecipients.slice(0, 5));
            toast.success(`${parsedRecipients.length} destinataires chargés avec succès`);
          },
          error: (error: { message: string }) => {
            setError(`Erreur lors de la lecture du fichier CSV: ${error.message}`);
          }
        });
      } catch (error) {
        setError('Erreur lors du traitement du fichier');
      }
    }
  });

  // Vérifier le statut d'authentification au chargement
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/gmail-auth');
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut d\'authentification:', error);
      }
    };

    checkAuthStatus();
  }, []);
  
  // Initialiser les destinataires à partir des props
  useEffect(() => {
    if (recipients && recipients.length > 0) {
      setAllRecipients(recipients);
      setCsvPreview(recipients.slice(0, 5));
    }
  }, [recipients]);

  // Démarrer le processus d'authentification OAuth
  const startOAuthFlow = async () => {
    try {
      setAuthError('');
      setAuthenticating(true);
      const response = await fetch('/api/gmail/auth-url');
      const data = await response.json();
      
      if (data.url) {
        // Ouvrir la fenêtre d'authentification
        const authWindow = window.open(data.url, 'gmailAuth', 'width=500,height=600');
        
        // Surveiller le changement d'URL de la fenêtre popupGmail
        const checkPopup = setInterval(() => {
          try {
            // Vérifier si la fenêtre existe et est fermée
            if (!authWindow || authWindow.closed) {
              clearInterval(checkPopup);
              verifyAuthStatus();
              return;
            }
            
            // Vérifier l'URL actuelle
            const currentUrl = authWindow?.location.href;
            
            // Si l'URL contient 'code=', l'authentification est terminée
            if (currentUrl && currentUrl.includes('/api/gmail/callback')) {
              authWindow.close();
              clearInterval(checkPopup);
              
              // Attendre un peu avant de vérifier le statut pour laisser le temps au serveur de traiter
              setTimeout(() => {
                verifyAuthStatus();
              }, 1500);
            }
          } catch (e) {
            // Une erreur peut se produire lors de la tentative d'accès à la propriété location
            // d'une fenêtre cross-origin, ce qui est normal pendant OAuth
            console.log("Attente de la fin du processus d'authentification...");
          }
        }, 500);
      } else {
        setAuthenticating(false);
        setAuthError("Impossible d'obtenir l'URL d'authentification");
      }
    } catch (error) {
      console.error('Erreur lors du démarrage du flux OAuth:', error);
      setAuthenticating(false);
      setAuthError("Erreur lors de l'authentification");
    }
  };

  // Vérifier l'état d'authentification après le retour OAuth
  const verifyAuthStatus = async () => {
    try {
      // Rafraîchir la vérification d'authentification
      setAuthenticating(true);
      
      // Laisser un délai pour que le token puisse être traité côté serveur
      setTimeout(async () => {
        const response = await fetch('/api/gmail/check-auth');
        const data = await response.json();
        
        if (data.authenticated) {
          setAuthenticating(false);
          setAuthError('');
          setIsAuthenticated(true);
          toast.success('Authentification Gmail réussie !');
        } else {
          setAuthenticating(false);
          setAuthError(data.error || "L'authentification a échoué");
          setIsAuthenticated(false);
          toast.error("L'authentification Gmail a échoué");
        }
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la vérification du statut d\'authentification:', error);
      setAuthenticating(false);
      setAuthError("Erreur lors de la vérification de l'authentification");
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/gmail-auth', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setIsAuthenticated(false);
        toast.success("Déconnecté de Gmail avec succès");
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  const handleAddRecipient = () => {
    if (!manualEmail || !manualName) {
      toast.error("L'email et le nom sont requis");
      return;
    }

    if (!manualEmail.includes('@')) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    const newRecipient: Recipient = {
      email: manualEmail,
      name: manualName,
      company: manualCompany || undefined
    };

    setAllRecipients([...allRecipients, newRecipient]);
    setCsvPreview([...csvPreview, newRecipient].slice(-5));
    
    // Réinitialiser les champs
    setManualEmail('');
    setManualName('');
    setManualCompany('');
    
    toast.success("Destinataire ajouté avec succès");
  };
  
  const handleRemoveRecipient = (index: number) => {
    const updatedRecipients = [...allRecipients];
    updatedRecipients.splice(index, 1);
    setAllRecipients(updatedRecipients);
    setCsvPreview(updatedRecipients.slice(-5));
    
    toast.success("Destinataire supprimé");
  };

  const sendEmails = async () => {
    if (!isAuthenticated) {
      toast.error('Vous devez vous authentifier à Gmail');
      return;
    }
    
    if (allRecipients.length === 0) {
      toast.error('Vous devez ajouter au moins un destinataire');
      return;
    }
    
    // En mode test, n'envoyer qu'au premier destinataire
    const recipientsToSend = testMode ? [allRecipients[0]] : allRecipients;

    setIsSending(true);
    setProgress(0);
    setStatus('Préparation de l\'envoi...');
    setError('');

    try {
      const consultant = senderName ? { 
        nom: senderName,
        fonction: '',
        email: '',
        telephone: ''
      } : undefined;

      const requestData = {
        recipients: recipientsToSend,
        subject: subject,
        html: newsletterHtml,
        consultant: consultant,
        baseUrl: window.location.origin,
      };
      
      const response = await fetch('/api/send-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const successMsg = `Envoi terminé: ${data.sent} réussis, ${data.failed} échoués`;
        setStatus(successMsg);
        const finalResults = { success: data.sent, failed: data.failed };
        setResults(finalResults);
        onComplete(finalResults);
        toast.success(successMsg);
      } else {
        const errorMsg = data.error || 'Erreur lors de l\'envoi des emails';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi:', error);
      const errorMsg = `Erreur lors de l'envoi: ${error.message || 'Erreur inconnue'}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  // Fonction pour réinitialiser l'authentification Gmail
  const resetAuth = () => {
    setIsAuthenticated(false);
    setAuthError('');
    setAuthenticating(false);
    // Appeler l'API pour révoquer l'accès ou supprimer les tokens localement
    fetch('/api/gmail/logout', { method: 'POST' })
      .then(() => {
        toast.success('Déconnecté de Gmail');
      })
      .catch(error => {
        console.error('Erreur lors de la déconnexion:', error);
      });
  };

  // Vérifier l'authentification si nécessaire
  useEffect(() => {
    fetch('/api/gmail/check-auth')
      .then(response => response.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch(error => {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      });
  }, []);
  
  // UI pour les boutons
  const renderAuthButtons = () => {
    if (isAuthenticated) {
      return (
        <>
          <Button
            className="w-full"
            onClick={sendEmails}
            disabled={isSending || allRecipients.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            Envoyer {allRecipients.length} email{allRecipients.length > 1 ? 's' : ''}
          </Button>
          <Button
            className="w-full mt-2"
            variant="outline"
            onClick={resetAuth}
          >
            Déconnecter Gmail
          </Button>
        </>
      );
    }

    return (
      <Button
        className="w-full"
        onClick={startOAuthFlow}
        disabled={authenticating}
      >
        {authenticating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Authentification en cours...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Se connecter à Gmail
          </>
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {!isAuthenticated ? (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Authentification requise</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Pour envoyer des emails, vous devez vous connecter à votre compte Gmail.
                </p>
              </div>
            </div>
          </div>
          
          {renderAuthButtons()}
          
          {authError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur d'authentification</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Connecté à Gmail
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5 mr-1" />
              )}
              Déconnexion
            </Button>
          </div>
          
          {/* Onglets pour choisir le mode d'ajout des destinataires */}
          <Tabs defaultValue={inputMethod} value={inputMethod} onValueChange={(value) => setInputMethod(value as 'csv' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
              <TabsTrigger value="csv">Importer CSV</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient-name">Nom</Label>
                  <Input
                    id="recipient-name"
                    placeholder="Nom du destinataire"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recipient-company">Entreprise (optionnel)</Label>
                  <Input
                    id="recipient-company"
                    placeholder="Entreprise du destinataire"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipient-email">Email</Label>
                <div className="flex space-x-2">
                  <Input
                    id="recipient-email"
                    placeholder="Email du destinataire"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddRecipient}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="csv" className="mt-4">
              <div 
                {...getRootProps()} 
                className={`border-2 ${isDragActive ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' : 'border-dashed border-gray-300 dark:border-gray-600'} rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  Déposez votre fichier CSV ici ou cliquez pour parcourir
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Format attendu: colonnes "email", "name" et optionnellement "company"
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Affichage des destinataires */}
          {allRecipients.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-1.5" /> 
                  Destinataires ({allRecipients.length})
                </h3>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestMode(!testMode)}
                  >
                    {testMode ? "Mode normal" : "Mode test"}
                  </Button>
                </div>
              </div>
              
              {testMode && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Mode test</AlertTitle>
                  <AlertDescription>
                    En mode test, l'email sera envoyé uniquement au premier destinataire : {allRecipients[0]?.name} ({allRecipients[0]?.email}).
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.map((recipient, index) => (
                      <TableRow key={index}>
                        <TableCell>{recipient.name || '-'}</TableCell>
                        <TableCell>{recipient.email}</TableCell>
                        <TableCell>{recipient.company || '-'}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRecipient(index)}
                          >
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allRecipients.length > 5 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-gray-500 dark:text-gray-400">
                          ... et {allRecipients.length - 5} autres destinataires
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {/* Bouton d'envoi */}
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {status && !error && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Statut</AlertTitle>
                <AlertDescription>{status}</AlertDescription>
              </Alert>
            )}
            
            {isSending && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Envoi en cours...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            
            {renderAuthButtons()}
          </div>
        </div>
      )}
    </div>
  );
} 