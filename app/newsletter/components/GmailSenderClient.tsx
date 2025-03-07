'use client';

import { useState, useEffect } from 'react';
import { 
  Button, Alert, Box, Typography, CircularProgress, Link, Tooltip 
} from '@mui/material';
import { GMAIL_CONFIG } from './gmail-config';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';

const { CLIENT_ID, SCOPES } = GMAIL_CONFIG;

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
      console.log('Début de l\'envoi des emails');
      console.log('Nombre de destinataires:', recipients.length);
      
      // Préparer les données à envoyer
      // L'API s'attend à un objet consultant avec une structure { nom, fonction, email, telephone }
      // Alors que nous avons juste un senderName ici
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
        campaignId: campaignId
      };
      
      console.log('Données envoyées à l\'API:', {
        nbDestinataires: requestData.recipients.length,
        sujet: requestData.subject,
        consultant: consultant ? consultant.nom : 'Non défini',
        baseUrl: requestData.baseUrl,
        htmlTaille: requestData.html ? requestData.html.length : 0,
        campaignId: requestData.campaignId || 'Non défini'
      });
      
      const response = await fetch('/api/send-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Réponse reçue du serveur:', response.status);
      
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
          setError('Session Gmail expirée. Veuillez vous déconnecter et vous reconnecter à Gmail en utilisant le bouton DÉCONNEXION puis en vous authentifiant à nouveau.');
          setResults({ success: 0, failed: recipients.length });
          onComplete({ success: 0, failed: recipients.length });
          setIsSending(false);
          setProgress(100);
          setStatus('Erreur d\'authentification');
          return;
        }
        
        // Autre erreur de parsing
        setError(`Erreur lors de l'envoi des emails: Le serveur a renvoyé une réponse non-JSON. Veuillez réessayer ou contacter l'administrateur.`);
        setResults({ success: 0, failed: recipients.length });
        onComplete({ success: 0, failed: recipients.length });
        setIsSending(false);
        setProgress(100);
        setStatus('Échec');
        return;
      }
      
      if (response.ok && data.success) {
        setStatus(`Envoi terminé: ${data.sent} réussis, ${data.failed} échoués`);
        setResults({ success: data.sent, failed: data.failed });
        
        // Afficher les détails des erreurs si disponibles
        if (data.errors && data.errors.length > 0) {
          // Filtrer les erreurs pour trouver celles liées aux emails déjà contactés
          const alreadyContactedErrors = data.errors.filter((error: string) => 
            error.includes('déjà contacté pour cette campagne')
          );
          
          if (alreadyContactedErrors.length > 0) {
            setError(`${alreadyContactedErrors.length} email(s) n'ont pas été envoyés car ils ont déjà reçu cette campagne.`);
          } else if (data.errors.length > 0) {
            setError(`${data.errors.length} email(s) n'ont pas pu être envoyés. Vérifiez les logs pour plus de détails.`);
          }
        }
        
        onComplete({ success: data.sent, failed: data.failed });
      } else {
        setStatus('Échec de l\'envoi');
        setError(`Erreur: ${data.error || 'Une erreur est survenue lors de l\'envoi'}`);
        setResults({ success: 0, failed: recipients.length });
        onComplete({ success: 0, failed: recipients.length });
      }
    } catch (error: any) {
      console.error('Exception lors de l\'envoi des emails:', error);
      setError(`Erreur lors de l'envoi des emails: ${error.message}`);
      setResults({ success: 0, failed: recipients.length });
      onComplete({ success: 0, failed: recipients.length });
    } finally {
      setIsSending(false);
      setProgress(100);
      setStatus('Terminé');
    }
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
      <Typography variant="h6">Envoi via Gmail</Typography>
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

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
                ✅ Connecté à Gmail. Prêt à envoyer {recipients.length} emails.
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

            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'text.secondary' }}>
              Note: Pour que le nom de l'expéditeur s'affiche correctement, vous devez avoir configuré un nom dans votre compte Gmail.
              Vérifiez les paramètres de votre compte Gmail si le nom ne s'affiche pas correctement.
            </Typography>

            {isSending ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
                <CircularProgress variant="determinate" value={progress} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {status} ({progress}%)
                </Typography>
              </Box>
            ) : (
              <>
                {results.success > 0 || results.failed > 0 ? (
                  <Alert severity={results.failed === 0 ? "success" : "warning"} sx={{ my: 2 }}>
                    Résultat: {results.success} emails envoyés avec succès, {results.failed} échoués.
                  </Alert>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={sendEmails}
                    disabled={recipients.length === 0 || disabled}
                    startIcon={<EmailIcon />}
                  >
                    Envoyer {recipients.length} emails maintenant
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