'use client';

import React from 'react';
import { Container, Typography, Box, Paper, Breadcrumbs, Link as MuiLink } from '@mui/material';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href="/" passHref>
          <MuiLink underline="hover" color="inherit">
            Accueil
          </MuiLink>
        </Link>
        <Typography color="text.primary">Politique de confidentialité</Typography>
      </Breadcrumbs>

      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Politique de confidentialité
        </Typography>
        
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </Typography>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            1. Introduction
          </Typography>
          <Typography paragraph>
            Bienvenue sur l'application "État des Lieux" d'Arthur Loyd Brest. Cette politique de confidentialité explique comment nous recueillons, utilisons, divulguons et protégeons vos informations personnelles lorsque vous utilisez notre application "État des Lieux".
          </Typography>
          <Typography paragraph>
            Cette application est un outil interne destiné exclusivement aux collaborateurs d'Arthur Loyd. En utilisant notre application, vous consentez à la collecte et à l'utilisation de vos informations conformément à cette politique. Nous ne collectons que les informations nécessaires au bon fonctionnement de l'application et au service que nous vous proposons.
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            2. Informations que nous collectons
          </Typography>
          <Typography paragraph>
            <strong>Informations fournies par l'utilisateur :</strong> Nous collectons les informations que vous nous fournissez lors de la création de votre compte, telles que votre nom, adresse e-mail, et informations professionnelles.
          </Typography>
          <Typography paragraph>
            <strong>Informations relatives aux états des lieux :</strong> Nous stockons les données saisies concernant les propriétés, les locataires, et les informations d'état des lieux que vous créez dans l'application.
          </Typography>
          <Typography paragraph>
            <strong>Informations d'usage :</strong> Nous collectons des informations sur la façon dont vous utilisez l'application, incluant les pages consultées, les fonctionnalités utilisées et le temps passé sur l'application.
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            3. Utilisation des informations
          </Typography>
          <Typography paragraph>
            Nous utilisons vos informations pour :
          </Typography>
          <ul>
            <Typography component="li" paragraph>
              Fournir, maintenir et améliorer notre application et ses services
            </Typography>
            <Typography component="li" paragraph>
              Traiter et gérer votre compte
            </Typography>
            <Typography component="li" paragraph>
              Répondre à vos demandes, commentaires et questions
            </Typography>
            <Typography component="li" paragraph>
              Vous envoyer des notifications techniques, des mises à jour, des alertes de sécurité et des messages de support
            </Typography>
            <Typography component="li" paragraph>
              Comprendre comment les utilisateurs utilisent notre application afin de l'améliorer
            </Typography>
          </ul>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            4. Partage des informations
          </Typography>
          <Typography paragraph>
            Nous ne vendons, n'échangeons ni ne louons vos informations personnelles à des tiers. Nous pouvons partager vos informations dans les situations suivantes :
          </Typography>
          <ul>
            <Typography component="li" paragraph>
              Avec votre consentement explicite
            </Typography>
            <Typography component="li" paragraph>
              Pour respecter les obligations légales
            </Typography>
            <Typography component="li" paragraph>
              Avec nos prestataires de services qui nous aident à fournir et à améliorer notre application
            </Typography>
          </ul>
          <Typography paragraph>
            En tant qu'outil interne, les informations collectées sont uniquement accessibles aux collaborateurs autorisés d'Arthur Loyd.
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            5. Sécurité des données
          </Typography>
          <Typography paragraph>
            Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations contre l'accès, l'altération, la divulgation ou la destruction non autorisés. Toutefois, aucune méthode de transmission sur Internet ou de stockage électronique n'est totalement sécurisée, et nous ne pouvons garantir une sécurité absolue.
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            6. Conservation des données
          </Typography>
          <Typography paragraph>
            Nous conservons vos informations aussi longtemps que nécessaire pour fournir les services que vous avez demandés, ou aussi longtemps que requis par la loi. Après cette période, vos informations seront supprimées ou anonymisées.
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            7. Vos droits
          </Typography>
          <Typography paragraph>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants concernant vos données personnelles :
          </Typography>
          <ul>
            <Typography component="li" paragraph>
              Droit d'accès à vos données personnelles
            </Typography>
            <Typography component="li" paragraph>
              Droit de rectification des données inexactes
            </Typography>
            <Typography component="li" paragraph>
              Droit à l'effacement de vos données
            </Typography>
            <Typography component="li" paragraph>
              Droit à la limitation du traitement
            </Typography>
            <Typography component="li" paragraph>
              Droit à la portabilité des données
            </Typography>
            <Typography component="li" paragraph>
              Droit d'opposition au traitement
            </Typography>
          </ul>
          <Typography paragraph>
            Pour exercer ces droits, veuillez nous contacter à l'adresse email indiquée ci-dessous.
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            8. Cookies et technologies similaires
          </Typography>
          <Typography paragraph>
            Notre application utilise des cookies et des technologies similaires pour améliorer votre expérience, analyser l'utilisation de notre application et personnaliser le contenu. Vous pouvez contrôler l'utilisation des cookies via les paramètres de votre navigateur.
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            9. Modifications de cette politique
          </Typography>
          <Typography paragraph>
            Nous pouvons mettre à jour cette politique de confidentialité périodiquement. Nous vous informerons de tout changement significatif en publiant la nouvelle politique sur cette page et en mettant à jour la date de "dernière mise à jour".
          </Typography>
        </Box>

        <Box sx={{ my: 3 }}>
          <Typography variant="h5" gutterBottom>
            10. Nous contacter
          </Typography>
          <Typography paragraph>
            Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à :
          </Typography>
          <Typography paragraph>
            <strong>Arthur Loyd Brest</strong><br />
            21 rue de Lyon, 29200 Brest<br />
            Téléphone : 02 98 46 28 14<br />
            Email : agencebrest@arthurloydbretagne.fr
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
} 