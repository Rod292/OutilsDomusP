'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { uploadImage } from '@/lib/firebase';
import SendEmailForm from './SendEmailForm';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { 
  Box, Typography, Button, Paper, Tabs, Tab, CircularProgress, Alert,
  TextField, Divider, Chip, IconButton, Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import PreviewIcon from '@mui/icons-material/Preview';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import { Editor } from '@tinymce/tinymce-react';

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
  const theme = useTheme();
  const editorRef = useRef<TinyMCEEditor | null>(null);
  
  // États
  const [sections, setSections] = useState<AvisGoogleSection[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<AvisGoogleTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [mode, setMode] = useState<'edit' | 'send'>('edit');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState<'nouveau' | 'relance'>('nouveau');
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('Arthur Loyd Bretagne');

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
            color: #ffffff;
            text-align: center;
            border-radius: 0 0 8px 8px;
            margin-top: 20px;
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
            justify-content: center;
          }
          .social-link { 
            color: #DC0032;
            text-decoration: none;
            padding: 5px 10px;
            border-radius: 4px;
            background-color: #F5F7FA;
          }
          .social-link:hover {
            background-color: #f8e6ea;
          }
          p {
            margin: 10px 0;
          }
          a {
            color: #DC0032;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #DC0032;
          }
          ul, ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 5px;
          }
          .cta-button {
            display: inline-block;
            background-color: #DC0032;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
          }
          .cta-button:hover {
            background-color: #B00028;
          }
          .emoji {
            font-size: 1.2em;
            margin: 0 2px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="/images/logo-arthur-loyd.png" alt="Arthur Loyd" class="small-logo">
          
          <div class="content">
            ${contentSection?.content.content || ''}
          </div>
          
          ${footerSection ? `
            <div class="footer">
              <div class="signature">
                ${footerSection.content.signature || 'Arthur Loyd Bretagne'}
              </div>
              <div class="social-links">
                <a href="https://www.linkedin.com/company/arthur-loyd-bretagne" class="social-link" target="_blank">LinkedIn</a>
                <a href="https://www.instagram.com/arthurloydbretagne/" class="social-link" target="_blank">Instagram</a>
              </div>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          {error}
        </Alert>
      )}

      {/* Onglets pour choisir entre nouveau client et relance */}
      <Box 
        sx={{ 
          mb: 3, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1, sm: 2 }
        }}
      >
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            color: theme.palette.text.primary,
            minWidth: { sm: '120px' }
          }}
        >
          Type de message:
        </Typography>
        <Tabs 
          value={selectedTab} 
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{
            minHeight: '40px',
            '& .MuiTabs-indicator': {
              backgroundColor: '#DC0032',
              height: 3
            }
          }}
        >
          <Tab 
            label="Nouveau client" 
            value="nouveau"
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
            label="Relance" 
            value="relance"
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

      {/* Mode tabs */}
      <Box 
        sx={{ 
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1, sm: 2 }
        }}
      >
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            color: theme.palette.text.primary,
            minWidth: { sm: '120px' }
          }}
        >
          Mode:
        </Typography>
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1,
            flexWrap: 'wrap'
          }}
        >
          <Button
            variant={mode === 'edit' ? 'contained' : 'outlined'}
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setMode('edit')}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              boxShadow: mode === 'edit' ? 2 : 0,
              backgroundColor: mode === 'edit' ? '#DC0032' : 'transparent',
              borderColor: '#DC0032',
              color: mode === 'edit' ? '#fff' : '#DC0032',
              '&:hover': {
                backgroundColor: mode === 'edit' ? '#B00028' : 'rgba(220, 0, 50, 0.08)',
                borderColor: '#DC0032'
              }
            }}
          >
            Éditer
          </Button>
          <Button
            variant={mode === 'send' ? 'contained' : 'outlined'}
            size="small"
            startIcon={<SendIcon />}
            onClick={() => setMode('send')}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              boxShadow: mode === 'send' ? 2 : 0,
              backgroundColor: mode === 'send' ? '#DC0032' : 'transparent',
              borderColor: '#DC0032',
              color: mode === 'send' ? '#fff' : '#DC0032',
              '&:hover': {
                backgroundColor: mode === 'send' ? '#B00028' : 'rgba(220, 0, 50, 0.08)',
                borderColor: '#DC0032'
              }
            }}
          >
            Envoyer
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={40} thickness={4} sx={{ color: '#DC0032' }} />
        </Box>
      ) : (
        <>
          {mode === 'edit' && (
            <Box sx={{ mb: 3 }}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  position: 'relative',
                  zIndex: 1 // Assurer que le contenu est au-dessus
                }}
              >
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: '#DC0032',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2
                  }}
                >
                  <EditIcon fontSize="small" />
                  Éditer le contenu
                </Typography>

                {/* Champs pour le nom de l'expéditeur et l'objet du mail */}
                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Nom de l'expéditeur"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
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
                    label="Objet du mail"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
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
                </Box>
                
                {/* Conteneur pour la barre d'outils TinyMCE */}
                <div id="toolbar-container" style={{ position: 'relative', zIndex: 0 }}></div>
                
                <Box sx={{ mb: 3, position: 'relative', zIndex: 0 }}>
                  <Editor
                    apiKey={TINYMCE_API_KEY}
                    onInit={(evt: TinyMCEInitEvent, editor: TinyMCEEditor) => editorRef.current = editor}
                    initialValue={emailContent}
                    init={{
                      height: 400,
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | help',
                      content_style: 'body { font-family:Poppins,Arial,sans-serif; font-size:14px }',
                      skin: 'oxide',
                      content_css: 'default',
                      branding: false,
                      resize: false,
                      statusbar: false,
                      setup: (editor: TinyMCEEditor) => {
                        editor.on('Change', () => {
                          setEmailContent(editor.getContent());
                        });
                      }
                    }}
                  />
                </Box>

                {/* Aperçu intégré */}
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: '#DC0032',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2,
                    mt: 3
                  }}
                >
                  <PreviewIcon fontSize="small" />
                  Aperçu de l'email
                </Typography>
                <Box 
                  sx={{ 
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1.5,
                    p: 2,
                    backgroundColor: '#fff',
                    maxHeight: '400px',
                    overflow: 'auto',
                    mb: 3
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: generateHtml(sections) }} />
                </Box>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleUpdateContent}
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
                    Enregistrer les modifications
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}

          {mode === 'send' && (
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
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    color: '#DC0032',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2
                  }}
                >
                  <SendIcon fontSize="small" />
                  Envoyer les demandes d'avis
                </Typography>
                <SendEmailForm 
                  htmlContent={generateHtml(sections)} 
                  onError={setError}
                  senderName={senderName}
                  emailSubject={emailSubject}
                />
              </Paper>
            </Box>
          )}
        </>
      )}
    </Box>
  );
} 