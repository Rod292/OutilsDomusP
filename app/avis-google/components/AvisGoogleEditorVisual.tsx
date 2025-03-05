'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { uploadImage } from '@/lib/firebase';
import SendEmailForm from './SendEmailForm';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { 
  Box, Typography, Button, Paper, Tabs, Tab, CircularProgress, Alert,
  TextField
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import PreviewIcon from '@mui/icons-material/Preview';
import SendIcon from '@mui/icons-material/Send';

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
  const theme = useTheme();
  
  // États
  const [sections, setSections] = useState<AvisGoogleSection[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<AvisGoogleTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [mode, setMode] = useState<'edit' | 'send' | 'preview'>('edit');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState<'nouveau' | 'relance'>('nouveau');
  const [emailContent, setEmailContent] = useState<string>('');

  // Charger le template par défaut
  useEffect(() => {
    loadDefaultTemplate();
  }, [selectedTab]);

  // Surveiller l'authentification
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
    const updatedSections = sections.map(section => {
      if (section.type === 'content') {
        return {
          ...section,
          content: {
            ...section.content,
            content: emailContent
          }
        };
      }
      return section;
    });

    setSections(updatedSections);
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
    const signature = container.querySelector('.signature');
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
          .content {
            margin: 20px 0;
          }
          .signature { 
            margin-top: 30px; 
            color: #666666;
            font-style: italic;
          }
          .social-links { 
            margin-top: 20px;
            display: flex;
            gap: 10px;
          }
          .social-link { 
            color: #1E3C72;
            text-decoration: none;
            padding: 5px 10px;
            border-radius: 4px;
            background-color: #F5F7FA;
          }
          .social-link:hover {
            background-color: #E8EBF2;
          }
          p {
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${headerSection?.content.logo ? 
            `<img src="${headerSection.content.logo}" alt="Logo" class="logo">` : 
            ''}
          
          <div class="content">
            ${contentSection?.content.content || ''}
          </div>
          
          ${footerSection ? `
            <div class="signature">
              ${footerSection.content.signature}
            </div>
            <div class="social-links">
              ${footerSection.content.socialLinks?.map(link => 
                `<a href="${link.url}" class="social-link" target="_blank">${link.platform}</a>`
              ).join('\n') || ''}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Tabs de sélection du type de message */}
      <Paper 
        sx={{ 
          mb: 3,
          borderRadius: theme.shape.borderRadius,
          overflow: 'hidden'
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            '& .MuiTab-root': {
              py: 2,
              color: theme.palette.text.primary,
              '&.Mui-selected': {
                color: '#DC0032',
                fontWeight: 600
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#DC0032'
            }
          }}
        >
          <Tab 
            value="nouveau" 
            label="Premier contact"
          />
          <Tab 
            value="relance" 
            label="Relance"
          />
        </Tabs>
      </Paper>

      {/* Affichage des erreurs */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* Contenu principal */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: '#DC0032' }} />
        </Box>
      ) : (
        <>
          {mode === 'edit' && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <TextField
                label="Contenu de l'email"
                multiline
                rows={10}
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
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
                onClick={handleUpdateContent}
                fullWidth
                sx={{
                  bgcolor: '#DC0032',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#B00028',
                  }
                }}
              >
                Mettre à jour le template
              </Button>
            </Paper>
          )}

          {mode === 'send' && (
            <SendEmailForm
              htmlContent={generateHtml(sections)}
              onError={setError}
            />
          )}

          {mode === 'preview' && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <div 
                dangerouslySetInnerHTML={{ __html: generateHtml(sections) }}
                style={{ maxWidth: '600px', margin: '0 auto' }}
              />
            </Paper>
          )}

          {/* Boutons de contrôle */}
          <Box sx={{ 
            mt: 3, 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'center'
          }}>
            <Button
              variant={mode === 'edit' ? 'contained' : 'outlined'}
              onClick={() => setMode('edit')}
              startIcon={<EditIcon />}
              sx={{
                ...(mode === 'edit' ? {
                  bgcolor: '#DC0032',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#B00028',
                  }
                } : {
                  color: '#DC0032',
                  borderColor: '#DC0032',
                  '&:hover': {
                    borderColor: '#B00028',
                    color: '#B00028',
                  }
                })
              }}
            >
              Éditer
            </Button>
            <Button
              variant={mode === 'preview' ? 'contained' : 'outlined'}
              onClick={() => setMode('preview')}
              startIcon={<PreviewIcon />}
              sx={{
                ...(mode === 'preview' ? {
                  bgcolor: '#DC0032',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#B00028',
                  }
                } : {
                  color: '#DC0032',
                  borderColor: '#DC0032',
                  '&:hover': {
                    borderColor: '#B00028',
                    color: '#B00028',
                  }
                })
              }}
            >
              Aperçu
            </Button>
            <Button
              variant={mode === 'send' ? 'contained' : 'outlined'}
              onClick={() => setMode('send')}
              startIcon={<SendIcon />}
              disabled={!user}
              sx={{
                ...(mode === 'send' ? {
                  bgcolor: '#DC0032',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#B00028',
                  }
                } : {
                  color: '#DC0032',
                  borderColor: '#DC0032',
                  '&:hover': {
                    borderColor: '#B00028',
                    color: '#B00028',
                  }
                }),
                '&.Mui-disabled': {
                  bgcolor: theme.palette.action.disabledBackground,
                  color: theme.palette.action.disabled,
                }
              }}
            >
              Envoyer
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
} 