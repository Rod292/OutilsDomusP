'use client';

import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Divider } from '@mui/material';
import NotificationDebugger from '../components/NotificationDebugger';

export default function TestNotificationsPage() {
  const [userId, setUserId] = useState<string>('');
  const [userIdInput, setUserIdInput] = useState<string>('');

  const handleSetUserId = () => {
    setUserId(userIdInput);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Test des Notifications Firebase
        </Typography>
        
        <Typography variant="body1" paragraph>
          Cette page vous permet de tester le système de notification Firebase Cloud Messaging (FCM).
          Vous pouvez vérifier l'état des permissions, enregistrer un service worker, obtenir un token FCM et envoyer des notifications de test.
        </Typography>

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            ID Utilisateur pour les Tests
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              label="ID Utilisateur"
              variant="outlined"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              fullWidth
              helperText="Format: email_consultant (ex: johndoe@example.com_John)"
              size="small"
            />
            <Button 
              variant="contained" 
              onClick={handleSetUserId}
              disabled={!userIdInput}
            >
              Définir
            </Button>
          </Box>
          
          {userId && (
            <Typography variant="body2">
              ID Utilisateur actuel: <strong>{userId}</strong>
            </Typography>
          )}
        </Box>
      </Paper>
      
      {userId ? (
        <NotificationDebugger userId={userId} />
      ) : (
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Veuillez définir un ID utilisateur pour commencer les tests
          </Typography>
        </Paper>
      )}
      
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Guide de Dépannage
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Si les notifications ne fonctionnent pas:
        </Typography>
        
        <ol>
          <li>
            <Typography variant="body1" paragraph>
              <strong>Vérifiez les permissions du navigateur</strong> - Assurez-vous que les notifications sont autorisées pour ce site.
            </Typography>
          </li>
          <li>
            <Typography variant="body1" paragraph>
              <strong>Vérifiez le service worker</strong> - Le service worker doit être correctement enregistré et actif.
            </Typography>
          </li>
          <li>
            <Typography variant="body1" paragraph>
              <strong>Vérifiez la connexion réseau</strong> - Une connexion internet active est requise pour FCM.
            </Typography>
          </li>
          <li>
            <Typography variant="body1" paragraph>
              <strong>Vérifiez la console du navigateur</strong> - Recherchez les erreurs liées à Firebase ou aux notifications.
            </Typography>
          </li>
          <li>
            <Typography variant="body1" paragraph>
              <strong>Vérifiez les variables d'environnement</strong> - Assurez-vous que NEXT_PUBLIC_FIREBASE_VAPID_KEY est correctement définie.
            </Typography>
          </li>
        </ol>
        
        <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
          Note: Les notifications push ne fonctionnent qu'en HTTPS ou sur localhost.
        </Typography>
      </Paper>
    </Container>
  );
} 