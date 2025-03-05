'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/app/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Bold, Italic, Underline, List, ListOrdered, Image, Paperclip, Save, Send, Eye, Trash2, Plus, FileText, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Papa from 'papaparse';
import { GMAIL_CONFIG } from '@/app/newsletter/components/gmail-config';
import GmailSenderClient from '../../newsletter/components/GmailSenderClient';
import { Box, TextField, Tab, Typography, Paper } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

// Types pour nos templates d'emails
type EmailTemplate = {
  id?: string;
  name: string;
  htmlContent: string;
  subject: string;
  createdAt: any;
  updatedAt: any;
};

// Type pour les destinataires
type Recipient = {
  email: string;
  name: string;
  company?: string;
};

export default function EmailProfessionnelEditor({ consultant }: { consultant: string | null }) {
  // État pour le contenu HTML de l'email
  const [htmlContent, setHtmlContent] = useState<string>('');
  // État pour le sujet de l'email
  const [subject, setSubject] = useState<string>('');
  // État pour les templates sauvegardés
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([]);
  // État pour le template sélectionné
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  // État pour le mode (édition ou envoi)
  const [activeTab, setActiveTab] = useState<number>(0);
  // État pour le nom du template à sauvegarder
  const [templateName, setTemplateName] = useState<string>('');
  // État de chargement
  const [loading, setLoading] = useState<boolean>(true);
  // État pour l'utilisateur
  const [user, setUser] = useState<User | null>(null);
  // État pour le destinataire
  const [recipient, setRecipient] = useState<string>('');
  // État pour l'objet de l'email
  const [emailSubject, setEmailSubject] = useState<string>('');
  // État pour le dialogue de sauvegarde
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  // État pour le dialogue de suppression
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  // État pour le template à supprimer
  const [templateToDelete, setTemplateToDelete] = useState<string>('');
  // Référence à l'éditeur
  const editorRef = useRef<HTMLDivElement>(null);
  // État pour les destinataires CSV
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  // État pour l'aperçu CSV
  const [csvPreview, setCsvPreview] = useState<Recipient[]>([]);
  // État pour les messages d'erreur et de succès
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  // État pour le nom de l'expéditeur
  const [senderName, setSenderName] = useState<string>('Arthur Loyd Bretagne');
  // État pour l'authentification Gmail
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // État pour les résultats d'envoi
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);
  // État pour le fichier CSV
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Charger les templates sauvegardés au chargement du composant
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("État de l'authentification mis à jour:", {
        isAuthenticated: !!currentUser,
        email: currentUser?.email,
        uid: currentUser?.uid
      });
      setUser(currentUser);
      loadSavedTemplates();
    });

    return () => unsubscribe();
  }, []);

  // Charger les templates sauvegardés depuis Firebase
  const loadSavedTemplates = async () => {
    try {
      setLoading(true);
      console.log("Chargement des templates d'emails professionnels...");
      
      // Charger les templates sauvegardés depuis Firebase
      const templatesCollection = collection(db, 'email_templates');
      const templatesSnapshot = await getDocs(templatesCollection);
      
      console.log("Résultat de la requête Firestore:", {
        success: !!templatesSnapshot,
        numberOfDocs: templatesSnapshot.size,
        empty: templatesSnapshot.empty
      });
      
      const templates = templatesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          htmlContent: data.htmlContent,
          subject: data.subject,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }) as EmailTemplate[];
      
      setSavedTemplates(templates);
      
      // Créer un template par défaut si aucun n'existe
      if (templates.length === 0) {
        console.log("Aucun template trouvé, création d'un template par défaut");
        const defaultTemplate = createDefaultTemplate();
        setHtmlContent(defaultTemplate.htmlContent);
        setSubject(defaultTemplate.subject);
      } else {
        // Charger le premier template disponible
        console.log("Templates trouvés, chargement du premier template");
        setSelectedTemplate(templates[0].id || 'default');
        setHtmlContent(templates[0].htmlContent);
        setSubject(templates[0].subject);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les templates d'emails",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Charger un template spécifique
  const loadTemplate = async (templateId: string) => {
    try {
      if (!templateId) return;
      
      setLoading(true);
      console.log(`Chargement du template ${templateId}...`);
      
      const templateDoc = await getDoc(doc(db, 'email_templates', templateId));
      
      if (templateDoc.exists()) {
        const templateData = templateDoc.data() as EmailTemplate;
        setHtmlContent(templateData.htmlContent);
        setSubject(templateData.subject);
        setSelectedTemplate(templateId);
        console.log("Template chargé avec succès");
      } else {
        console.log("Template non trouvé");
        toast({
          title: "Erreur",
          description: "Template non trouvé",
          variant: "destructive",
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le template",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Sauvegarder un template
  const saveTemplate = async () => {
    try {
      if (!templateName.trim()) {
        toast({
          title: "Erreur",
          description: "Veuillez entrer un nom pour le template",
          variant: "destructive",
        });
        return;
      }
      
      setLoading(true);
      console.log("Sauvegarde du template...");
      
      const templateData: Omit<EmailTemplate, 'id'> = {
        name: templateName,
        htmlContent,
        subject,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Ajouter un nouveau template
      const docRef = await addDoc(collection(db, 'email_templates'), templateData);
      
      // Mettre à jour la liste des templates
      setSavedTemplates([
        ...savedTemplates,
        { ...templateData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() }
      ]);
      
      // Sélectionner le nouveau template
      setSelectedTemplate(docRef.id);
      setTemplateName('');
      setShowSaveDialog(false);
      
      toast({
        title: "Succès",
        description: "Template sauvegardé avec succès",
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le template",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Mettre à jour un template existant
  const updateTemplate = async () => {
    try {
      if (!selectedTemplate) {
        toast({
          title: "Erreur",
          description: "Aucun template sélectionné",
          variant: "destructive",
        });
        return;
      }
      
      setLoading(true);
      console.log(`Mise à jour du template ${selectedTemplate}...`);
      
      const templateRef = doc(db, 'email_templates', selectedTemplate);
      
      await updateDoc(templateRef, {
        htmlContent,
        subject,
        updatedAt: serverTimestamp()
      });
      
      // Mettre à jour la liste des templates
      setSavedTemplates(
        savedTemplates.map(template => 
          template.id === selectedTemplate 
            ? { ...template, htmlContent, subject, updatedAt: new Date() } 
            : template
        )
      );
      
      toast({
        title: "Succès",
        description: "Template mis à jour avec succès",
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du template:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le template",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Supprimer un template
  const deleteTemplate = async () => {
    try {
      if (!templateToDelete) {
        toast({
          title: "Erreur",
          description: "Aucun template sélectionné pour la suppression",
          variant: "destructive",
        });
        return;
      }
      
      setLoading(true);
      console.log(`Suppression du template ${templateToDelete}...`);
      
      await deleteDoc(doc(db, 'email_templates', templateToDelete));
      
      // Mettre à jour la liste des templates
      const updatedTemplates = savedTemplates.filter(template => template.id !== templateToDelete);
      setSavedTemplates(updatedTemplates);
      
      // Si le template supprimé était sélectionné, sélectionner un autre template
      if (selectedTemplate === templateToDelete) {
        if (updatedTemplates.length > 0) {
          setSelectedTemplate(updatedTemplates[0].id || 'default');
          setHtmlContent(updatedTemplates[0].htmlContent);
          setSubject(updatedTemplates[0].subject);
        } else {
          setSelectedTemplate('default');
          const defaultTemplate = createDefaultTemplate();
          setHtmlContent(defaultTemplate.htmlContent);
          setSubject(defaultTemplate.subject);
        }
      }
      
      setTemplateToDelete('');
      setShowDeleteDialog(false);
      
      toast({
        title: "Succès",
        description: "Template supprimé avec succès",
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la suppression du template:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le template",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Charger un template par défaut
  const createDefaultTemplate = (): EmailTemplate => {
    // Créer un template par défaut avec seulement le logo dans l'en-tête et le pied de page
    const defaultHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- En-tête avec logo -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
          <img src="/images/logo-arthur-loyd.png" alt="Arthur Loyd" style="max-width: 200px; height: auto;">
        </div>
        
        <!-- Corps de l'email vide -->
        <div style="padding: 20px; min-height: 300px;">
          <!-- Le contenu sera ajouté ici -->
        </div>
        
        <!-- Pied de page avec logo -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee; font-size: 12px; color: #777;">
          <img src="/images/logo-arthur-loyd.png" alt="Arthur Loyd" style="max-width: 150px; height: auto; margin-bottom: 10px;">
          <p>Arthur Loyd - Conseil en immobilier d'entreprise</p>
        </div>
      </div>
    `;
    
    return {
      name: "Template par défaut",
      htmlContent: defaultHtml,
      subject: "Sujet par défaut",
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  // Fonction pour ajouter un élément à l'éditeur
  const addElement = (elementType: string) => {
    if (!editorRef.current) return;
    
    // Obtenir la sélection actuelle
    const selection = window.getSelection();
    if (!selection) return;
    
    // Créer un range à partir de la sélection
    const range = selection.getRangeAt(0);
    
    // Créer l'élément à insérer
    let element: HTMLImageElement | null = null;
    
    switch (elementType) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'ul':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'ol':
        document.execCommand('insertOrderedList', false);
        break;
      case 'image':
        const imageUrl = prompt('Entrez l\'URL de l\'image:');
        if (imageUrl) {
          element = document.createElement('img');
          element.src = imageUrl;
          element.style.maxWidth = '100%';
          element.alt = 'Image';
        }
        break;
      case 'attachment':
        alert('Fonctionnalité de pièce jointe non disponible pour le moment.');
        break;
      case 'font-size':
        const size = prompt('Entrez la taille de police (en px):', '16');
        if (size) {
          document.execCommand('fontSize', false, '7');
          const fontElements = editorRef.current.getElementsByTagName('font');
          if (fontElements.length > 0) {
            const lastFont = fontElements[fontElements.length - 1];
            lastFont.removeAttribute('size');
            lastFont.style.fontSize = `${size}px`;
          }
        }
        break;
      case 'font-family':
        const font = prompt('Entrez la police de caractères:', 'Arial');
        if (font) {
          document.execCommand('fontName', false, font);
        }
        break;
      case 'text-color':
        const color = prompt('Entrez la couleur du texte (nom ou code hex):', '#000000');
        if (color) {
          document.execCommand('foreColor', false, color);
        }
        break;
      case 'signature':
        // Insérer la signature du consultant
        if (consultant) {
          const signatureHtml = `
            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
              <p style="margin: 0; font-weight: bold;">${consultant}</p>
              <p style="margin: 0;">Arthur Loyd - Conseil en immobilier d'entreprise</p>
              <p style="margin: 0; font-size: 12px; color: #777;">Tel: 02 99 XX XX XX | Email: ${consultant.toLowerCase()}@arthur-loyd.com</p>
            </div>
          `;
          document.execCommand('insertHTML', false, signatureHtml);
        }
        break;
    }
    
    // Insérer l'élément créé s'il existe
    if (element) {
      range.deleteContents();
      range.insertNode(element);
      range.setStartAfter(element);
      range.setEndAfter(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Mettre à jour le contenu HTML
    setHtmlContent(editorRef.current.innerHTML);
  };

  // Simuler l'envoi d'un email
  const handleSendEmail = () => {
    if (!recipient) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un destinataire",
        variant: "destructive",
      });
      return;
    }
    
    if (!emailSubject) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un objet pour l'email",
        variant: "destructive",
      });
      return;
    }
    
    // Simuler l'envoi d'un email
    toast({
      title: "Email envoyé",
      description: `Email envoyé à ${recipient}`,
    });
  };

  // Copier le contenu de l'email dans le presse-papier
  const handleCopyToClipboard = () => {
    const fullEmail = `Objet: ${emailSubject || subject}\n\n${htmlContent.replace(/<[^>]*>/g, '')}`;
    navigator.clipboard.writeText(fullEmail);
    toast({
      title: "Copié !",
      description: "L'email a été copié dans le presse-papier",
    });
  };

  // Gérer l'upload de fichier CSV
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

  // Vérifier le statut d'authentification Gmail
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

  // Gérer l'authentification Gmail
  const handleAuthenticate = () => {
    try {
      // Construire l'URL de redirection basée sur l'origine actuelle
      const origin = window.location.origin;
      const redirectUri = `${origin}/newsletter/oauth-redirect`;
      
      // Construire l'URL d'authentification Google
      const { CLIENT_ID, SCOPES } = GMAIL_CONFIG;
      const scope = encodeURIComponent(SCOPES);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `access_type=offline&` +
        `prompt=consent`;
      
      // Ouvrir la fenêtre d'authentification
      const authWindow = window.open(authUrl, 'oauth', 'width=600,height=600');
      
      if (!authWindow) {
        setError('Impossible d\'ouvrir la fenêtre d\'authentification. Veuillez vérifier que les popups sont autorisés.');
        return;
      }
      
      // Vérifier périodiquement si l'authentification est terminée
      const checkAuth = setInterval(async () => {
        try {
          if (authWindow.closed) {
            clearInterval(checkAuth);
            
            // Vérifier si l'authentification a réussi
            const response = await fetch('/api/gmail-auth');
            const data = await response.json();
            
            if (data.isAuthenticated) {
              setIsAuthenticated(true);
              setSuccess('Authentification Gmail réussie!');
            }
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'authentification:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de l\'authentification:', error);
      setError('Erreur lors de l\'authentification Gmail');
    }
  };

  // Gérer la déconnexion Gmail
  const handleLogout = async () => {
    try {
      await fetch('/api/gmail-auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setSuccess('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setError('Erreur lors de la déconnexion');
    }
  };

  // Gérer l'envoi d'email via Gmail
  const handleGmailSend = async () => {
    if (!isAuthenticated) {
      setError('Veuillez vous connecter à Gmail d\'abord');
      return;
    }
    
    if (recipients.length === 0) {
      setError('Veuillez ajouter au moins un destinataire');
      return;
    }
    
    if (!subject) {
      setError('Veuillez spécifier un sujet pour l\'email');
      return;
    }
    
    try {
      setLoading(true);
      
      // Envoyer les emails via l'API
      const response = await fetch('/api/gmail-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          subject,
          htmlContent,
          senderName,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSendResult(result);
        setSuccess(`${result.success} emails envoyés avec succès.`);
      } else {
        setError(`Erreur: ${result.message || 'Échec de l\'envoi des emails'}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des emails:', error);
      setError('Erreur lors de l\'envoi des emails');
    } finally {
      setLoading(false);
    }
  };

  // Gérer la complétion de l'envoi Gmail
  const handleGmailComplete = (results: { success: number; failed: number }) => {
    setSendResult(results);
    if (results.success > 0) {
      toast.success(`${results.success} email(s) envoyé(s) avec succès`);
    }
    if (results.failed > 0) {
      toast.error(`${results.failed} email(s) n'ont pas pu être envoyés`);
    }
  };

  // Gérer le changement d'onglet
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Si en chargement, afficher un indicateur
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      {/* Onglets pour basculer entre l'édition et l'envoi */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="options d'éditeur email">
          <Tab label="Éditer" id="tab-0" />
          <Tab label="Envoyer" id="tab-1" />
        </Tabs>
      </Box>

      {/* Onglet d'édition */}
      {activeTab === 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          {/* Sélection de template */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Sélectionner un template
            </label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => loadTemplate(e.target.value)}
                className="px-3 py-2 border rounded-md w-full"
              >
                {savedTemplates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                title="Sauvegarder comme nouveau template"
              >
                <SaveIcon className="h-4 w-4 mr-2" />
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                title="Supprimer ce template"
                disabled={savedTemplates.length <= 1}
              >
                <DeleteIcon className="h-4 w-4 mr-2" />
              </button>
            </div>
          </div>

          {/* Sujet de l'email */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Sujet de l'email
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="px-3 py-2 border rounded-md w-full"
              placeholder="Sujet de l'email"
            />
          </div>

          {/* Éditeur de contenu */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Contenu de l'email
            </label>
            <div className="border rounded-md">
              <div className="flex items-center gap-1 p-2 bg-gray-50 border-b">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => addElement('bold')}
                  title="Gras"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => addElement('italic')}
                  title="Italique"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => addElement('underline')}
                  title="Souligné"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => addElement('ul')}
                  title="Liste à puces"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => addElement('ol')}
                  title="Liste numérotée"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => addElement('image')}
                  title="Insérer une image"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => addElement('attachment')}
                  title="Ajouter une pièce jointe"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              <div
                ref={editorRef}
                className="min-h-[400px] p-4 focus:outline-none"
                contentEditable
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                onBlur={(e) => setHtmlContent(e.currentTarget.innerHTML)}
              />
            </div>
          </div>

          {/* Aperçu de l'email */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Aperçu</h3>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={htmlContent}
                className="w-full h-[500px]"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Onglet d'envoi */}
      {activeTab === 1 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Envoyer l'email</h3>
          
          {/* Formulaire d'envoi */}
          <div className="space-y-4">
            {/* Sujet de l'email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Sujet de l'email
              </label>
              <TextField
                fullWidth
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="Sujet de l'email"
              />
            </div>
            
            {/* Nom de l'expéditeur */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Nom de l'expéditeur (optionnel)
              </label>
              <TextField
                fullWidth
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                variant="outlined"
                size="small"
                placeholder="Arthur Loyd Bretagne"
              />
            </div>
            
            {/* Import de fichier CSV */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Importez un fichier CSV de destinataires
              </label>
              <Button
                variant="contained"
                component="label"
                startIcon={<Upload className="h-4 w-4 mr-2" />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Importer CSV
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleCsvUpload}
                />
              </Button>
              
              {error && (
                <Alert severity="error" className="mt-2">
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" className="mt-2">
                  {success}
                </Alert>
              )}
              
              {csvPreview.length > 0 && (
                <div className="mt-4">
                  <Typography variant="subtitle2">
                    Aperçu des destinataires:
                  </Typography>
                  <Paper variant="outlined" className="mt-2 p-2">
                    <ul className="list-disc pl-5">
                      {csvPreview.map((recipient, index) => (
                        <li key={index}>
                          {recipient.name || recipient.email} {recipient.company && `(${recipient.company})`}
                        </li>
                      ))}
                      {recipients.length > 3 && (
                        <li className="text-gray-500 italic">
                          ...et {recipients.length - 3} autres
                        </li>
                      )}
                    </ul>
                  </Paper>
                </div>
              )}
            </div>
            
            {/* Envoi via Gmail */}
            <div className="mt-6">
              <Typography variant="subtitle1" fontWeight="bold">
                Envoi via Gmail
              </Typography>
              <GmailSenderClient
                newsletterHtml={htmlContent}
                recipients={recipients}
                subject={subject}
                senderName={senderName}
                onComplete={handleGmailComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dialogue de sauvegarde */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Sauvegarder le template</h3>
            <TextField
              fullWidth
              label="Nom du template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              variant="outlined"
              size="small"
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outlined" 
                onClick={() => setShowSaveDialog(false)}
              >
                Annuler
              </Button>
              <Button 
                variant="contained" 
                onClick={saveTemplate}
                disabled={!templateName}
                className="bg-green-600 hover:bg-green-700"
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue de suppression */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Supprimer le template</h3>
            <p className="mb-4">Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outlined" 
                onClick={() => setShowDeleteDialog(false)}
              >
                Annuler
              </Button>
              <Button 
                variant="contained" 
                onClick={deleteTemplate}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 