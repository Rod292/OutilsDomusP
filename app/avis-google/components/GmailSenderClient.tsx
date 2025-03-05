'use client';

import { useState, useEffect } from 'react';
import { 
  Button, Alert, Box, Typography, CircularProgress, Link, Tooltip 
} from '@mui/material';
import { GMAIL_CONFIG } from '@/lib/gmail-config';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';

const { CLIENT_ID, SCOPES } = GMAIL_CONFIG;

type GmailSenderProps = {
  newsletterHtml: string;
  recipients: Array<{ email: string; name: string; company?: string }>;
  subject: string;
  senderName?: string;
  onComplete: (results: { success: number; failed: number }) => void;
};

export default function GmailSenderClient({ newsletterHtml, recipients, subject, senderName, onComplete }: GmailSenderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState({ success: 0, failed: 0 });
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Fonction pour générer l'URL d'authentification OAuth
  const handleAuthenticate = () => {
    setAuthError('');
    setAuthenticating(true);
    
    try {
      // Construire l'URL de redirection basée sur l'origine actuelle
      const origin = window.location.origin;
      const redirectUri = `${origin}/avis-google/oauth-redirect`;
      
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
      
      // Ouvrir la fenêtre d'authentification
      const authWindow = window.open(authUrl, 'oauth', 'width=600,height=600');
      
      if (!authWindow) {
        setAuthError('Impossible d\'ouvrir la fenêtre d\'authentification. Veuillez vérifier que les popups sont autorisés.');
        setAuthenticating(false);
        return;
      }
      
      // Fonction pour écouter les messages de la fenêtre de redirection
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data.code) {
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
              const response = await fetch('/api/gmail-auth', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                const errorMessage = data.error || 'Échec de l\'authentification';
                setAuthError(errorMessage);
                setAuthenticating(false);
                return;
              }
              
              if (data.success) {
                setIsAuthenticated(true);
                setAuthError('');
              } else {
                setAuthError(`Erreur d'authentification: ${data.error || 'Échec de l\'authentification'}`);
              }
              setAuthenticating(false);
            } catch (error: any) {
              console.error('Erreur lors de l\'authentification:', error);
              setAuthError(`Erreur lors de l'authentification: ${error.message || 'Erreur inconnue'}`);
              setAuthenticating(false);
            }
          })();
        } else if (event.data.error) {
          setAuthError(`Erreur d'authentification: ${event.data.error}`);
          setAuthenticating(false);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/gmail-auth', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const sendEmails = async () => {
    if (!isAuthenticated || recipients.length === 0) {
      setError('Vous devez vous authentifier et fournir des destinataires');
      return;
    }

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
        recipients: recipients,
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
        setStatus(`Envoi terminé: ${data.sent} réussis, ${data.failed} échoués`);
        const finalResults = { success: data.sent, failed: data.failed };
        setResults(finalResults);
        onComplete(finalResults);
      } else {
        setError(data.error || 'Erreur lors de l\'envoi des emails');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi:', error);
      setError(`Erreur lors de l'envoi: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Box>
      {!isAuthenticated ? (
        <Button
          variant="contained"
          color="primary"
          onClick={handleAuthenticate}
          disabled={authenticating}
          startIcon={<EmailIcon />}
          fullWidth
        >
          {authenticating ? 'Authentification en cours...' : 'Se connecter avec Gmail'}
        </Button>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="success.main">
              Connecté à Gmail
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleLogout}
              disabled={isLoggingOut}
              startIcon={<LogoutIcon />}
            >
              Se déconnecter
            </Button>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={sendEmails}
            disabled={isSending || recipients.length === 0}
            fullWidth
          >
            {isSending ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Envoi en cours...
              </Box>
            ) : (
              'Envoyer les emails'
            )}
          </Button>
        </Box>
      )}

      {status && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {status}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {authError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {authError}
        </Alert>
      )}
    </Box>
  );
} 