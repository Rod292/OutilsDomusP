'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, Alert, Box, Typography, CircularProgress, Link, Tooltip,
  LinearProgress, Chip, Divider, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText
} from '@mui/material';
import { GMAIL_CONFIG } from './gmail-config';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const { CLIENT_ID, SCOPES } = GMAIL_CONFIG;

// Taille des micro-lots
const MICRO_BATCH_SIZE = 3;
// Délai entre les micro-lots (en millisecondes)
const BATCH_DELAY = 3000;

// Ajouter le log de débogage
console.log('Configuration Gmail:', {
  clientIdExists: !!CLIENT_ID,
  clientIdPrefix: CLIENT_ID ? CLIENT_ID.substring(0, 10) + '...' : 'non défini',
  envVarExists: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
});

type GmailSenderProps = {
  newsletterHtml: string;
  recipients: Array<{ email: string; name: string; company?: string }>;
  subject: string;
  senderName?: string;
  onComplete: (results: { success: number; failed: number }) => void;
  disabled?: boolean;
  campaignId?: string;
};

type BatchStatus = {
  batchNumber: number;
  totalBatches: number;
  successCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors?: string[];
};

export default function GmailSenderClient({ newsletterHtml, recipients, subject, senderName, onComplete, disabled = false, campaignId }: GmailSenderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState({ success: 0, failed: 0 });
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // États pour les micro-lots
  const [microBatches, setMicroBatches] = useState<Array<Array<{ email: string; name: string; company?: string }>>>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchStatuses, setBatchStatuses] = useState<BatchStatus[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [totalResults, setTotalResults] = useState({ success: 0, failed: 0 });

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

  // Préparer les micro-lots lorsque les destinataires changent
  useEffect(() => {
    if (recipients.length > 0) {
      const batches = [];
      for (let i = 0; i < recipients.length; i += MICRO_BATCH_SIZE) {
        batches.push(recipients.slice(i, i + MICRO_BATCH_SIZE));
      }
      
      setMicroBatches(batches);
      
      // Initialiser les statuts des lots
      const statuses: BatchStatus[] = batches.map((_, index) => ({
        batchNumber: index + 1,
        totalBatches: batches.length,
        successCount: 0,
        failedCount: 0,
        status: 'pending'
      }));
      
      setBatchStatuses(statuses);
      setCurrentBatchIndex(0);
      setTotalResults({ success: 0, failed: 0 });
    }
  }, [recipients]);

  // Fonction pour générer l'URL d'authentification OAuth
  const handleAuthenticate = () => {
    setAuthError('');
    setAuthenticating(true);
    
    try {
      // Construire l'URL de redirection basée sur l'origine actuelle
      const origin = window.location.origin;
      const redirectUri = `${origin}/newsletter/oauth-redirect`;
      
      // Logs de débogage détaillés
      console.log('Détails de l\'authentification:', {
        origin,
        redirectUri,
        clientId: CLIENT_ID,
        scopes: SCOPES,
        windowLocation: window.location.href
      });
      
      // Construire l'URL d'authentification Google
      const scope = encodeURIComponent(SCOPES);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `access_type=offline&` +
        `prompt=consent`;  // Forcer le consentement à chaque fois
      
      console.log('Configuration détaillée:', {
        clientId: CLIENT_ID,
        redirectUri,
        scope: SCOPES,
        fullAuthUrl: authUrl,
        origin: window.location.origin,
        currentUrl: window.location.href
      });
      
      // Ouvrir la fenêtre d'authentification
      const authWindow = window.open(authUrl, 'oauth', 'width=600,height=600');
      
      if (!authWindow) {
        setAuthError('Impossible d\'ouvrir la fenêtre d\'authentification. Veuillez vérifier que les popups sont autorisés.');
        setAuthenticating(false);
        return;
      }
      
      // Fonction pour écouter les messages de la fenêtre de redirection
      const messageHandler = (event: MessageEvent) => {
        console.log('Message reçu de la popup:', event.origin, event.data);
        
        // Vérifier que le message vient de notre domaine
        if (event.origin !== window.location.origin) {
          console.log('Message ignoré (origine non reconnue)');
          return;
        }
        
        if (event.data.code) {
          // On peut essayer de fermer la fenêtre popup maintenant
          try {
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
          } catch (err) {
            console.warn('Impossible de fermer la fenêtre popup:', err);
          }
          
          // Récupérer le code d'autorisation et l'échanger contre un token
          const code = event.data.code;
          
          (async () => {
            try {
              console.log('Code d\'autorisation reçu, échange contre un token');
              const response = await fetch('/api/gmail-auth', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
              });
              
              console.log('Réponse de l\'API:', response.status);
              
              const data = await response.json();
              console.log('Données de réponse:', data);
              
              if (!response.ok) {
                const errorMessage = data.error || 'Échec de l\'authentification';
                console.error('Détails de l\'erreur:', data);
                if (data.details) {
                  console.error('Détails supplémentaires:', data.details);
                }
                setAuthError(errorMessage);
                setAuthenticating(false);
                return;
              }
              
              if (data.success) {
                setIsAuthenticated(true);
                setAuthError('');
              } else {
                setAuthError(`Erreur d'authentification: ${data.error || 'Échec de l\'authentification'}`);
                console.error('Détails de l\'erreur:', data);
              }
              setAuthenticating(false);
            } catch (error: any) {
              console.error('Erreur lors de l\'authentification:', error);
              setAuthError(`Erreur lors de l'authentification: ${error.message || 'Erreur inconnue'}`);
              setAuthenticating(false);
            }
          })();
        } else if (event.data.error) {
          console.error('Erreur renvoyée par la popup:', event.data.error);
          setAuthError(`Erreur d'authentification: ${event.data.error}`);
          setAuthenticating(false);
        }
      };
      
      // Ajouter l'écouteur de messages
      window.addEventListener('message', messageHandler);
      
      // Configurer un nettoyage de l'écouteur après un certain temps
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        // Si on arrive à ce timeout, c'est que l'authentification a probablement échoué
        if (!isAuthenticated) {
          setAuthError('Délai d\'authentification dépassé. Veuillez réessayer.');
          setAuthenticating(false);
        }
      }, 300000); // 5 minutes
    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
      setAuthError(`Erreur: ${error.message || 'Erreur inconnue'}`);
      setAuthenticating(false);
    }
  };

  // Fonction pour envoyer un micro-lot d'emails
  const sendMicroBatch = useCallback(async (batchIndex: number) => {
    if (batchIndex >= microBatches.length || !isAuthenticated || isPaused) {
      return;
    }

    // Mettre à jour le statut du lot en cours
    setBatchStatuses(current => {
      const updated = [...current];
      updated[batchIndex] = {
        ...updated[batchIndex],
        status: 'processing'
      };
      return updated;
    });

    // Calculer et mettre à jour la progression globale
    const progressPercent = (batchIndex / microBatches.length) * 100;
    setProgress(progressPercent);
    setStatus(`Traitement du lot ${batchIndex + 1}/${microBatches.length}`);

    try {
      console.log(`Envoi du micro-lot ${batchIndex + 1}/${microBatches.length}`);
      
      // Préparer les données pour ce micro-lot
      const batchRecipients = microBatches[batchIndex];
      
      // Préparation des données pour la requête
      const consultant = senderName ? { 
        nom: senderName,
        fonction: '',
        email: '',
        telephone: ''
      } : undefined;

      const requestData = {
        recipients: batchRecipients,
        subject: subject,
        html: newsletterHtml,
        consultant: consultant,
        baseUrl: window.location.origin,
        campaignId: campaignId
      };
      
      // Envoyer la requête pour ce micro-lot
      const response = await fetch('/api/send-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // Vérifier si la réponse est du JSON valide
      let data;
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Erreur de parsing JSON:', jsonError);
        
        // Si l'erreur contient "An error occurred", c'est probablement un problème d'authentification Gmail
        const responseText = await response.text();
        console.log('Texte de réponse:', responseText);
        
        if (responseText.includes('An error occurred') || responseText.includes('token')) {
          setError('Session Gmail expirée. Veuillez vous déconnecter et vous reconnecter à Gmail.');
          
          // Mettre à jour le statut du lot en cours
          setBatchStatuses(current => {
            const updated = [...current];
            updated[batchIndex] = {
              ...updated[batchIndex],
              status: 'failed',
              failedCount: batchRecipients.length,
              errors: ['Session Gmail expirée']
            };
            return updated;
          });
          
          setTotalResults(prev => ({
            success: prev.success,
            failed: prev.failed + batchRecipients.length
          }));
          
          setIsSending(false);
          setProgress(100);
          return;
        }
        
        // Autre erreur de parsing
        setError(`Erreur lors de l'envoi des emails: Le serveur a renvoyé une réponse non-JSON. Veuillez réessayer ou contacter l'administrateur.`);
        
        // Mettre à jour le statut du lot
        setBatchStatuses(current => {
          const updated = [...current];
          updated[batchIndex] = {
            ...updated[batchIndex],
            status: 'failed',
            failedCount: batchRecipients.length,
            errors: ['Réponse invalide du serveur']
          };
          return updated;
        });
        
        setTotalResults(prev => ({
          success: prev.success,
          failed: prev.failed + batchRecipients.length
        }));
        
        return;
      }
      
      // Traiter la réponse
      if (response.ok && data.success) {
        // Mettre à jour le statut du lot
        setBatchStatuses(current => {
          const updated = [...current];
          updated[batchIndex] = {
            ...updated[batchIndex],
            status: 'completed',
            successCount: data.sent,
            failedCount: data.failed,
            errors: data.errors || []
          };
          return updated;
        });
        
        // Mettre à jour les résultats totaux
        setTotalResults(prev => ({
          success: prev.success + data.sent,
          failed: prev.failed + data.failed
        }));
        
        console.log(`Micro-lot ${batchIndex + 1} traité: ${data.sent} réussis, ${data.failed} échoués`);
      } else {
        // Erreur dans la réponse
        setError(`Erreur: ${data.error || 'Une erreur est survenue lors de l\'envoi'}`);
        
        // Mettre à jour le statut du lot
        setBatchStatuses(current => {
          const updated = [...current];
          updated[batchIndex] = {
            ...updated[batchIndex],
            status: 'failed',
            failedCount: batchRecipients.length,
            errors: [data.error || 'Erreur inconnue']
          };
          return updated;
        });
        
        setTotalResults(prev => ({
          success: prev.success,
          failed: prev.failed + batchRecipients.length
        }));
      }
    } catch (error: any) {
      console.error(`Erreur lors de l'envoi du micro-lot ${batchIndex + 1}:`, error);
      
      // Mettre à jour le statut du lot
      setBatchStatuses(current => {
        const updated = [...current];
        updated[batchIndex] = {
          ...updated[batchIndex],
          status: 'failed',
          failedCount: microBatches[batchIndex].length,
          errors: [error.message || 'Erreur inconnue']
        };
        return updated;
      });
      
      setTotalResults(prev => ({
        success: prev.success,
        failed: prev.failed + microBatches[batchIndex].length
      }));
      
      setError(`Erreur lors de l'envoi du lot ${batchIndex + 1}: ${error.message}`);
    }
    
    // Passer au lot suivant après un délai
    setCurrentBatchIndex(batchIndex + 1);
  }, [microBatches, isAuthenticated, isPaused, newsletterHtml, subject, senderName, campaignId]);

  // Effet pour l'automatisation de l'envoi des micro-lots
  useEffect(() => {
    if (isSending && currentBatchIndex < microBatches.length && !isPaused) {
      const timer = setTimeout(() => {
        sendMicroBatch(currentBatchIndex);
      }, currentBatchIndex > 0 ? BATCH_DELAY : 0);
      
      return () => clearTimeout(timer);
    } else if (isSending && currentBatchIndex >= microBatches.length) {
      // Tous les lots ont été traités
      setIsSending(false);
      setProgress(100);
      setStatus('Envoi terminé');
      
      // Notifier le composant parent que l'envoi est terminé
      onComplete(totalResults);
    }
  }, [isSending, currentBatchIndex, microBatches, isPaused, sendMicroBatch, totalResults, onComplete]);

  // Fonction pour démarrer l'envoi par lots
  const startSending = () => {
    if (!isAuthenticated) {
      setError('Vous devez vous authentifier avant d\'envoyer des emails');
      return;
    }
    
    if (microBatches.length === 0) {
      setError('Aucun destinataire à traiter');
      return;
    }
    
    setShowConfirmation(true);
  };

  // Fonction pour confirmer et démarrer l'envoi
  const confirmSending = () => {
    setShowConfirmation(false);
    setIsSending(true);
    setIsPaused(false);
    setProgress(0);
    setError('');
    setStatus('Préparation de l\'envoi...');
    setTotalResults({ success: 0, failed: 0 });
    
    // Réinitialiser les statuts des lots
    const statuses: BatchStatus[] = microBatches.map((_, index) => ({
      batchNumber: index + 1,
      totalBatches: microBatches.length,
      successCount: 0,
      failedCount: 0,
      status: 'pending'
    }));
    
    setBatchStatuses(statuses);
    setCurrentBatchIndex(0);
  };

  // Fonction pour mettre en pause ou reprendre l'envoi
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Fonction pour gérer la déconnexion Gmail
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/gmail-auth', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsAuthenticated(false);
        setAuthError('');
        setResults({ success: 0, failed: 0 });
        setStatus('');
      } else {
        setAuthError(`Erreur lors de la déconnexion: ${data.error || 'Une erreur est survenue'}`);
      }
    } catch (error: any) {
      console.error('Erreur lors de la déconnexion:', error);
      setAuthError(`Erreur lors de la déconnexion: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoggingOut) {
    return (
      <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, my: 2, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography>Déconnexion en cours...</Typography>
      </Box>
    );
  }

  // Affichage spécial quand la session a expiré
  if (error && error.includes('Session Gmail expirée')) {
    return (
      <Box sx={{ p: 3, bgcolor: '#fff3cd', borderRadius: 2, my: 2, border: '1px solid #ffeeba' }}>
        <Typography variant="h6" sx={{ color: '#856404', display: 'flex', alignItems: 'center', mb: 2 }}>
          <EmailIcon sx={{ mr: 1 }} /> Session Gmail expirée
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Votre session Gmail a expiré. Veuillez vous déconnecter puis vous reconnecter pour continuer.
        </Typography>
        <Button 
          variant="contained" 
          color="warning" 
          startIcon={<LogoutIcon />} 
          onClick={handleLogout}
          sx={{ mr: 2 }}
        >
          1. Déconnexion
        </Button>
        {!isAuthenticated && (
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<EmailIcon />} 
            onClick={handleAuthenticate}
            sx={{ mt: { xs: 2, sm: 0 } }}
            disabled={authenticating}
          >
            2. Reconnecter à Gmail
            {authenticating && <CircularProgress size={24} sx={{ ml: 1 }} />}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ my: 3 }}>
      <Typography variant="h6">Envoi via Gmail par micro-lots</Typography>
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {/* Boîte de dialogue de confirmation */}
      <Dialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      >
        <DialogTitle>Confirmer l'envoi automatique</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vous êtes sur le point d'envoyer {recipients.length} emails en {microBatches.length} micro-lots de {MICRO_BATCH_SIZE} emails maximum.
            <br /><br />
            L'envoi se fera automatiquement, avec une pause de {BATCH_DELAY/1000} secondes entre chaque lot pour éviter les timeouts.
            <br /><br />
            Cette configuration optimisée (lots de 3 emails) contourne efficacement les limites de timeout de Vercel.
            <br /><br />
            Assurez-vous que :
            <ul>
              <li>Votre connexion internet est stable</li>
              <li>Votre session Gmail est active</li>
              <li>Vous gardez cet onglet ouvert pendant tout le processus</li>
            </ul>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmation(false)} color="inherit">
            Annuler
          </Button>
          <Button onClick={confirmSending} color="primary" variant="contained">
            Démarrer l'envoi automatique
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 3, mb: 3 }}>
        {!isAuthenticated ? (
          <>
            <Button
              variant="contained"
              onClick={handleAuthenticate}
              disabled={authenticating || disabled}
              startIcon={<EmailIcon />}
            >
              {authenticating ? 'Authentification en cours...' : 'Se connecter à Gmail'}
            </Button>
            {authError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {authError}
              </Alert>
            )}
          </>
        ) : (
          <Box sx={{ my: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">
                ✅ Connecté à Gmail. {microBatches.length > 0 && `${recipients.length} emails seront envoyés en ${microBatches.length} micro-lots.`}
              </Typography>
              
              <Tooltip title="Se déconnecter de Gmail">
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={handleLogout}
                  disabled={isLoggingOut || isSending || disabled}
                  startIcon={<LogoutIcon />}
                >
                  {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
                </Button>
              </Tooltip>
            </Box>

            {/* Informations sur les micro-lots */}
            {microBatches.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Vos emails seront envoyés en {microBatches.length} micro-lots de {MICRO_BATCH_SIZE} emails maximum, 
                avec une pause de {BATCH_DELAY/1000} secondes entre chaque lot pour éviter les timeouts.
                <br />
                <strong>Configuration optimisée :</strong> Cette approche prudente garantit que chaque requête se termine avant la limite de 10 secondes de Vercel.
              </Alert>
            )}

            {isSending ? (
              <Box sx={{ my: 3 }}>
                {/* Progression globale */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      Progression globale: {Math.floor(progress)}%
                    </Typography>
                    <Typography variant="body2">
                      Lot {currentBatchIndex} sur {microBatches.length}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ height: 10, borderRadius: 1 }} 
                  />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button
                      variant="outlined"
                      color={isPaused ? "success" : "warning"}
                      onClick={togglePause}
                      startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                      sx={{ mt: 1 }}
                    >
                      {isPaused ? "Reprendre l'envoi" : "Mettre en pause"}
                    </Button>
                  </Box>
                </Box>
                
                {/* Résumé des résultats */}
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Résultats en temps réel
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {totalResults.success}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Emails envoyés
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {totalResults.failed}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Échecs
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main">
                        {currentBatchIndex} / {microBatches.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Lots traités
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Liste des statuts des lots */}
                <Box sx={{ maxHeight: '300px', overflow: 'auto', mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Statut détaillé des lots
                  </Typography>
                  {batchStatuses.map((batchStatus, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        p: 1, 
                        borderRadius: 1, 
                        mb: 1,
                        bgcolor: 
                          batchStatus.status === 'completed' ? '#e8f5e9' : 
                          batchStatus.status === 'processing' ? '#fff8e1' :
                          batchStatus.status === 'failed' ? '#ffebee' : '#f5f5f5',
                        border: '1px solid',
                        borderColor: 
                          batchStatus.status === 'completed' ? '#c8e6c9' : 
                          batchStatus.status === 'processing' ? '#ffecb3' :
                          batchStatus.status === 'failed' ? '#ffcdd2' : '#e0e0e0',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                          Lot {batchStatus.batchNumber}/{batchStatus.totalBatches}
                        </Typography>
                        <Chip 
                          size="small"
                          label={
                            batchStatus.status === 'pending' ? 'En attente' : 
                            batchStatus.status === 'processing' ? 'En cours' :
                            batchStatus.status === 'completed' ? 'Terminé' : 'Échoué'
                          }
                          color={
                            batchStatus.status === 'completed' ? 'success' : 
                            batchStatus.status === 'processing' ? 'warning' :
                            batchStatus.status === 'failed' ? 'error' : 'default'
                          }
                          icon={
                            batchStatus.status === 'completed' ? <CheckCircleIcon /> : 
                            batchStatus.status === 'failed' ? <ErrorIcon /> : undefined
                          }
                        />
                      </Box>
                      
                      {(batchStatus.status === 'completed' || batchStatus.status === 'failed') && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Résultat: {batchStatus.successCount} réussis, {batchStatus.failedCount} échoués
                        </Typography>
                      )}
                      
                      {batchStatus.status === 'failed' && batchStatus.errors && batchStatus.errors.length > 0 && (
                        <Alert severity="error" sx={{ mt: 1, p: 0.5 }}>
                          <Typography variant="caption">
                            {batchStatus.errors[0]}
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <>
                {totalResults.success > 0 || totalResults.failed > 0 ? (
                  <Alert 
                    severity={totalResults.failed === 0 ? "success" : "warning"} 
                    sx={{ my: 2 }}
                    action={
                      <Button 
                        size="small" 
                        color="inherit" 
                        onClick={startSending}
                        disabled={recipients.length === 0 || disabled}
                      >
                        Recommencer
                      </Button>
                    }
                  >
                    Envoi terminé: {totalResults.success} emails envoyés avec succès, {totalResults.failed} échoués.
                  </Alert>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={startSending}
                    disabled={recipients.length === 0 || disabled}
                    startIcon={<EmailIcon />}
                  >
                    Envoyer {recipients.length} emails par micro-lots
                  </Button>
                )}
              </>
            )}
          </Box>
        )}
      </Box>

      <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
        Note: Cette fonction utilise l'API Gmail et envoie des emails depuis votre compte Gmail personnel.
        Limite: 2000 emails par jour. <Link href="https://developers.google.com/gmail/api/reference/quota" target="_blank">En savoir plus</Link>
      </Typography>
    </Box>
  );
} 