'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Alert, CircularProgress } from '@mui/material';

export default function UnsubscribePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Récupérer l'email depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      setLoading(false);
    } else {
      setError('Lien de désinscription invalide. Veuillez vérifier que vous avez utilisé le lien complet de l\'email.');
      setLoading(false);
    }
  }, []);

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);

      // Appeler notre API de désinscription
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue lors de la désinscription.');
      }

      setSuccess(true);
    } catch (error) {
      console.error('Erreur lors de la désinscription:', error);
      setError('Une erreur est survenue lors de la désinscription. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5'
      }}>
        <CircularProgress sx={{ color: '#DC0032' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: '#f5f5f5',
      p: 2
    }}>
      <Paper sx={{ 
        maxWidth: 600, 
        width: '100%', 
        p: 4,
        textAlign: 'center'
      }}>
        <img 
          src="/arthur-loyd-logo.png" 
          alt="Arthur Loyd Bretagne" 
          style={{ 
            width: 200, 
            marginBottom: 24 
          }} 
        />

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : success ? (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              Vous avez été désinscrit avec succès de notre newsletter.
            </Alert>
            <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
              Nous espérons vous revoir bientôt !
            </Typography>
            <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
              Conformément au RGPD, nous avons enregistré cette désinscription et vous ne recevrez plus d'emails de notre part.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{ mb: 3, color: '#2D2D2D' }}>
              Confirmation de désinscription
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
              Êtes-vous sûr de vouloir vous désinscrire de la newsletter Arthur Loyd Bretagne pour l'adresse <strong>{email}</strong> ?
            </Typography>
            <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
              En vous désinscrivant, votre adresse email sera enregistrée dans notre base de données des personnes désabonnées conformément au RGPD, afin de garantir que vous ne recevrez plus d'emails de notre part.
            </Typography>
            <Button
              variant="contained"
              onClick={handleUnsubscribe}
              sx={{
                bgcolor: '#DC0032',
                '&:hover': {
                  bgcolor: '#B00028',
                },
                mb: 2
              }}
            >
              Confirmer la désinscription
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
} 