'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Chip, TextField, Tabs, Tab, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import AddIcon from '@mui/icons-material/Add';

interface SendEmailFormProps {
  htmlContent: string;
  onError: (error: string) => void;
  senderName: string;
  emailSubject: string;
  onCancel?: () => void;
}

interface Contact {
  email: string;
  nom: string;
  prenom?: string;
}

export default function SendEmailForm({ htmlContent, onError, senderName, emailSubject, onCancel }: SendEmailFormProps) {
  const theme = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inputMethod, setInputMethod] = useState<'csv' | 'manual'>('manual');
  
  // États pour l'ajout manuel de contacts
  const [manualEmail, setManualEmail] = useState('');
  const [manualNom, setManualNom] = useState('');
  const [manualPrenom, setManualPrenom] = useState('');

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
          error: (error: { message: string }) => {
            onError(`Erreur lors de la lecture du fichier CSV: ${error.message}`);
          }
        });
      } catch (error) {
        onError('Erreur lors du traitement du fichier');
      }
    }
  });

  const handleAddContact = () => {
    if (!manualEmail || !manualNom) {
      onError('L\'email et le nom sont requis');
      return;
    }

    if (!manualEmail.includes('@')) {
      onError('Veuillez entrer une adresse email valide');
      return;
    }

    const newContact: Contact = {
      email: manualEmail,
      nom: manualNom,
      prenom: manualPrenom || undefined
    };

    setContacts([...contacts, newContact]);
    setSuccess(true);
    
    // Réinitialiser les champs
    setManualEmail('');
    setManualNom('');
    setManualPrenom('');
  };

  const handleRemoveContact = (index: number) => {
    const updatedContacts = [...contacts];
    updatedContacts.splice(index, 1);
    setContacts(updatedContacts);
    
    if (updatedContacts.length === 0) {
      setSuccess(false);
    }
  };

  const handleSendEmails = async () => {
    try {
      setLoading(true);
      // Implémentation de l'envoi d'emails ici
      // Pour chaque contact dans contacts[], envoyer un email personnalisé avec senderName et emailSubject
      setLoading(false);
    } catch (error) {
      onError('Erreur lors de l\'envoi des emails');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography 
        variant="body1" 
        sx={{ 
          mb: 3, 
          color: theme.palette.text.secondary,
          fontSize: '0.95rem',
          lineHeight: 1.6
        }}
      >
        Ajoutez les contacts auxquels vous souhaitez envoyer des demandes d'avis Google.
      </Typography>

      {/* Informations sur l'email */}
      <Box 
        sx={{ 
          mb: 3, 
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          backgroundColor: 'rgba(220, 0, 50, 0.05)',
          border: '1px solid rgba(220, 0, 50, 0.1)'
        }}
      >
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            mb: 2,
            color: '#DC0032'
          }}
        >
          Informations sur l'email
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '120px' }}>
              Expéditeur:
            </Typography>
            <Typography variant="body2">
              {senderName}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '120px' }}>
              Objet:
            </Typography>
            <Typography variant="body2">
              {emailSubject}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Onglets pour choisir la méthode d'ajout de contacts */}
      <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={inputMethod} 
          onChange={(_, newValue) => setInputMethod(newValue)}
          sx={{
            minHeight: '40px',
            '& .MuiTabs-indicator': {
              backgroundColor: '#DC0032',
              height: 3
            }
          }}
        >
          <Tab 
            label="Saisie manuelle" 
            value="manual"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              minHeight: '40px',
              '&.Mui-selected': {
                color: '#DC0032',
                fontWeight: 600
              }
            }}
          />
          <Tab 
            label="Importer CSV" 
            value="csv"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              minHeight: '40px',
              '&.Mui-selected': {
                color: '#DC0032',
                fontWeight: 600
              }
            }}
          />
        </Tabs>
      </Box>
      
      {inputMethod === 'manual' ? (
        <Box sx={{ mb: 3 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper
            }}
          >
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600,
                mb: 2
              }}
            >
              Ajouter un contact
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  label="Prénom"
                  value={manualPrenom}
                  onChange={(e) => setManualPrenom(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: '#DC0032',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#DC0032',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#DC0032'
                    }
                  }}
                />
                <TextField
                  label="Nom *"
                  value={manualNom}
                  onChange={(e) => setManualNom(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: '#DC0032',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#DC0032',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#DC0032'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <TextField
                  label="Email *"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  size="small"
                  type="email"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      '&:hover fieldset': {
                        borderColor: '#DC0032',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#DC0032',
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#DC0032'
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddContact}
                  startIcon={<AddIcon />}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    boxShadow: 2,
                    backgroundColor: '#DC0032',
                    '&:hover': {
                      backgroundColor: '#B00028'
                    }
                  }}
                >
                  Ajouter
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      ) : (
        <Paper
          {...getRootProps()}
          sx={{
            p: { xs: 3, sm: 4 },
            mb: 3,
            border: `2px dashed ${isDragActive ? '#DC0032' : theme.palette.divider}`,
            borderRadius: 2,
            backgroundColor: isDragActive ? 'rgba(220, 0, 50, 0.05)' : theme.palette.background.default,
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            textAlign: 'center',
            '&:hover': {
              borderColor: '#DC0032',
              backgroundColor: 'rgba(220, 0, 50, 0.05)'
            }
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon 
            sx={{ 
              fontSize: { xs: 36, sm: 48 }, 
              color: isDragActive ? '#DC0032' : theme.palette.text.secondary,
              mb: 2
            }} 
          />
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            Déposez votre fichier CSV ici
          </Typography>
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}
          >
            ou cliquez pour sélectionner un fichier
          </Typography>
        </Paper>
      )}

      {success && contacts.length > 0 && (
        <Box 
          sx={{ 
            mb: 3, 
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            backgroundColor: 'rgba(76, 175, 80, 0.08)',
            border: '1px solid rgba(76, 175, 80, 0.2)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: { xs: 24, sm: 28 } }} />
            <Typography 
              variant="h6" 
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                color: theme.palette.success.dark
              }}
            >
              {contacts.length} contact{contacts.length > 1 ? 's' : ''} prêt{contacts.length > 1 ? 's' : ''} pour l'envoi
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {contacts.slice(0, 5).map((contact, index) => (
              <Chip
                key={index}
                icon={<PersonIcon />}
                label={`${contact.prenom || ''} ${contact.nom}`}
                size="small"
                onDelete={() => handleRemoveContact(index)}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              />
            ))}
            {contacts.length > 5 && (
              <Chip
                label={`+${contacts.length - 5} autres`}
                size="small"
                sx={{ 
                  backgroundColor: '#DC0032',
                  color: '#fff'
                }}
              />
            )}
          </Box>
          
          {contacts.length > 5 && (
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Cliquez sur un contact pour le supprimer de la liste
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {contacts.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleSendEmails}
            disabled={loading}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: 2,
              backgroundColor: '#DC0032',
              '&:hover': {
                backgroundColor: '#B00028'
              }
            }}
          >
            {loading ? 'Envoi en cours...' : `Envoyer ${contacts.length} email${contacts.length > 1 ? 's' : ''}`}
          </Button>
        )}
        {onCancel && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={onCancel}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: '#666',
              color: '#666',
              '&:hover': {
                borderColor: '#333',
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            Retour à l'édition
          </Button>
        )}
      </Box>
      
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block', 
          textAlign: 'center', 
          mt: 2,
          color: theme.palette.text.secondary
        }}
      >
        Les emails seront envoyés depuis votre adresse professionnelle
      </Typography>
    </Box>
  );
} 