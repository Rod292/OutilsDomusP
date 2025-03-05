'use client';

import { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

export default function OAuthRedirectPage() {
  useEffect(() => {
    const handleOAuthRedirect = () => {
      // Récupérer le code d'autorisation de l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      // Envoyer le code ou l'erreur à la fenêtre parente
      if (window.opener) {
        if (code) {
          window.opener.postMessage({ code }, window.location.origin);
        } else if (error) {
          window.opener.postMessage({ error }, window.location.origin);
        }
      }
    };

    handleOAuthRedirect();
  }, []);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh' 
    }}>
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="body1">
        Authentification en cours...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Cette fenêtre va se fermer automatiquement.
      </Typography>
    </Box>
  );
} 