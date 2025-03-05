'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/app/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
import { AlertCircle, Bold, Italic, Underline, List, ListOrdered, Image, Paperclip, Save, Send, Eye, Trash2, Plus, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Types pour nos templates d'emails
type EmailTemplate = {
  id?: string;
  name: string;
  htmlContent: string;
  subject: string;
  createdAt: any;
  updatedAt: any;
};

export default function EmailProfessionnelEditor() {
  // État pour le contenu HTML de l'email
  const [htmlContent, setHtmlContent] = useState<string>('');
  // État pour le sujet de l'email
  const [subject, setSubject] = useState<string>('');
  // État pour les templates sauvegardés
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([]);
  // État pour le template sélectionné
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  // État pour le mode (édition ou envoi)
  const [activeTab, setActiveTab] = useState<string>('edit');
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
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  // État pour le dialogue de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  // État pour le template à supprimer
  const [templateToDelete, setTemplateToDelete] = useState<string>('');
  // Référence à l'éditeur
  const editorRef = useRef<HTMLDivElement>(null);

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
        setSelectedTemplate(templates[0].id || '');
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
      setSaveDialogOpen(false);
      
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
          setSelectedTemplate(updatedTemplates[0].id || '');
          setHtmlContent(updatedTemplates[0].htmlContent);
          setSubject(updatedTemplates[0].subject);
        } else {
          setSelectedTemplate('');
          const defaultTemplate = createDefaultTemplate();
          setHtmlContent(defaultTemplate.htmlContent);
          setSubject(defaultTemplate.subject);
        }
      }
      
      setTemplateToDelete('');
      setDeleteDialogOpen(false);
      
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

  // Créer un template par défaut
  const createDefaultTemplate = (): EmailTemplate => {
    return {
      name: 'Template par défaut',
      subject: 'Opportunité immobilière exceptionnelle',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-2zK5QMuADUDloHaTHRigGM1AMVs4hq.png" alt="Arthur Loyd" style="max-width: 200px;">
          </div>
          
          <p style="margin-bottom: 15px;">Bonjour {{name}},</p>
          
          <p style="margin-bottom: 15px;">J'espère que ce message vous trouve en pleine forme.</p>
          
          <p style="margin-bottom: 15px;">Je me permets de vous contacter au sujet d'une opportunité immobilière exceptionnelle qui pourrait intéresser {{company}}.</p>
          
          <p style="margin-bottom: 15px;">Il s'agit d'un local commercial de 150m² situé en plein centre-ville de Rennes, dans un quartier en pleine expansion. Ce bien bénéficie d'une excellente visibilité et d'un fort passage piéton.</p>
          
          <p style="margin-bottom: 15px;">Caractéristiques principales :</p>
          <ul style="margin-bottom: 15px;">
            <li>Surface : 150m²</li>
            <li>Emplacement : Centre-ville de Rennes</li>
            <li>Disponibilité : Immédiate</li>
            <li>Loyer : 2 500€ HT/mois</li>
          </ul>
          
          <p style="margin-bottom: 15px;">Je reste à votre disposition pour organiser une visite ou vous fournir des informations complémentaires.</p>
          
          <p style="margin-bottom: 15px;">Bien cordialement,</p>
          
          <p style="margin-bottom: 15px;">{{consultant}}<br>Arthur Loyd Bretagne</p>
          
          <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #777; text-align: center;">
            <p>Arthur Loyd Bretagne - 1 Place de la Gare, 35000 Rennes</p>
            <p>Pour vous désinscrire, <a href="https://etatdeslieux.vercel.app/unsubscribe?email={{email}}" style="color: #777;">cliquez ici</a></p>
          </div>
        </div>
      `,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  // Ajouter un élément au contenu HTML
  const addElement = (elementType: string) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    
    if (!range) return;
    
    let newElement = '';
    
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
          newElement = `<div style="text-align: center; margin: 15px 0;"><img src="${imageUrl}" alt="Image" style="max-width: 100%; height: auto;"></div>`;
          document.execCommand('insertHTML', false, newElement);
        }
        break;
      case 'attachment':
        toast({
          title: "Information",
          description: "La fonctionnalité d'attachement sera disponible prochainement",
        });
        break;
      default:
        break;
    }
    
    // Mettre à jour le contenu HTML après modification
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

  return (
    <div className="w-full">
      <Toaster />
      
      <Tabs defaultValue="edit" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="edit">Édition</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
          <TabsTrigger value="send">Envoi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="template-select">Template</Label>
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={(value) => loadTemplate(value)}
                  >
                    <SelectTrigger id="template-select">
                      <SelectValue placeholder="Sélectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id || ''}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 self-end">
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Sauvegarder le template</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="template-name">Nom du template</Label>
                        <Input
                          id="template-name"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Nom du template"
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={saveTemplate} disabled={loading}>
                          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="default" 
                    onClick={updateTemplate} 
                    disabled={!selectedTemplate || loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Mettre à jour
                  </Button>
                  
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        disabled={!selectedTemplate}
                        onClick={() => setTemplateToDelete(selectedTemplate)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <p>Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.</p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button variant="destructive" onClick={deleteTemplate} disabled={loading}>
                          {loading ? 'Suppression...' : 'Supprimer'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div>
                <Label htmlFor="email-subject">Sujet de l'email</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Sujet de l'email"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Contenu de l'email</Label>
                <div className="border rounded-md mt-2">
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
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Variables disponibles</AlertTitle>
                <AlertDescription>
                  Utilisez ces variables pour personnaliser votre email : {'{{'}'name{'}}'},  {'{{'}'company{'}}'},  {'{{'}'email{'}}'},  {'{{'}'consultant{'}}'} 
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu de l'email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4">
                <div className="mb-4 pb-4 border-b">
                  <p className="font-semibold">Sujet: {subject}</p>
                </div>
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Envoi de l'email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recipient">Destinataire</Label>
                <Input
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Adresse email du destinataire"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="send-subject">Objet</Label>
                <Input
                  id="send-subject"
                  value={emailSubject || subject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Objet de l'email"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Aperçu du contenu</Label>
                <div className="border rounded-md p-4 mt-2 max-h-[300px] overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleCopyToClipboard} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Copier
                </Button>
                <Button onClick={handleSendEmail} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 