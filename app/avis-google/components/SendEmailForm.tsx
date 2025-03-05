'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface SendEmailFormProps {
  htmlContent: string;
  onError: (error: string) => void;
}

interface Contact {
  email: string;
  nom: string;
  prenom?: string;
}

export default function SendEmailForm({ htmlContent, onError }: SendEmailFormProps) {
  const theme = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv']
    },
    onDrop: async (acceptedFiles) => {
      try {
        const file = acceptedFiles[0];
        if (!file) {
          onError('Aucun fichier CSV sélectionné');
          return;
        }

        const text = await file.text();
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            const parsedContacts = results.data.map((row: any) => ({
              email: row.email,
              nom: row.nom,
              prenom: row.prenom
            })).filter(contact => contact.email && contact.nom);

            if (parsedContacts.length === 0) {
              onError('Aucun contact valide trouvé dans le fichier CSV');
              return;
            }

            setContacts(parsedContacts);
            setSuccess(true);
          },
          error: (error) => {
            onError(`Erreur lors de la lecture du fichier CSV: ${error.message}`);
          }
        });
      } catch (error) {
        onError('Erreur lors du traitement du fichier');
      }
    }
  });

  const handleSendEmails = async () => {
    try {
      setLoading(true);
      // Implémentation de l'envoi d'emails ici
      // Pour chaque contact dans contacts[], envoyer un email personnalisé
      setLoading(false);
    } catch (error) {
      onError('Erreur lors de l\'envoi des emails');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: 2,
          backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.paper,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          textAlign: 'center',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.action.hover
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon 
          sx={{ 
            fontSize: 48, 
            color: isDragActive ? theme.palette.primary.main : theme.palette.text.secondary,
            mb: 2
          }} 
        />
        <Typography variant="h6" gutterBottom>
          Déposez votre fichier CSV ici
        </Typography>
        <Typography variant="body2" color="textSecondary">
          ou cliquez pour sélectionner un fichier
        </Typography>
      </Paper>

      {success && contacts.length > 0 && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 32, mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            {contacts.length} contacts prêts pour l'envoi
          </Typography>
        </Box>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={contacts.length === 0 || loading}
        onClick={handleSendEmails}
        sx={{ mt: 2 }}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          `Envoyer ${contacts.length} demande${contacts.length > 1 ? 's' : ''} d'avis`
        )}
      </Button>
    </Box>
  );
} 