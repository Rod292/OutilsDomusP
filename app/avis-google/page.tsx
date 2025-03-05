"use client";

import { Box, Typography, Container, Paper } from '@mui/material';
import AvisGoogleEditorVisual from './components/AvisGoogleEditorVisual';
import { useTheme } from '@mui/material/styles';
import { Header } from '../components/header';
import { Suspense } from 'react';

export default function AvisGooglePage() {
  const theme = useTheme();

  return (
    <>
      <Suspense fallback={<div>Chargement de l'en-tête...</div>}>
        <Header />
      </Suspense>
      <Container maxWidth="lg">
        <Box sx={{ 
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          {/* En-tête */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{
                fontWeight: 600,
                color: theme.palette.primary.main
              }}
            >
              Demandes d'avis Google
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: theme.palette.text.secondary,
                maxWidth: '800px'
              }}
            >
              Envoyez facilement des demandes d'avis Google à vos clients. Personnalisez vos messages et suivez les réponses pour améliorer votre visibilité en ligne.
            </Typography>
          </Box>

          {/* Contenu principal */}
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper
            }}
          >
            <Suspense fallback={<div>Chargement...</div>}>
              <AvisGoogleEditorVisual />
            </Suspense>
          </Paper>
        </Box>
      </Container>
    </>
  );
} 