'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Box, Typography, TextField, Paper, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, Stack, LinearProgress,
  List, ListItem, ListItemText, Chip, Divider, IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import Papa from 'papaparse';
import GmailSenderClient from './GmailSenderClient';
import { Campaign, getAllCampaigns, updateCampaignStats } from '../services/campaigns';
import CampaignManager from './CampaignManager';

type Recipient = {
  email: string;
  name: string;
  company?: string;
};

type SendEmailFormProps = {
  htmlContent: string;
};

type BatchRecord = {
  batch: number;
  sent: number;
  failed: number;
  timestamp: string;
};

// Définir la taille des lots
const BATCH_SIZE = 100;

export default function SendEmailForm({ htmlContent }: SendEmailFormProps) {
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('Arthur Loyd Bretagne');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Nouveaux états pour la gestion des lots
  const [allRecipients, setAllRecipients] = useState<Recipient[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [batchHistory, setBatchHistory] = useState<BatchRecord[]>([]);
  const [hasSavedData, setHasSavedData] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendResult, setSendResult] = useState({ success: 0, failed: 0 });
  const [csvPreview, setCsvPreview] = useState<Recipient[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // État pour l'email test
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [testCompany, setTestCompany] = useState('');
  const [showTestEmailForm, setShowTestEmailForm] = useState(false);

  // Charger les campagnes au démarrage
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const data = await getAllCampaigns();
        setCampaigns(data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des campagnes:', error);
        setError('Impossible de charger les campagnes. Veuillez réessayer.');
        setLoading(false);
      }
    };

    loadCampaigns();
    
    // Vérifier s'il y a des données sauvegardées
    checkForSavedData();
  }, []);
  
  // Mettre à jour les destinataires quand le lot courant change
  useEffect(() => {
    if (allRecipients.length > 0) {
      const startIndex = currentBatch * BATCH_SIZE;
      const batchRecipients = allRecipients.slice(startIndex, startIndex + BATCH_SIZE);
      setRecipients(batchRecipients);
      
      // Mettre à jour localStorage
      localStorage.setItem('currentBatch', currentBatch.toString());
    }
  }, [currentBatch, allRecipients]);
  
  // Fonction pour vérifier les données sauvegardées
  const checkForSavedData = () => {
    try {
      const savedRecipients = localStorage.getItem('csvRecipients');
      const savedBatch = localStorage.getItem('currentBatch');
      const savedHistory = localStorage.getItem('batchHistory');
      const savedCampaignId = localStorage.getItem('selectedCampaignId');
      const savedSubject = localStorage.getItem('emailSubject');
      
      if (savedRecipients && savedBatch && savedCampaignId && savedSubject) {
        setHasSavedData(true);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des données sauvegardées:', error);
    }
  };
  
  // Fonction pour restaurer les données sauvegardées
  const restoreSavedData = () => {
    try {
      const savedRecipients = localStorage.getItem('csvRecipients');
      const savedBatch = localStorage.getItem('currentBatch');
      const savedHistory = localStorage.getItem('batchHistory');
      const savedCampaignId = localStorage.getItem('selectedCampaignId');
      const savedSubject = localStorage.getItem('emailSubject');
      
      if (savedRecipients) {
        const parsed = JSON.parse(savedRecipients);
        setAllRecipients(parsed);
        
        // Mettre à jour l'aperçu
        setCsvPreview(parsed.slice(0, 3));
      }
      
      if (savedBatch) {
        const batchNum = parseInt(savedBatch);
        setCurrentBatch(batchNum);
      }
      
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setBatchHistory(history);
      }
      
      if (savedCampaignId) {
        setSelectedCampaignId(savedCampaignId);
      }
      
      if (savedSubject) {
        setSubject(savedSubject);
      }
      
      setSuccess('Données restaurées avec succès. Vous pouvez continuer l\'envoi.');
      setHasSavedData(false);
    } catch (error) {
      console.error('Erreur lors de la restauration des données:', error);
      setError('Impossible de restaurer les données sauvegardées.');
    }
  };
  
  // Fonction pour supprimer les données sauvegardées
  const clearSavedData = () => {
    try {
      localStorage.removeItem('csvRecipients');
      localStorage.removeItem('currentBatch');
      localStorage.removeItem('batchHistory');
      localStorage.removeItem('selectedCampaignId');
      localStorage.removeItem('emailSubject');
      
      setHasSavedData(false);
      setSuccess('Données sauvegardées supprimées.');
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccess('');
    setCsvPreview([]);
    
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setCsvFile(file);
    
    // Analyser le fichier CSV
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as any[];
        
        // Vérifier si les colonnes requises existent
        if (data.length > 0) {
          if (!data[0].email) {
            setError('Le fichier CSV doit contenir une colonne "email"');
            return;
          }
          
          // Vérifier les colonnes recommandées
          const hasNameColumn = 'name' in data[0];
          const hasCompanyColumn = 'company' in data[0];
          
          if (!hasNameColumn || !hasCompanyColumn) {
            console.warn(`Attention: Colonnes manquantes dans le CSV - ${!hasNameColumn ? '"name"' : ''} ${!hasCompanyColumn ? '"company"' : ''}`);
          }
          
          // Créer les destinataires à partir des données CSV
          const parsedRecipients: Recipient[] = data
            .filter(row => row.email && row.email.trim() !== '')
            .map(row => {
              const recipient: Recipient = {
                email: row.email.trim(),
                name: (row.name || '').trim(),
                company: (row.company || '').trim()
              };
              
              return recipient;
            });
          
          if (parsedRecipients.length === 0) {
            setError('Aucun destinataire valide trouvé dans le fichier CSV');
            return;
          }
          
          // Stocker tous les destinataires et définir le lot initial
          setAllRecipients(parsedRecipients);
          setCurrentBatch(0);
          setBatchHistory([]);
          
          // Préparer le premier lot
          const firstBatch = parsedRecipients.slice(0, BATCH_SIZE);
          setRecipients(firstBatch);
          
          // Sauvegarder dans localStorage
          localStorage.setItem('csvRecipients', JSON.stringify(parsedRecipients));
          localStorage.setItem('currentBatch', '0');
          localStorage.setItem('batchHistory', JSON.stringify([]));
          if (selectedCampaignId) {
            localStorage.setItem('selectedCampaignId', selectedCampaignId);
          }
          if (subject) {
            localStorage.setItem('emailSubject', subject);
          }
          
          // Afficher un aperçu des 3 premiers destinataires
          setCsvPreview(parsedRecipients.slice(0, 3));
          
          const totalBatches = Math.ceil(parsedRecipients.length / BATCH_SIZE);
          setSuccess(`${parsedRecipients.length} destinataires chargés avec succès. Divisés en ${totalBatches} lots de ${BATCH_SIZE} maximum.${!hasNameColumn || !hasCompanyColumn ? '\nNote: Certaines colonnes sont manquantes, la personnalisation sera limitée.' : ''}`);
        } else {
          setError('Le fichier CSV est vide ou mal formaté');
        }
      },
      error: (error) => {
        console.error('Erreur CSV:', error);
        setError(`Erreur lors de l'analyse du fichier CSV: ${error.message}`);
      }
    });
  };

  const handleGmailComplete = async (results: { success: number; failed: number }) => {
    if (results.success > 0) {
      // Enregistrer ce lot dans l'historique
      const newHistoryItem: BatchRecord = {
        batch: currentBatch,
        sent: results.success,
        failed: results.failed,
        timestamp: new Date().toISOString()
      };
      
      const updatedHistory = [...batchHistory, newHistoryItem];
      setBatchHistory(updatedHistory);
      
      // Sauvegarder l'historique dans localStorage
      localStorage.setItem('batchHistory', JSON.stringify(updatedHistory));
      
      setSuccess(`Lot ${currentBatch + 1}: ${results.success} emails envoyés avec succès via Gmail.`);
      
      // Mettre à jour les statistiques de la campagne
      if (selectedCampaignId) {
        try {
          await updateCampaignStats(selectedCampaignId, {
            success: results.success,
            failed: results.failed
          });
        } catch (error) {
          console.error('Erreur lors de la mise à jour des statistiques de la campagne:', error);
        }
      }
    }
    
    if (results.failed > 0) {
      setError(`${results.failed} emails n'ont pas pu être envoyés.`);
    }
    
    setSendResult(results);
  };

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    localStorage.setItem('selectedCampaignId', campaignId);
  };
  
  // Fonction pour passer au lot suivant
  const handleNextBatch = () => {
    if (currentBatch < Math.ceil(allRecipients.length / BATCH_SIZE) - 1) {
      setCurrentBatch(currentBatch + 1);
    }
  };
  
  // Fonction pour revenir au lot précédent
  const handlePreviousBatch = () => {
    if (currentBatch > 0) {
      setCurrentBatch(currentBatch - 1);
    }
  };
  
  // Fonction pour envoyer un email test
  const handleSendTestEmail = () => {
    if (!testEmail) {
      setError('Veuillez saisir une adresse email pour le test');
      return;
    }
    
    if (!subject) {
      setError('Veuillez saisir un sujet pour l\'email');
      return;
    }
    
    // Créer un destinataire test
    const testRecipient: Recipient = {
      email: testEmail,
      name: testName,
      company: testCompany
    };
    
    // Définir les destinataires pour l'envoi
    setRecipients([testRecipient]);
    
    // Afficher un message
    setSuccess('Email test prêt à être envoyé. Cliquez sur "Envoyer via Gmail" pour continuer.');
  };

  // Calculer le statut du lot courant
  const getCurrentBatchStatus = () => {
    const startIndex = currentBatch * BATCH_SIZE + 1;
    const endIndex = Math.min((currentBatch + 1) * BATCH_SIZE, allRecipients.length);
    const totalBatches = Math.ceil(allRecipients.length / BATCH_SIZE);
    
    return {
      startIndex,
      endIndex,
      totalBatches,
      progress: (currentBatch / (totalBatches - 1)) * 100
    };
  };

  // Vérifier si le lot actuel a déjà été envoyé
  const isBatchAlreadySent = () => {
    return batchHistory.some(record => record.batch === currentBatch);
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Envoyer la newsletter
      </Typography>
      
      {/* Bannière de reprise de session */}
      {hasSavedData && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button 
                size="small" 
                color="inherit" 
                startIcon={<RestoreIcon />}
                onClick={restoreSavedData}
              >
                Restaurer
              </Button>
              <Button 
                size="small" 
                color="inherit"
                startIcon={<DeleteIcon />} 
                onClick={clearSavedData}
              >
                Supprimer
              </Button>
            </Stack>
          }
        >
          Vous avez une session d'envoi précédente sauvegardée. Voulez-vous la restaurer?
        </Alert>
      )}
      
      {/* Gestionnaire de campagnes */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Sélectionner ou créer une campagne
        </Typography>
        <CampaignManager 
          onSelectCampaign={handleSelectCampaign} 
          selectedCampaignId={selectedCampaignId}
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Sujet de l'email"
          variant="outlined"
          fullWidth
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            localStorage.setItem('emailSubject', e.target.value);
          }}
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="Nom de l'expéditeur (optionnel)"
          variant="outlined"
          fullWidth
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="Laissez vide pour utiliser votre nom Gmail par défaut"
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Note: Pour le mode Gmail, le nom d'expéditeur peut être remplacé par celui associé à votre compte Gmail pour des raisons de sécurité.
        </Typography>
        
        {/* Section pour l'email test */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Envoyer un email test
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => setShowTestEmailForm(!showTestEmailForm)}
            sx={{ mb: 2 }}
          >
            {showTestEmailForm ? 'Masquer le formulaire de test' : 'Afficher le formulaire de test'}
          </Button>
          
          {showTestEmailForm && (
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Envoyez un email test sans avoir à importer un fichier CSV.
              </Typography>
              <TextField
                label="Email du destinataire"
                variant="outlined"
                fullWidth
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                sx={{ mb: 2 }}
                required
              />
              <TextField
                label="Nom du destinataire"
                variant="outlined"
                fullWidth
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Utilisé pour la personnalisation {nom}"
              />
              <TextField
                label="Entreprise du destinataire"
                variant="outlined"
                fullWidth
                value={testCompany}
                onChange={(e) => setTestCompany(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Utilisé pour la personnalisation {company}"
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSendTestEmail}
                disabled={!testEmail || !subject}
              >
                Préparer l'email test
              </Button>
            </Box>
          )}
        </Box>
        
        <Box sx={{ border: '1px dashed #ccc', p: 2, textAlign: 'center', mb: 2 }}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
          >
            Importer un fichier CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleCsvUpload}
            />
          </Button>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Le fichier CSV doit contenir les colonnes: email, name, company
          </Typography>
        </Box>
        
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {csvPreview.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Aperçu des données CSV (3 premiers destinataires) :
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Nom</strong></TableCell>
                    <TableCell><strong>Entreprise</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvPreview.map((recipient, index) => (
                    <TableRow key={index}>
                      <TableCell>{recipient.email}</TableCell>
                      <TableCell>{recipient.name || <em style={{ color: '#999' }}>Non spécifié</em>}</TableCell>
                      <TableCell>{recipient.company || <em style={{ color: '#999' }}>Non spécifié</em>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="text.secondary">
              Exemple de personnalisation : "Bonjour {csvPreview[0]?.name || '{{name}}'}, Une opportunité exceptionnelle pour {csvPreview[0]?.company || '{{company}}'}."
            </Typography>
          </Box>
        )}
        
        {/* Section d'envoi par lots */}
        {allRecipients.length > BATCH_SIZE && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Envoi par lots de {BATCH_SIZE} emails
            </Typography>
            
            {allRecipients.length > 0 && (
              <>
                <Box sx={{ mb: 2 }}>
                  {(() => {
                    const { startIndex, endIndex, totalBatches, progress } = getCurrentBatchStatus();
                    return (
                      <>
                        <Typography variant="body1" gutterBottom>
                          Lot actuel: <Chip color="primary" label={`${currentBatch + 1}/${totalBatches}`} /> 
                          <span style={{ marginLeft: 8 }}>
                            (contacts {startIndex}-{endIndex} sur {allRecipients.length})
                          </span>
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={progress} 
                          sx={{ height: 8, borderRadius: 1, mb: 1 }} 
                        />
                        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                          <Button 
                            variant="outlined" 
                            startIcon={<NavigateBeforeIcon />}
                            disabled={currentBatch === 0}
                            onClick={handlePreviousBatch}
                          >
                            Lot précédent
                          </Button>
                          <Button 
                            variant="outlined"
                            endIcon={<NavigateNextIcon />}
                            onClick={handleNextBatch}
                            disabled={currentBatch >= totalBatches - 1}
                          >
                            Lot suivant
                          </Button>
                        </Stack>
                      </>
                    );
                  })()}
                </Box>
                
                {isBatchAlreadySent() && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Ce lot a déjà été envoyé précédemment. Sélectionnez un autre lot ou vérifiez l'historique d'envoi.
                  </Alert>
                )}
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Diviser vos envois en lots de {BATCH_SIZE} permet d'éviter les limitations Gmail et améliore les taux de livraison.
                </Typography>
              </>
            )}
          </Box>
        )}
        
        {/* Historique des envois par lots */}
        {batchHistory.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Historique des envois ({batchHistory.length} lots)
            </Typography>
            <List sx={{ bgcolor: '#f8f8f8', borderRadius: 1 }}>
              {batchHistory.map((record, index) => {
                const batchStart = record.batch * BATCH_SIZE + 1;
                const batchEnd = Math.min((record.batch + 1) * BATCH_SIZE, allRecipients.length);
                const batchDate = new Date(record.timestamp);
                
                return (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Typography variant="body1">
                            <Chip size="small" color="primary" label={`Lot ${record.batch + 1}`} sx={{ mr: 1 }} />
                            {record.sent} envoyés, {record.failed} échoués
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" component="span" color="text.secondary">
                              Contacts {batchStart}-{batchEnd} • 
                              {` ${batchDate.toLocaleDateString()} ${batchDate.toLocaleTimeString()}`}
                            </Typography>
                          </>
                        }
                      />
                      <IconButton 
                        edge="end" 
                        aria-label="aller au lot"
                        onClick={() => setCurrentBatch(record.batch)}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </ListItem>
                    {index < batchHistory.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          </Box>
        )}
        
        <Alert severity="info" sx={{ mb: 2 }}>
          {recipients.length} destinataires prêts à recevoir la newsletter
          {allRecipients.length > 0 && ` (lot ${currentBatch + 1}/${Math.ceil(allRecipients.length / BATCH_SIZE)})`}.
        </Alert>
      </Box>
      
      <GmailSenderClient
        newsletterHtml={htmlContent}
        recipients={recipients}
        subject={subject}
        senderName={senderName}
        onComplete={handleGmailComplete}
        disabled={!selectedCampaignId}
        campaignId={selectedCampaignId}
      />
      
      {!selectedCampaignId && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Veuillez sélectionner ou créer une campagne avant d'envoyer la newsletter.
        </Alert>
      )}
    </Paper>
  );
} 