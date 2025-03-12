"use client";

import { Box, Typography, Container, Paper, Divider } from '@mui/material';
import AvisGoogleEditorVisual from './components/AvisGoogleEditorVisual';
import { useTheme } from '@mui/material/styles';
import { Header } from '../components/header';
import { Suspense } from 'react';
import { Star } from 'lucide-react';
import Head from 'next/head';

export default function AvisGooglePage() {
  const theme = useTheme();

  return (
    <>
      <Head>
        <style>{`
          /* Correction pour l'affichage du header avec TinyMCE */
          .tox-tinymce-aux {
            z-index: 100 !important;
          }
          .tox-editor-header {
            z-index: 99 !important;
          }
          .tox-dialog-wrap {
            z-index: 1300 !important;
          }
          .tox-menu {
            z-index: 1300 !important;
          }
        `}</style>
      </Head>
      <Suspense fallback={<div>Chargement de l'en-tête...</div>}>
        <Header />
      </Suspense>
      <Container maxWidth="lg" sx={{ mb: 6 }}>
        <Box sx={{ 
          py: { xs: 2, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 3 }
        }}>
          {/* En-tête */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1, sm: 2 },
            mt: { xs: 1, sm: 2 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Star 
                size={28} 
                color="#DC0032" 
                fill="#DC0032" 
              />
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{
                  fontWeight: 600,
                  color: "#DC0032",
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
                }}
              >
                Demandes d'avis Google
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: theme.palette.text.secondary,
                maxWidth: '800px',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                lineHeight: 1.6
              }}
            >
              Envoyez facilement des demandes d'avis Google à vos clients. Personnalisez vos messages et suivez les réponses pour améliorer votre visibilité en ligne.
            </Typography>
            <Divider sx={{ mt: 1, mb: { xs: 1, sm: 2 } }} />
          </Box>

          {/* Contenu principal */}
          <Paper 
            elevation={2} 
            sx={{ 
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 0
            }}
          >
            <Suspense fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <div className="progress-indicator" style={{ width: '100%', maxWidth: '300px' }}>
                  <div role="progressbar" style={{ width: '100%' }}></div>
                </div>
              </Box>
            }>
              <AvisGoogleEditorVisual />
            </Suspense>
          </Paper>
        </Box>
      </Container>
    </>
  );
} 