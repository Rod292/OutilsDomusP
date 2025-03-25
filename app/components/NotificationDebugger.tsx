'use client';

import React, { useState, useEffect } from 'react';
import { requestNotificationPermission, getFCMToken, registerFCMServiceWorker } from '../services/clientNotificationService';
import { Button, Paper, Typography, Box, CircularProgress, Divider, List, ListItem, ListItemText, Chip, Alert } from '@mui/material';
import { NotificationsActive, Warning, Check, Close, Info } from '@mui/icons-material';

interface NotificationDebuggerProps {
  userId?: string;
}

export default function NotificationDebugger({ userId }: NotificationDebuggerProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string>('inconnu');
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<string>('non vérifié');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Vérifier l'état des permissions au chargement
      if ('Notification' in window) {
        setPermissions(Notification.permission);
      } else {
        setPermissions('non supporté');
      }
      
      // Vérifier l'état du service worker
      checkServiceWorker();
    }
  }, []);

  const checkServiceWorker = async () => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (reg) {
          setServiceWorkerStatus(reg.active ? 'actif' : (reg.installing ? 'installation' : 'en attente'));
          addLog(`Service worker trouvé, état: ${reg.active ? 'actif' : (reg.installing ? 'installation' : 'en attente')}`);
        } else {
          setServiceWorkerStatus('non enregistré');
          addLog('Aucun service worker trouvé');
        }
      } catch (error) {
        setServiceWorkerStatus('erreur');
        addLog(`Erreur lors de la vérification du service worker: ${error}`);
      }
    } else {
      setServiceWorkerStatus('non supporté');
      addLog('Service worker non supporté par ce navigateur');
    }
  };

  const handleRequestPermission = async () => {
    if (!userId) {
      setError('ID utilisateur requis pour demander des permissions');
      addLog('Erreur: ID utilisateur requis');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Demande de permission en cours...');
    addLog('Demande de permission pour les notifications...');

    try {
      const result = await requestNotificationPermission(userId);
      if (result) {
        setStatus('Permission accordée');
        setPermissions('granted');
        addLog('Permission accordée avec succès');
      } else {
        setStatus('Permission refusée ou erreur');
        setError('La permission a été refusée ou une erreur est survenue');
        addLog('Permission refusée ou erreur');
      }
      
      // Mettre à jour l'état du service worker après la demande
      await checkServiceWorker();
    } catch (error) {
      setStatus('Erreur');
      setError(`Erreur lors de la demande de permission: ${error}`);
      addLog(`Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterServiceWorker = async () => {
    setLoading(true);
    setError(null);
    setStatus('Enregistrement du service worker...');
    addLog('Tentative d\'enregistrement du service worker...');

    try {
      const registration = await registerFCMServiceWorker();
      if (registration) {
        setStatus('Service worker enregistré');
        setServiceWorkerStatus(registration.active ? 'actif' : (registration.installing ? 'installation' : 'en attente'));
        addLog(`Service worker enregistré, état: ${registration.active ? 'actif' : (registration.installing ? 'installation' : 'en attente')}`);
      } else {
        setStatus('Échec de l\'enregistrement');
        setError('Le service worker n\'a pas pu être enregistré');
        addLog('Échec de l\'enregistrement du service worker');
      }
    } catch (error) {
      setStatus('Erreur');
      setError(`Erreur lors de l'enregistrement du service worker: ${error}`);
      addLog(`Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetFCMToken = async () => {
    if (!userId) {
      setError('ID utilisateur requis pour obtenir un token FCM');
      addLog('Erreur: ID utilisateur requis');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Récupération du token FCM...');
    addLog('Tentative de récupération du token FCM...');

    try {
      const token = await getFCMToken(userId);
      if (token) {
        setStatus('Token FCM obtenu');
        setFcmToken(token);
        addLog('Token FCM obtenu avec succès');
      } else {
        setStatus('Échec de récupération');
        setError('Le token FCM n\'a pas pu être obtenu');
        addLog('Échec de la récupération du token FCM');
      }
    } catch (error) {
      setStatus('Erreur');
      setError(`Erreur lors de la récupération du token FCM: ${error}`);
      addLog(`Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!userId) {
      setError('ID utilisateur requis pour envoyer une notification de test');
      addLog('Erreur: ID utilisateur requis');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Envoi de notification de test...');
    addLog('Envoi d\'une notification de test...');

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title: 'Test de notification',
          body: `Ceci est une notification de test envoyée à ${new Date().toLocaleTimeString()}`,
          type: 'test',
          taskId: 'test-notification'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('Notification envoyée');
        addLog(`Notification envoyée: ${JSON.stringify(data)}`);
      } else {
        setStatus('Échec d\'envoi');
        setError(`La notification n'a pas pu être envoyée: ${data.error || 'Erreur inconnue'}`);
        addLog(`Échec d'envoi de notification: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      setStatus('Erreur');
      setError(`Erreur lors de l'envoi de la notification: ${error}`);
      addLog(`Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('Logs effacés');
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2, mb: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <NotificationsActive sx={{ mr: 1 }} />
        Débogueur de Notifications
      </Typography>
      
      {!userId && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ID utilisateur non fourni. Certaines fonctionnalités ne seront pas disponibles.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip 
            label={`Permissions: ${permissions}`}
            color={permissions === 'granted' ? 'success' : (permissions === 'denied' ? 'error' : 'warning')}
            icon={permissions === 'granted' ? <Check /> : (permissions === 'denied' ? <Close /> : <Warning />)}
          />
          <Chip 
            label={`Service Worker: ${serviceWorkerStatus}`}
            color={serviceWorkerStatus === 'actif' ? 'success' : (serviceWorkerStatus === 'erreur' || serviceWorkerStatus === 'non supporté' ? 'error' : 'warning')}
            icon={serviceWorkerStatus === 'actif' ? <Check /> : (serviceWorkerStatus === 'erreur' || serviceWorkerStatus === 'non supporté' ? <Close /> : <Warning />)}
          />
          <Chip 
            label={`FCM Token: ${fcmToken ? 'disponible' : 'non disponible'}`}
            color={fcmToken ? 'success' : 'warning'}
            icon={fcmToken ? <Check /> : <Warning />}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {status && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {status}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleRequestPermission} 
            disabled={loading || permissions === 'granted' || !userId}
          >
            {loading ? <CircularProgress size={24} /> : 'Demander la permission'}
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleRegisterServiceWorker} 
            disabled={loading || serviceWorkerStatus === 'actif'}
          >
            {loading ? <CircularProgress size={24} /> : 'Enregistrer le Service Worker'}
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleGetFCMToken} 
            disabled={loading || !userId || permissions !== 'granted'}
            color="primary"
          >
            {loading ? <CircularProgress size={24} /> : 'Obtenir Token FCM'}
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleSendTestNotification} 
            disabled={loading || !userId}
            color="secondary"
          >
            {loading ? <CircularProgress size={24} /> : 'Envoyer Notification Test'}
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={handleClearLogs}
            disabled={loading || logs.length === 0}
          >
            Effacer les logs
          </Button>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <Info sx={{ mr: 1 }} />
          Logs ({logs.length})
        </Typography>
        
        <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
          <List dense>
            {logs.length === 0 ? (
              <ListItem>
                <ListItemText primary="Aucun log disponible" />
              </ListItem>
            ) : (
              logs.map((log, index) => (
                <ListItem key={index}>
                  <ListItemText primary={log} />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
        
        {fcmToken && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">Token FCM</Typography>
            <Paper variant="outlined" sx={{ p: 1, wordBreak: 'break-all' }}>
              <Typography variant="body2" fontFamily="monospace">
                {fcmToken}
              </Typography>
            </Paper>
          </>
        )}
      </Box>
    </Paper>
  );
} 