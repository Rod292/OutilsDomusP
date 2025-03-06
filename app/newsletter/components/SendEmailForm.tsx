'use client';

import { useState, useEffect } from 'react';
import { 
  Button, Box, Typography, TextField, Paper, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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

export default function SendEmailForm({ htmlContent }: SendEmailFormProps) {
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('Arthur Loyd Bretagne');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
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
  }, []);

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
              
              // Log pour débogage
              console.log('Destinataire traité:', recipient);
              
              return recipient;
            });
          
          if (parsedRecipients.length === 0) {
            setError('Aucun destinataire valide trouvé dans le fichier CSV');
            return;
          }
          
          setRecipients(parsedRecipients);
          // Afficher un aperçu des 3 premiers destinataires
          setCsvPreview(parsedRecipients.slice(0, 3));
          setSuccess(`${parsedRecipients.length} destinataires chargés avec succès.${!hasNameColumn || !hasCompanyColumn ? '\nNote: Certaines colonnes sont manquantes, la personnalisation sera limitée.' : ''}`);
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
      setSuccess(`${results.success} emails envoyés avec succès via Gmail.`);
      
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

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Envoyer la newsletter
      </Typography>
      
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
          onChange={(e) => setSubject(e.target.value)}
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
        
        {recipients.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {recipients.length} destinataires prêts à recevoir la newsletter.
          </Alert>
        )}
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