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

// URLs des logos - Utiliser les URL absolues avec l'origine
const HEADER_LOGO_URL = "/images/logo-arthur-loyd.png";
const FOOTER_LOGO_URL = "/images/mailing/logo-createur-de-possibilites.png";

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
  const [selectedTab, setSelectedTab] = useState<'nouveau' | 'relance' | 'bailleur'>('nouveau');
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('Arthur Loyd Bretagne');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewExpanded, setPreviewExpanded] = useState<boolean>(false);
  const [testEmail, setTestEmail] = useState<string>('');
  const [testName, setTestName] = useState<string>('');
  const [showTestForm, setShowTestForm] = useState<boolean>(false);

  // Charger le template par défaut
  useEffect(() => {
    loadDefaultTemplate();
    // Définir l'objet du mail en fonction du type de message
    if (selectedTab === 'nouveau') {
      setEmailSubject('Merci pour votre confiance !');
    } else if (selectedTab === 'relance') {
      setEmailSubject('Déjà X an(s) dans vos locaux !');
    } else if (selectedTab === 'bailleur') {
      setEmailSubject('Merci pour votre collaboration !');
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
      
      // Vérifier si htmlContent est vide ou manquant et fournir un contenu par défaut
      if (!data.htmlContent) {
        const defaultContent = getDefaultContent(selectedTab);
        setSections([
          {
            id: 'header',
            type: 'header',
            content: {
              logo: HEADER_LOGO_URL
            }
          },
          {
            id: 'content',
            type: 'content',
            content: {
              content: defaultContent
            }
          },
          {
            id: 'footer',
            type: 'footer',
            content: {
              signature: 'Arthur Loyd Bretagne',
              socialLinks: [
                { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/arthur-loyd-bretagne/' },
                { platform: 'Instagram', url: 'https://www.instagram.com/arthurloydbretagne/' },
                { platform: 'Site Web', url: 'https://www.arthur-loyd.com/brest' }
              ]
            }
          }
        ]);
      } else {
        setSections(parseHtmlToSections(data.htmlContent));
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Impossible de charger le template. Veuillez réessayer.');
      
      // Fournir un contenu par défaut en cas d'erreur
      const defaultContent = getDefaultContent(selectedTab);
      setSections([
        {
          id: 'header',
          type: 'header',
          content: {
            logo: HEADER_LOGO_URL
          }
        },
        {
          id: 'content',
          type: 'content',
          content: {
            content: defaultContent
          }
        },
        {
          id: 'footer',
          type: 'footer',
          content: {
            signature: 'Arthur Loyd Bretagne',
            socialLinks: [
              { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/arthur-loyd-bretagne/' },
              { platform: 'Instagram', url: 'https://www.instagram.com/arthurloydbretagne/' },
              { platform: 'Site Web', url: 'https://www.arthur-loyd.com/brest' }
            ]
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir le contenu par défaut en fonction du type de message
  const getDefaultContent = (type: 'nouveau' | 'relance' | 'bailleur') => {
    switch (type) {
      case 'nouveau':
        return `
          <p>Bonjour [Nom],</p>
          <p>Nous tenons à vous remercier de votre confiance. Votre avis compte énormément pour nous !</p>
          <p>Pourriez-vous prendre quelques instants pour partager votre expérience sur Google ? Cela nous aiderait beaucoup dans notre visibilité.</p>
          <p><a href="https://g.page/r/CY5qQsrZgBTHEAg/review" class="cta-button">Laisser un avis Google</a></p>
          <p>Merci d'avance pour votre temps.</p>
          <p>Cordialement,</p>
        `;
      case 'relance':
        return `
          <p>Bonjour [Nom],</p>
          <p>Cela fait maintenant [X] an(s) que vous êtes dans vos locaux. Nous espérons que vous y êtes bien installés !</p>
          <p>Nous serions ravis de savoir comment se passe votre expérience. Pourriez-vous partager votre avis sur Google ?</p>
          <p><a href="https://g.page/r/CY5qQsrZgBTHEAg/review" class="cta-button">Laisser un avis Google</a></p>
          <p>Merci d'avance pour votre retour.</p>
          <p>Cordialement,</p>
        `;
      case 'bailleur':
        return `
          <p>Bonjour [Nom],</p>
          <p>Nous tenons à vous remercier pour votre collaboration. En tant que bailleur, votre confiance en nos services est très importante pour nous.</p>
          <p>Si vous avez un moment, nous serions très reconnaissants si vous pouviez partager votre expérience avec Arthur Loyd Bretagne sur Google.</p>
          <p><a href="https://g.page/r/CY5qQsrZgBTHEAg/review" class="cta-button">Laisser un avis Google</a></p>
          <p>Merci d'avance pour votre temps.</p>
          <p>Cordialement,</p>
        `;
      default:
        return '';
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
      
      // Afficher le toast de succès uniquement si on est dans le mode édition
      if (mode === 'edit') {
        toast.success("Contenu mis à jour avec succès");
      }
      
      return updatedSections; // Retourner les sections mises à jour pour une utilisation externe
    }
    
    return sections; // Retourner les sections actuelles si pas de mise à jour
  };

  const parseHtmlToSections = (html: string): AvisGoogleSection[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const container = doc.querySelector('.newsletter-container') || doc.querySelector('.container');
    
    if (!container) return getDefaultSections();

    const sections: AvisGoogleSection[] = [];

    // Header section
    const logo = container.querySelector('.logo') as HTMLImageElement;
    if (logo) {
      sections.push({
        id: 'header',
        type: 'header',
        content: {
          logo: logo.src || HEADER_LOGO_URL
        }
      });
    } else {
      sections.push({
        id: 'header',
        type: 'header',
        content: {
          logo: HEADER_LOGO_URL
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
          content: content.innerHTML || getDefaultContent(selectedTab)
        }
      });
    } else {
      sections.push({
        id: 'content',
        type: 'content',
        content: {
          content: getDefaultContent(selectedTab)
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

    sections.push({
      id: 'footer',
      type: 'footer',
      content: {
        signature: signature?.textContent || 'Arthur Loyd Bretagne',
        socialLinks: socialLinks.length > 0 ? socialLinks : [
          { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/arthur-loyd-bretagne/' },
          { platform: 'Instagram', url: 'https://www.instagram.com/arthurloydbretagne/' },
          { platform: 'Site Web', url: 'https://www.arthur-loyd.com/brest' }
        ]
      }
    });

    return sections;
  };

  // Obtenir des sections par défaut si le parsing échoue
  const getDefaultSections = (): AvisGoogleSection[] => {
    return [
      {
        id: 'header',
        type: 'header',
        content: {
          logo: HEADER_LOGO_URL
        }
      },
      {
        id: 'content',
        type: 'content',
        content: {
          content: getDefaultContent(selectedTab)
        }
      },
      {
        id: 'footer',
        type: 'footer',
        content: {
          signature: 'Arthur Loyd Bretagne',
          socialLinks: [
            { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/arthur-loyd-bretagne/' },
            { platform: 'Instagram', url: 'https://www.instagram.com/arthurloydbretagne/' },
            { platform: 'Site Web', url: 'https://www.arthur-loyd.com/brest' }
          ]
        }
      }
    ];
  };

  // Générer des URLs absolues pour les ressources
  const getAbsoluteUrl = (path: string): string => {
    // En développement, utiliser le localhost
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // S'assurer que le chemin commence par un slash
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${origin}${normalizedPath}`;
    }
    // Fallback pour SSR
    return path;
  };

  const generateHtml = (sections: AvisGoogleSection[]): string => {
    const headerSection = sections.find(s => s.type === 'header');
    const contentSection = sections.find(s => s.type === 'content');
    const footerSection = sections.find(s => s.type === 'footer');

    // Transformer les URLs relatives en URLs absolues
    const headerLogoUrl = getAbsoluteUrl(headerSection?.content.logo || HEADER_LOGO_URL);
    const footerLogoUrl = getAbsoluteUrl(FOOTER_LOGO_URL);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
            color: #333333;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          .newsletter-container {
            width: 100%;
            max-width: 700px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            padding: 20px;
            background-color: #ffffff;
          }
          .logo {
            max-width: 180px;
            width: 180px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          .content {
            padding: 30px 20px;
          }
          .footer {
            background-color: #464254 !important;
            color: #ffffff;
            padding: 50px 20px;
            text-align: center;
            font-size: 14px;
            line-height: 1.8;
          }
          .footer img {
            max-width: 400px;
            width: 100%;
            height: auto;
            display: inline-block;
          }
          .social-links {
            margin: 25px 0;
          }
          .social-links a {
            color: #ffffff;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            display: block;
            padding: 8px 5px;
            border-radius: 4px;
            background-color: #363143;
            white-space: nowrap;
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
          
          @media only screen and (max-width: 600px) {
            .footer img {
              max-width: 90%;
            }
            .logo {
              max-width: 160px !important;
              width: 160px !important;
              margin: 0 auto !important;
              display: block !important;
              float: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="newsletter-container">
          <!-- En-tête fixe -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 20px; text-align: center;">
                <img src="${headerLogoUrl}" alt="Arthur Loyd Logo" class="logo" width="180" height="auto" style="display: block; margin: 0 auto; float: none; text-align: center;">
              </td>
            </tr>
          </table>
          
          <!-- Corps de la newsletter -->
          <div class="content">
            ${contentSection?.content.content || ''}
          </div>
          
          <!-- Pied de page fixe -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#464254" style="background-color: #464254 !important; background: #464254 !important; mso-background-themecolor: #464254 !important;">
            <tr bgcolor="#464254" style="background-color: #464254 !important;">
              <td align="center" bgcolor="#464254" style="padding: 50px 20px; color: #ffffff; text-align: center; font-size: 14px; line-height: 1.8; background-color: #464254 !important; background: #464254 !important;">
                <!-- Table wrapper pour garantir la couleur de fond -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#464254" style="background-color: #464254 !important; background: #464254 !important;">
                  <tr bgcolor="#464254" style="background-color: #464254 !important;">
                    <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 0;">
                      <img src="${footerLogoUrl}" alt="Arthur Loyd - Créateur de possibilités" style="width: 400px; max-width: 100%; height: auto; display: inline-block;" width="400">
                    </td>
                  </tr>
                  <tr bgcolor="#464254" style="background-color: #464254 !important;">
                    <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 25px 0;">
                      <!-- Séparateur dans le footer -->
                      <table border="0" cellpadding="0" cellspacing="0" width="50" bgcolor="#464254" style="background-color: #464254 !important;">
                        <tr bgcolor="#464254" style="background-color: #464254 !important;">
                          <td height="3" bgcolor="#464254" style="background-color: rgba(255,255,255,0.3); height: 3px;"></td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr bgcolor="#464254" style="background-color: #464254 !important;">
                    <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 0;">
                      <div class="social-links">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 400px; margin: 0 auto;" bgcolor="#464254">
                          <tr bgcolor="#464254" style="background-color: #464254 !important;">
                            ${footerSection?.content.socialLinks?.map((link, index) => `
                              <td align="center" width="${100 / (footerSection.content.socialLinks?.length || 1)}%" bgcolor="#464254" style="padding: 5px; background-color: #464254 !important;">
                                <a href="${link.url}" class="social-link" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: block; padding: 8px 5px; border-radius: 4px; background-color: #363143; white-space: nowrap;">${link.platform}</a>
                              </td>
                            `).join('') || `
                              <td align="center" width="33.33%" bgcolor="#464254" style="padding: 5px; background-color: #464254 !important;">
                                <a href="https://www.linkedin.com/company/arthur-loyd-bretagne/" class="social-link" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: block; padding: 8px 5px; border-radius: 4px; background-color: #363143; white-space: nowrap;">LinkedIn</a>
                              </td>
                              <td align="center" width="33.33%" bgcolor="#464254" style="padding: 5px; background-color: #464254 !important;">
                                <a href="https://www.instagram.com/arthurloydbretagne/" class="social-link" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: block; padding: 8px 5px; border-radius: 4px; background-color: #363143; white-space: nowrap;">Instagram</a>
                              </td>
                              <td align="center" width="33.33%" bgcolor="#464254" style="padding: 5px; background-color: #464254 !important;">
                                <a href="https://www.arthur-loyd.com/brest" class="social-link" style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; display: block; padding: 8px 5px; border-radius: 4px; background-color: #363143; white-space: nowrap;">Site Web</a>
                              </td>
                            `}
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                  <tr bgcolor="#464254" style="background-color: #464254 !important;">
                    <td align="center" bgcolor="#464254" style="background-color: #464254 !important; padding: 15px 0 0 0;">
                      <p style="margin-top: 0; opacity: 0.8; color: #ffffff;">${footerSection?.content.signature || 'Arthur Loyd Bretagne'}</p>
                      <p style="margin-top: 0; opacity: 0.8; color: #ffffff;">© ${new Date().getFullYear()} Arthur Loyd Bretagne. Tous droits réservés.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };
  
  // Gestion de la prévisualisation en plein écran
  const togglePreviewExpand = () => {
    setPreviewExpanded(!previewExpanded);
  };
  
  // Fonction pour envoyer un email de test
  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }
    
    try {
      // Préparer un seul destinataire pour le test
      const testRecipient = {
        email: testEmail,
        name: testName || "Test User",
        company: ""
      };
      
      // Créer l'objet pour l'API
      const requestData = {
        recipients: [testRecipient],
        subject: emailSubject,
        html: previewHtml,
        consultant: { 
          nom: senderName,
          fonction: '',
          email: '',
          telephone: ''
        },
        baseUrl: window.location.origin,
      };
      
      // Envoyer l'email via l'API
      const response = await fetch('/api/send-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`Email de test envoyé à ${testEmail}`);
        setShowTestForm(false);
      } else {
        toast.error(data.error || "Échec de l'envoi de l'email de test");
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de test:', error);
      toast.error("Une erreur s'est produite lors de l'envoi de l'email de test");
    }
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
        onValueChange={(value) => setSelectedTab(value as 'nouveau' | 'relance' | 'bailleur')}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <TabsList className="grid w-[500px] grid-cols-3">
            <TabsTrigger value="nouveau">Nouveau client</TabsTrigger>
            <TabsTrigger value="relance">Relance client</TabsTrigger>
            <TabsTrigger value="bailleur">Bailleur</TabsTrigger>
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
                // S'assurer que le contenu est à jour avant de passer en mode aperçu
                const updatedSections = handleUpdateContent();
                setMode('preview');
                // Forcer la mise à jour de l'aperçu après le changement de mode
                setTimeout(() => {
                  setPreviewHtml(generateHtml(updatedSections));
                }, 0);
              }}
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
            <Button 
              variant={mode === 'send' ? "default" : "outline"}
              onClick={() => {
                // S'assurer que le contenu est à jour avant de passer en mode envoi
                const updatedSections = handleUpdateContent();
                setMode('send');
                // Forcer la mise à jour de l'aperçu après le changement de mode
                setTimeout(() => {
                  setPreviewHtml(generateHtml(updatedSections));
                }, 0);
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
                          'insertdatetime', 'media', 'table', 'preview', 'wordcount', 'template'
                        ],
                        toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | template | removeformat | code',
                        content_style: 'body { font-family:Arial,sans-serif; font-size:14px }',
                        skin: 'oxide',
                        skin_url: '/tinymce/skins/ui/oxide',
                        content_css: '/tinymce/skins/content/default/content.css',
                        branding: false,
                        // Ajouter la gestion des templates
                        templates: [
                          { title: 'Demande d\'avis (nouveau client)', description: 'Template pour demander un avis Google à un nouveau client', content: getDefaultContent('nouveau') },
                          { title: 'Relance client', description: 'Template pour relancer un client existant', content: getDefaultContent('relance') },
                          { title: 'Bailleur', description: 'Template pour demander un avis à un bailleur', content: getDefaultContent('bailleur') }
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
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTestForm(!showTestForm)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {showTestForm ? "Annuler" : "Envoyer un test"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={togglePreviewExpand}
                    >
                      {previewExpanded ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
                      {previewExpanded ? 'Réduire' : 'Agrandir'}
                    </Button>
                  </div>
                </div>
                
                {showTestForm && (
                  <Card className="p-4 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                    <div className="space-y-4">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">Envoyer un email de test</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="test-email">Email de test</Label>
                          <Input
                            id="test-email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Adresse email pour le test"
                            type="email"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="test-name">Nom (optionnel)</Label>
                          <Input
                            id="test-name"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            placeholder="Nom du destinataire de test"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button onClick={sendTestEmail}>
                          <Send className="h-4 w-4 mr-2" />
                          Envoyer le test
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
                
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