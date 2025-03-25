'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { uploadImage } from '@/lib/firebase';
import SendEmailForm from './SendEmailForm';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { Editor } from '@tinymce/tinymce-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GmailSenderClient from './GmailSenderClient';
import { 
  Send, Save, History, Edit, Eye, RefreshCw, 
  Bold, Italic, Underline, List, ListOrdered, Link,
  Mail, Maximize, Minimize
} from 'lucide-react';

// Récupérer la clé API TinyMCE depuis les variables d'environnement ou utiliser la clé en dur comme fallback
const TINYMCE_API_KEY = process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'r4grgrcqwxc80gk44x3aaiqm3rqa29t3utou9a0224ixu4gc';

// Types pour TinyMCE
type TinyMCEEditor = {
  getContent: () => string;
  on: (event: string, callback: () => void) => void;
};

interface TinyMCEInitEvent {
  readonly target: unknown;
  readonly type: string;
}

// Types pour nos templates d'avis Google
type AvisGoogleTemplate = {
  id?: string;
  name: string;
  sections: AvisGoogleSection[];
  createdAt: Date;
  updatedAt: Date;
};

type AvisGoogleSection = {
  id: string;
  type: 'header' | 'content' | 'footer';
  content: {
    logo?: string;
    title?: string;
    subtitle?: string;
    greeting?: string;
    content?: string;
    signature?: string;
    socialLinks?: Array<{
      platform: string;
      url: string;
    }>;
  };
};

export default function AvisGoogleEditorVisual() {
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // États
  const [sections, setSections] = useState<AvisGoogleSection[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<AvisGoogleTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [mode, setMode] = useState<'edit' | 'preview' | 'send'>('edit');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState<'nouveau' | 'relance'>('nouveau');
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('Arthur Loyd Bretagne');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewExpanded, setPreviewExpanded] = useState<boolean>(false);

  // Charger le template par défaut
  useEffect(() => {
    loadDefaultTemplate();
    // Définir l'objet du mail en fonction du type de message
    if (selectedTab === 'nouveau') {
      setEmailSubject('Merci pour votre confiance !');
    } else {
      setEmailSubject('Déjà X an(s) dans vos locaux !');
    }
  }, [selectedTab]);

  // Surveiller l'authentification
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Toujours utiliser "Arthur Loyd Bretagne" comme nom d'expéditeur par défaut
      setSenderName('Arthur Loyd Bretagne');
    });
    return () => unsubscribe();
  }, []);

  // Mettre à jour le contenu quand les sections changent
  useEffect(() => {
    const contentSection = sections.find(s => s.type === 'content');
    if (contentSection) {
      setEmailContent(contentSection.content.content || '');
    }
  }, [sections]);

  // Mettre à jour la prévisualisation HTML quand les sections changent
  useEffect(() => {
    if (mode === 'preview' || mode === 'send') {
      setPreviewHtml(generateHtml(sections));
    }
  }, [sections, mode]);

  const loadDefaultTemplate = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/avis-google/default-template?type=${selectedTab}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du template');
      }
      
      const data = await response.json();
      setSections(parseHtmlToSections(data.htmlContent));
    } catch (error) {
      console.error('Erreur:', error);
      setError('Impossible de charger le template. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      
      const updatedSections = sections.map(section => {
        if (section.type === 'content') {
          return {
            ...section,
            content: {
              ...section.content,
              content: content
            }
          };
        }
        return section;
      });

      setSections(updatedSections);
      setEmailContent(content);
      
      // Mettre à jour la prévisualisation si nécessaire
      if (mode === 'preview') {
        setPreviewHtml(generateHtml(updatedSections));
      }
      
      toast.success("Contenu mis à jour avec succès");
    }
  };

  const parseHtmlToSections = (html: string): AvisGoogleSection[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const container = doc.querySelector('.container');
    
    if (!container) return [];

    const sections: AvisGoogleSection[] = [];

    // Header section
    const logo = container.querySelector('.logo') as HTMLImageElement;
    if (logo) {
      sections.push({
        id: 'header',
        type: 'header',
        content: {
          logo: logo.src
        }
      });
    }

    // Content section
    const content = container.querySelector('.content');
    if (content) {
      sections.push({
        id: 'content',
        type: 'content',
        content: {
          content: content.innerHTML
        }
      });
    }

    // Footer section
    const footer = container.querySelector('.footer');
    const signature = footer ? footer.querySelector('.signature') : container.querySelector('.signature');
    const socialLinks = Array.from(container.querySelectorAll('.social-link')).map(link => ({
      platform: link.textContent || '',
      url: (link as HTMLAnchorElement).href
    }));

    if (signature || socialLinks.length > 0) {
      sections.push({
        id: 'footer',
        type: 'footer',
        content: {
          signature: signature?.textContent || '',
          socialLinks
        }
      });
    }

    return sections;
  };

  const generateHtml = (sections: AvisGoogleSection[]): string => {
    const headerSection = sections.find(s => s.type === 'header');
    const contentSection = sections.find(s => s.type === 'content');
    const footerSection = sections.find(s => s.type === 'footer');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Poppins, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1A1A1A;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #FFFFFF;
          }
          .logo { 
            max-width: 200px; 
            margin-bottom: 20px; 
          }
          .small-logo {
            max-width: 120px;
            margin-bottom: 15px;
            display: block;
          }
          .content {
            margin: 20px 0;
          }
          .footer {
            background-color: #464254;
            padding: 20px;
            color: #FFFFFF;
            text-align: center;
            border-radius: 4px;
          }
          .signature {
            font-style: italic;
            margin-top: 15px;
          }
          .social-links {
            margin-top: 15px;
            display: flex;
            justify-content: center;
            gap: 10px;
          }
          .social-link {
            color: #FFFFFF;
            text-decoration: none;
          }
          .cta-button {
            display: inline-block;
            background-color: #DC0032;
            color: #FFFFFF;
            padding: 10px 24px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${headerSection?.content.logo ? `<img src="${headerSection.content.logo}" alt="Logo" class="logo">` : ''}
          <div class="content">
            ${contentSection?.content.content || ''}
          </div>
          ${footerSection ? `
            <div class="footer">
              ${footerSection.content.signature ? `<div class="signature">${footerSection.content.signature}</div>` : ''}
              ${footerSection.content.socialLinks && footerSection.content.socialLinks.length > 0 ? `
                <div class="social-links">
                  ${footerSection.content.socialLinks.map(link => `
                    <a href="${link.url}" class="social-link">${link.platform}</a>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  };
  
  // Gestion de la prévisualisation en plein écran
  const togglePreviewExpand = () => {
    setPreviewExpanded(!previewExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
        <p className="font-medium">{error}</p>
        <Button 
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={loadDefaultTemplate}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Tabs 
        defaultValue={selectedTab} 
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value as 'nouveau' | 'relance')}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="nouveau">Nouveau client</TabsTrigger>
            <TabsTrigger value="relance">Relance client</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button 
              variant={mode === 'edit' ? "default" : "outline"}
              onClick={() => setMode('edit')}
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Éditer
            </Button>
            <Button 
              variant={mode === 'preview' ? "default" : "outline"}
              onClick={() => {
                handleUpdateContent();
                setMode('preview');
              }}
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
            <Button 
              variant={mode === 'send' ? "default" : "outline"}
              onClick={() => {
                handleUpdateContent();
                setMode('send');
              }}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </div>

        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            {mode === 'edit' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Objet de l'email</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full"
                    placeholder="Entrez l'objet de l'email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tinymce-editor">Contenu de l'email</Label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <Editor
                      id="tinymce-editor"
                      apiKey={TINYMCE_API_KEY}
                      onInit={(evt, editor) => editorRef.current = editor as any}
                      initialValue={emailContent}
                      init={{
                        height: 500,
                        menubar: false,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                          'insertdatetime', 'media', 'table', 'preview', 'wordcount'
                        ],
                        toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | removeformat | code',
                        content_style: 'body { font-family:Poppins,Arial,sans-serif; font-size:14px }',
                        skin: 'oxide',
                        skin_url: '/tinymce/skins/ui/oxide',
                        content_css: '/tinymce/skins/content/default/content.css',
                        branding: false,
                        // Ajouter la gestion des templates
                        templates: [
                          { title: 'Demande d\'avis', description: 'Template pour demander un avis Google', content: '<p>Bonjour [Nom],</p><p>Nous tenons à vous remercier de votre confiance. Votre avis compte énormément pour nous !</p><p>Pourriez-vous prendre quelques instants pour partager votre expérience sur Google ? Cela nous aiderait beaucoup dans notre visibilité.</p><p><a href="https://g.page/r/CY5qQsrZgBTHEAg/review" class="cta-button">Laisser un avis Google</a></p><p>Merci d\'avance pour votre temps.</p><p>Cordialement,</p>' },
                          { title: 'Relance client', description: 'Template pour relancer un client', content: '<p>Bonjour [Nom],</p><p>Cela fait maintenant [X] an(s) que vous êtes dans vos locaux. Nous espérons que vous y êtes bien installés !</p><p>Nous serions ravis de savoir comment se passe votre expérience. Pourriez-vous partager votre avis sur Google ?</p><p><a href="https://g.page/r/CY5qQsrZgBTHEAg/review" class="cta-button">Laisser un avis Google</a></p><p>Merci d\'avance pour votre retour.</p><p>Cordialement,</p>' }
                        ]
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={loadDefaultTemplate}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleUpdateContent}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}
            
            {mode === 'preview' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Aperçu de l'email</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePreviewExpand}
                  >
                    {previewExpanded ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
                    {previewExpanded ? 'Réduire' : 'Agrandir'}
                  </Button>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-4">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">De:</span> {senderName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Objet:</span> {emailSubject}
                    </p>
                  </div>
                </div>
                
                <div 
                  ref={previewRef}
                  className={`border border-gray-200 dark:border-gray-700 rounded-md overflow-auto bg-white ${previewExpanded ? 'fixed inset-4 z-50' : 'h-[500px]'}`}
                >
                  <div className={`${previewExpanded ? 'p-8' : 'p-4'}`}>
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-full border-0"
                      style={{ height: previewExpanded ? 'calc(100vh - 120px)' : '460px' }}
                    ></iframe>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="default"
                    onClick={() => setMode('send')}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Passer à l'envoi
                  </Button>
                </div>
              </div>
            )}
            
            {mode === 'send' && (
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <h3 className="text-amber-800 dark:text-amber-300 font-medium flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Préparation à l'envoi
                  </h3>
                  <p className="text-amber-700 dark:text-amber-400 mt-2">
                    Vous allez envoyer des demandes d'avis Google à vos clients. Vérifiez l'aperçu de l'email avant de continuer.
                  </p>
                  
                  <div className="mt-4 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMode('preview')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir l'aperçu
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMode('edit')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier le contenu
                    </Button>
                  </div>
                </div>
                
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <GmailSenderClient
                      newsletterHtml={previewHtml}
                      recipients={[]}
                      subject={emailSubject}
                      senderName={senderName}
                      onComplete={(results) => {
                        console.log('Résultats de l\'envoi:', results);
                        toast.success(`${results.success} emails envoyés avec succès. ${results.failed} échecs.`);
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
} 