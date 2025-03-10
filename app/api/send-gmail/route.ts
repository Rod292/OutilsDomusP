import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { GMAIL_CONFIG } from '@/app/newsletter/components/gmail-config';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import { getUserProfile, sendMessage, createMessage } from '../../lib/gmail';
import { getGmailClient } from '../../lib/gmail';
import { generateUnsubscribeToken } from '../../utils/token';
import * as admin from 'firebase-admin';

const { CLIENT_ID } = GMAIL_CONFIG;

// Fonction pour convertir les URLs relatives des images en URLs absolues
function convertToAbsoluteUrls(html: string, baseUrl: string): string {
  // Convertir les chemins relatifs des images en URLs absolues
  let modifiedHtml = html.replace(
    /(src|href)=["'](?!http|https|data|cid|mailto)([^"']+)["']/g,
    (match, attr, url) => {
      // Si l'URL ne commence pas par '/', on ajoute '/'
      if (!url.startsWith('/')) {
        url = '/' + url;
      }
      return `${attr}="${baseUrl}${url}"`;
    }
  );
  
  console.log('URLs des images converties en URLs absolues');
  return modifiedHtml;
}

// Fonction pour intégrer les images en base64 (si possible)
function inlineImages(html: string): string {
  console.log('Tentative d\'intégration des images en base64...');
  let modifiedHtml = html;

  // Ajouter des styles spécifiques pour mobile
  modifiedHtml = modifiedHtml.replace(/<head>([\s\S]*?)<\/head>/, (match, headContent) => {
    return `<head>${headContent}
      <style>
        @media screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .content { padding: 10px !important; }
          .footer { padding: 15px !important; }
          img { max-width: 100% !important; height: auto !important; }
          .photo-container { height: auto !important; line-height: normal !important; }
          .photo-container img { max-height: 250px !important; }
          .logo { max-width: 160px !important; width: 160px !important; margin: 0 auto !important; display: block !important; float: none !important; }
          table[class="secondary-photos"] td { padding: 0 10px !important; }
          table[class="secondary-photos"] div { width: 240px !important; height: 180px !important; }
        }
      </style>
    </head>`;
  });

  // S'assurer que le logo est bien centré
  modifiedHtml = modifiedHtml.replace(
    /<td align="center" style="padding: 20px;">\s*<img[^>]+class="logo"[^>]*>\s*<\/td>/g,
    (match) => {
      return `<td align="center" style="padding: 20px; text-align: center;">
        <img src="${match.match(/src="([^"]+)"/)?.[1] || ''}" alt="Arthur Loyd Logo" class="logo" width="180" height="auto" style="display: block; margin: 0 auto; float: none; text-align: center;">
      </td>`;
    }
  );
  
  // Remplacer l'image principale par une structure avec hauteur fixe et centrage vertical
  modifiedHtml = modifiedHtml.replace(
    /<div style="margin: 30px 0; text-align: center;">\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>\s*<div[^>]*>([^<]*)<\/div>\s*<\/div>/g,
    (match, src, alt, caption) => {
      return `<div style="margin: 30px 0; text-align: center;">
        <div style="height: 350px; line-height: 350px; text-align: center; margin-bottom: 20px; max-width: 600px; margin-left: auto; margin-right: auto;" class="photo-container">
          <img src="${src}" alt="${alt || ''}" style="max-width: 100%; max-height: 350px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: inline-block; vertical-align: middle; object-fit: contain;">
        </div>
        <div style="background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; display: inline-block; margin-bottom: 30px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600;">${caption || 'Vue d\'ensemble'}</div>
      </div>`;
    }
  );
  
  // Traiter les images additionnelles pour s'assurer qu'elles ont une hauteur fixe et un centrage vertical
  modifiedHtml = modifiedHtml.replace(
    /<td[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>\s*<div[^>]*>([^<]*)<\/div>\s*<\/td>/g,
    (match, src, alt, caption) => {
      return `<td width="50%" valign="top" style="padding: 0 20px; text-align: center;">
        <div style="width: 260px; height: 190px; margin: 0 auto 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <img src="${src}" alt="${alt || ''}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div style="background-color: #2c3e50; color: white; padding: 8px; border-radius: 5px; font-family: 'Montserrat', Arial, sans-serif; font-weight: 600; font-size: 14px; display: inline-block; min-width: 200px; max-width: 260px; margin: 0 auto;">${caption || 'Photo'}</div>
      </td>`;
    }
  );

  // Assurer que la table des images secondaires a un layout fixe
  modifiedHtml = modifiedHtml.replace(
    /<table[^>]*>\s*<tr>\s*(<td[^>]*>[\s\S]*?<\/td>\s*){1,2}<\/tr>\s*<\/table>/g,
    (match) => {
      return match.replace('<table', '<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0; table-layout: fixed;" class="secondary-photos">');
    }
  );

  // Recherche toutes les balises img dans le HTML
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let match;
  const tempHtml = modifiedHtml;
  
  // Pour chaque image trouvée
  while ((match = imgRegex.exec(tempHtml)) !== null) {
    try {
      const imgTag = match[0];
      const imgSrc = match[1];
     
      // Ignore les images qui sont déjà en base64 ou qui sont des URLs externes
      if (imgSrc.startsWith('data:') || imgSrc.startsWith('http') || imgSrc.startsWith('https')) {
       continue;
      }
     
      // Construit le chemin complet vers l'image
      const imagePath = path.join(process.cwd(), 'public', imgSrc.replace(/^\//, ''));
      
      // Vérifie si le fichier existe
      if (fs.existsSync(imagePath)) {
        // Lit le fichier image
        const imageBuffer = fs.readFileSync(imagePath);
        // Détermine le type MIME
        const mimeType = mime.lookup(imagePath) || 'image/png';
        // Convertit en base64
        const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        
        // Remplace l'URL de l'image par la version base64
        const newImgTag = imgTag.replace(imgSrc, base64Image);
        modifiedHtml = modifiedHtml.replace(imgTag, newImgTag);
        
        console.log(`Image intégrée avec succès: ${imgSrc}`);
      } else {
        console.log(`Image non trouvée: ${imagePath}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'intégration de l\'image:', error);
    }
  }

  // Approche ultra-simplifiée pour le mode sombre - inspirée de la newsletter Kolder
  
  // 1. Forcer le fond blanc pour tout le document
  modifiedHtml = modifiedHtml.replace(/<body[^>]*>/i, '<body bgcolor="#FFFFFF" style="background-color: #FFFFFF; margin: 0; padding: 0;">');
  
  // 2. Envelopper tout le contenu dans une table avec fond blanc
  modifiedHtml = modifiedHtml.replace(/<body[^>]*>([\s\S]*?)<\/body>/i, (match, bodyContent) => {
    return `<body bgcolor="#FFFFFF" style="background-color: #FFFFFF; margin: 0; padding: 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF;">
        <tr>
          <td align="center" valign="top">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF;">
              <tr>
                <td>
                  ${bodyContent}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>`;
  });
  
  // 3. Assurer que le footer a le bon fond violet
  modifiedHtml = modifiedHtml.replace(/<table[^>]*bgcolor="#464254"[^>]*>[\s\S]*?<\/table>/gi, (match) => {
    // Extraire le contenu du footer
    const footerContent = match.replace(/<table[^>]*>/, '').replace(/<\/table>$/, '');
    
    // Reconstruire le footer avec une structure ultra-simple
    return `<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#464254" style="background-color: #464254 !important;">
      <tr>
        <td bgcolor="#464254" style="background-color: #464254 !important; padding: 20px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#464254" style="background-color: #464254 !important;">
            ${footerContent}
          </table>
        </td>
      </tr>
    </table>`;
  });
  
  // 4. Ajouter des métadonnées minimales dans le head
  modifiedHtml = modifiedHtml.replace(/<head>([\s\S]*?)<\/head>/i, (match, headContent) => {
    return `<head>
      ${headContent}
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
    </head>`;
  });
  
  // Modifier le lien de désinscription pour qu'il pointe vers notre page RGPD
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  modifiedHtml = modifiedHtml.replace(
    /<a\s+href=["']#["'][^>]*>([^<]*désinscri[^<]*)<\/a>/gi,
    (match, text) => {
      // Utiliser une URL absolue avec http:// ou https:// pour éviter l'interception par JavaScript
      return `<a href="${baseUrl}/unsubscribe?email={{EMAIL}}" style="color: white; text-decoration: underline;" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  );

  // Chercher également le texte "Se désinscrire" dans le footer pour s'assurer que tous les liens sont ciblés
  modifiedHtml = modifiedHtml.replace(
    /<a\s+href=["'][^"']*["'][^>]*>([^<]*[Ss]e désinscrire[^<]*)<\/a>/gi,
    (match, text) => {
      return `<a href="${baseUrl}/unsubscribe?email={{EMAIL}}" style="color: white; text-decoration: underline;" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
  );

  // Chercher également des liens avec des href relatifs qui pourraient être des liens de désinscription
  modifiedHtml = modifiedHtml.replace(
    /<a\s+href=["'](\/unsubscribe|unsubscribe|\/se-desinscrire|se-desinscrire)[^"']*["'][^>]*>/gi,
    (match) => {
      return `<a href="${baseUrl}/unsubscribe?email={{EMAIL}}" style="color: white; text-decoration: underline;" target="_blank" rel="noopener noreferrer">`;
    }
  );

  return modifiedHtml;
}

// Fonction pour lister le contenu d'un répertoire (pour le débogage)
function listDirectoryContents(dir: string, indent: string = '') {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log(`${indent}Dossier: ${file}`);
        try {
          const subFiles = fs.readdirSync(filePath);
          subFiles.forEach(subFile => {
            console.log(`${indent}  - ${file}/${subFile}`);
          });
        } catch (err) {
          console.log(`${indent}  Erreur de lecture du sous-dossier ${file}`);
        }
      } else {
        console.log(`${indent}Fichier: ${file}`);
      }
    });
  } catch (err) {
    console.error(`Erreur lors de la lecture du dossier ${dir}:`, err);
  }
}

// Fonction d'encodage pour l'objet de l'email
function encodeHeaderValue(str: string): string {
  // Vérifier si la chaîne contient des caractères nécessitant un encodage
  const needsEncoding = /[^\x00-\x7F]/.test(str);
  
  if (!needsEncoding) {
    return str;  // Pas besoin d'encodage
  }
  
  // Utiliser l'encodage Base64 pour les chaînes contenant des émojis ou caractères spéciaux
  const buffer = Buffer.from(str, 'utf-8');
  const base64 = buffer.toString('base64');
  return `=?UTF-8?B?${base64}?=`;
}

// Fonction pour ajouter les éléments de tracking dans l'email
function addTrackingElements(html: string, recipient: { email?: string }, campaignId: string, baseUrl: string): string {
  if (!recipient.email || !campaignId) {
    return html;
  }

  // Toujours utiliser l'URL de production pour les liens de tracking
  const productionUrl = process.env.NEXT_PUBLIC_BASE_URL || baseUrl;
  
  const email = encodeURIComponent(recipient.email);
  const cid = encodeURIComponent(campaignId);
  
  // Ajouter un pixel de tracking pour les ouvertures d'emails
  const trackingPixel = `<img src="${productionUrl}/api/track-open?cid=${cid}&email=${email}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;" />`;
  
  // Ajouter le pixel de tracking juste avant la fermeture du body
  let modifiedHtml = html.replace('</body>', `${trackingPixel}</body>`);
  
  // Remplacer tous les liens par des liens de tracking
  modifiedHtml = modifiedHtml.replace(
    /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["']([^>]*)>/gi,
    (match, url, rest) => {
      // Ne pas modifier les liens d'ancre, mailto ou javascript
      if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('javascript:') || url.startsWith('tel:')) {
        return match;
      }
      
      // Ne pas modifier les liens de désinscription
      if (url.toLowerCase().includes('unsubscribe') || 
          url.toLowerCase().includes('désinscrire') || 
          url.toLowerCase().includes('desinscrire') ||
          url === '{{UNSUBSCRIBE_URL}}') {
        return match;
      }
      
      // Encoder l'URL
      const encodedUrl = encodeURIComponent(url);
      
      // Créer le lien de tracking
      return `<a href="${productionUrl}/api/track-click?cid=${cid}&email=${email}&url=${encodedUrl}"${rest}>`;
    }
  );
  
  return modifiedHtml;
}

// Personnaliser le HTML pour chaque destinataire
const personalizeHtml = (html: string, recipient: { name: string; company?: string; email?: string }, campaignId?: string, baseUrl?: string) => {
  console.log('Personnalisation du HTML pour:', recipient);
  
  let personalizedHtml = html;
  
  // Remplacer les variables de personnalisation
  if (recipient.name) {
    personalizedHtml = personalizedHtml.replace(/{{name}}/g, recipient.name);
    console.log('Nom remplacé:', recipient.name);
  }
  
  if (recipient.company) {
    personalizedHtml = personalizedHtml.replace(/{{company}}/g, recipient.company);
    console.log('Entreprise remplacée:', recipient.company);
  }
  
  // Ajouter les éléments de tracking si l'ID de campagne et l'URL de base sont fournis
  if (campaignId && baseUrl && recipient.email) {
    personalizedHtml = addTrackingElements(personalizedHtml, recipient, campaignId, baseUrl);
  }
  
  return personalizedHtml;
};

export async function POST(request: NextRequest) {
  console.log('Démarrage du traitement de la demande POST dans /api/send-gmail');
  
  try {
    // Récupérer le token des cookies
    const cookieStore = cookies();
    const token = cookieStore.get('gmail_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter à Gmail.' },
        { status: 401 }
      );
    }
    
    // Configurer les identifiants Google avec le jeton d'accès
    const auth = new google.auth.OAuth2(CLIENT_ID);
    
    // Gérer les différents formats de token possibles
    try {
      // Essayer de parser le token comme JSON
      const tokenData = JSON.parse(token);
      auth.setCredentials(tokenData);
      console.log('Token JSON traité avec succès');
    } catch (error) {
      // Si ce n'est pas du JSON, utiliser le token directement comme access_token
      console.log('Token non-JSON détecté, utilisation comme access_token');
      auth.setCredentials({ access_token: token });
    }
    
    // Initialiser l'API Gmail
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Récupérer le profil utilisateur pour obtenir l'adresse email
    const profileResponse = await gmail.users.getProfile({ userId: 'me' });
    const profileInfo = profileResponse.data;
    
    console.log('Profil utilisateur Gmail récupéré avec succès');
    console.log('Email de l\'expéditeur:', profileInfo.emailAddress);
    
    // Récupérer les données du corps de la requête
    const requestData = await request.json();
    console.log('Données reçues dans la requête:', JSON.stringify({
      sujet: requestData.subject,
      nbDestinataires: requestData.recipients?.length || 0,
      consultantPresent: !!requestData.consultant,
      baseUrlPresent: !!requestData.baseUrl,
      htmlPresent: typeof requestData.html === 'string',
      htmlLength: requestData.html?.length || 0
    }));
    
    const { html, subject, recipients, consultant, baseUrl } = requestData;
    
    // Vérification des données essentielles
    if (!html) {
      console.error('Erreur: Contenu HTML manquant dans la requête');
      return NextResponse.json({ success: false, error: 'Contenu HTML manquant' }, { status: 400 });
    }
    
    if (!recipients || recipients.length === 0) {
      console.error('Erreur: Aucun destinataire spécifié');
      return NextResponse.json({ success: false, error: 'Aucun destinataire spécifié' }, { status: 400 });
    }
    
    // Vérifier le contenu du dossier public pour le débogage
    const publicDir = path.join(process.cwd(), 'public');
    console.log('Contenu du dossier public:');
    listDirectoryContents(publicDir);
    
    // Variables pour suivre les résultats
    let successCount = 0;
    let failedCount = 0;
    let errors: string[] = [];
    
    try {
      // Essayer d'abord d'intégrer les images en base64, sinon utiliser des URLs absolues
      console.log('Tentative d\'intégration des images en base64...');
      
      // Traiter chaque destinataire
      for (const recipient of recipients) {
        try {
          console.log(`Traitement du destinataire: ${JSON.stringify(recipient)}`);
          
          // Vérifier si l'email est désinscrit
          console.log('Vérification si l\'email est désinscrit:', recipient.email);
          try {
            const unsubscribeResponse = await fetch(`${baseUrl}/api/check-unsubscribed`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: recipient.email }),
              cache: 'no-store',
              next: { revalidate: 0 }
            });

            console.log('Réponse de vérification de désinscription:', {
              status: unsubscribeResponse.status,
              statusText: unsubscribeResponse.statusText,
              headers: Object.fromEntries(unsubscribeResponse.headers.entries())
            });

            if (!unsubscribeResponse.ok) {
              throw new Error(`Erreur HTTP! statut: ${unsubscribeResponse.status}`);
            }

            const unsubscribeData = await unsubscribeResponse.json();
            console.log('Données de désinscription:', unsubscribeData);

            if (unsubscribeData.isUnsubscribed) {
              console.log('Email désinscrit, envoi ignoré');
              failedCount++;
              errors.push(`${recipient.email}: Email désinscrit`);
              continue;
            }
          } catch (error) {
            console.error('Erreur lors de la vérification de désinscription:', error);
            // Continuer avec l'envoi de l'email même si la vérification échoue
          }

          // Vérifier si l'email a déjà été contacté pour cette campagne
          if (requestData.campaignId) {
            console.log('Vérification si l\'email a déjà été contacté pour cette campagne:', recipient.email);
            try {
              const alreadyContactedResponse = await fetch(`${baseUrl}/api/check-already-contacted`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  email: recipient.email,
                  campaignId: requestData.campaignId
                }),
                cache: 'no-store',
                next: { revalidate: 0 }
              });

              console.log('Réponse de vérification d\'email déjà contacté:', {
                status: alreadyContactedResponse.status,
                statusText: alreadyContactedResponse.statusText
              });

              if (!alreadyContactedResponse.ok) {
                throw new Error(`Erreur HTTP! statut: ${alreadyContactedResponse.status}`);
              }

              const alreadyContactedData = await alreadyContactedResponse.json();
              console.log('Données de vérification d\'email déjà contacté:', alreadyContactedData);

              // Vérifier explicitement si alreadyContacted est true
              if (alreadyContactedData.alreadyContacted === true) {
                console.log(`Email ${recipient.email} déjà contacté pour cette campagne (trouvé dans: ${alreadyContactedData.foundInCollection || 'structure inconnue'}), envoi ignoré`);
                failedCount++;
                errors.push(`${recipient.email}: Email déjà contacté pour cette campagne (${alreadyContactedData.details || 'raison non spécifiée'})`);
                
                // Ajouter l'email à la sous-collection 'emails' avec le statut 'failed'
                try {
                  const campaignRef = admin.firestore().collection('campaigns').doc(requestData.campaignId);
                  const emailId = Buffer.from(recipient.email).toString('base64').replace(/[+/=]/g, '');
                  const emailRef = campaignRef.collection('emails').doc(emailId);
                  
                  console.log(`Ajout de l'email ${recipient.email} avec l'ID: ${emailId} à la collection`);
                  
                  await emailRef.set({
                    email: recipient.email,
                    name: recipient.name || '',
                    company: recipient.company || '',
                    status: 'failed',
                    reason: 'Email déjà contacté pour cette campagne',
                    timestamp: new Date()
                  });
                  
                  console.log(`Email ${recipient.email} ajouté à la liste des emails non délivrés (déjà contacté)`);
                } catch (error) {
                  console.error("Erreur lors de l'ajout de l'email à la liste des non délivrés:", error);
                }
                
                continue;
              }
            } catch (error) {
              console.error('Erreur lors de la vérification d\'email déjà contacté:', error);
              // Continuer avec l'envoi de l'email même si la vérification échoue
            }
          }

          // Remplacer les placeholders dans le HTML
          let personalizedHtml = personalizeHtml(html, {
            name: recipient.name || '',
            company: recipient.company || '',
            email: recipient.email || ''
          }, requestData.campaignId, baseUrl);

          // Créer l'URL de désinscription avec l'URL de production
          const productionUrl = process.env.NEXT_PUBLIC_BASE_URL || baseUrl;
          const unsubscribeUrl = `${productionUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
          
          // Remplacer le placeholder de désinscription par l'URL réelle
          personalizedHtml = personalizedHtml.replace(/{{UNSUBSCRIBE_URL}}/g, unsubscribeUrl);

          // Ajouter les informations du consultant si disponibles
          if (consultant) {
            personalizedHtml = personalizedHtml
              .replace(/\[NOM_CONSULTANT\]/g, consultant.nom || '')
              .replace(/\[FONCTION_CONSULTANT\]/g, consultant.fonction || '')
              .replace(/\[EMAIL_CONSULTANT\]/g, consultant.email || '')
              .replace(/\[TELEPHONE_CONSULTANT\]/g, consultant.telephone || '');
          }

          // Vérifier que html est bien défini et est une chaîne
          if (typeof personalizedHtml !== 'string') {
            console.error(`Erreur: html n'est pas une chaîne mais un ${typeof personalizedHtml}`);
            throw new Error(`HTML invalide: ${typeof personalizedHtml}`);
          }
          
          // Intégrer les images avec Firebase Storage URLs
          const processedHtml = personalizedHtml;
          
          // Utiliser le sujet tel quel, sans ajouter d'emoji
          const cleanSubject = subject;
          
          // Construire le message email avec des en-têtes valides et encodage correct
          const rawMessage = 
          `To: ${recipient.email}
From: "${consultant?.nom || 'Arthur Loyd Bretagne'}" <${profileInfo.emailAddress}>
Subject: ${encodeHeaderValue(cleanSubject)}
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

${processedHtml}`;
          
          console.log(`Message construit avec structure simplifiée: ${rawMessage.substring(0, 300)}${rawMessage.length > 300 ? '... (tronqué)' : ''}`);
          
          // Encoder le message en base64 pour l'API Gmail
          const encodedMessage = Buffer.from(rawMessage).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
          
          // Envoyer l'email via l'API Gmail
          await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: encodedMessage
            }
          });
          
          console.log(`Email envoyé avec succès à ${recipient.email}`);
          
          // Ajouter l'email à la liste des destinataires contactés
          if (requestData.campaignId) {
            try {
              console.log(`🔍 Début de l'ajout à Firestore pour l'email: ${recipient.email}, campaignId: ${requestData.campaignId}`);
              console.log(`🔑 Type de campaignId: ${typeof requestData.campaignId}, Valeur: "${requestData.campaignId}"`);
              
              // Utiliser la campagne spécifiée
              const campaignRef = admin.firestore().collection('campaigns').doc(requestData.campaignId);
              
              // Vérifier si la campagne existe
              const campaignDoc = await campaignRef.get();
              if (!campaignDoc.exists) {
                console.error(`❌ La campagne ${requestData.campaignId} n'existe pas dans Firestore!`);
                throw new Error(`La campagne ${requestData.campaignId} n'existe pas. Veuillez vérifier l'ID de la campagne utilisé.`);
              } else {
                console.log(`✅ Campagne trouvée: "${requestData.campaignId}"`, campaignDoc.data());
              }
              
              // Préparer l'ID de l'email dans le même format que add-to-contacted
              const emailId = Buffer.from(recipient.email).toString('base64').replace(/[+/=]/g, '');
              console.log(`🆔 ID généré pour l'email: ${emailId}`);
              
              // Utilisez la nouvelle structure organisée par statut
              // Sous-collection: emails/delivered/items
              const deliveredRef = campaignRef.collection('emails').doc('delivered').collection('items').doc(emailId);
              console.log(`📁 Chemin complet: campaigns/${requestData.campaignId}/emails/delivered/items/${emailId}`);
              
              // Vérifier si l'email existe déjà
              const emailDoc = await deliveredRef.get();
              console.log(`🔍 L'email existe déjà dans la collection delivered? ${emailDoc.exists}`);
              
              // Préparer les données de l'email
              const emailData = {
                email: recipient.email,
                name: recipient.name || '',
                company: recipient.company || '',
                status: 'delivered', // Marquer comme "délivré" quand l'envoi Gmail a réussi
                timestamp: new Date(),
                updatedAt: new Date()
              };
              console.log(`📨 Données d'email à enregistrer:`, emailData);
              
              // Transaction pour ajouter l'email et mettre à jour les compteurs
              try {
                console.log('🔄 Début de la transaction Firestore...');
                await admin.firestore().runTransaction(async (transaction) => {
                  // Ajouter ou mettre à jour l'email dans la sous-collection delivered
                  console.log('✏️ Écriture des données email dans la transaction');
                  transaction.set(deliveredRef, emailData, { merge: true });
                  
                  // Mettre à jour le compteur dans le document de configuration
                  const configRef = campaignRef.collection('emails').doc('config');
                  const configDoc = await transaction.get(configRef);
                  
                  console.log('⚙️ Configuration existante?', configDoc.exists);
                  
                  if (configDoc.exists) {
                    // Mettre à jour le compteur existant
                    console.log('⬆️ Mise à jour du compteur existant');
                    transaction.update(configRef, {
                      'totalEmails.delivered': admin.firestore.FieldValue.increment(1),
                      'lastUpdated': new Date()
                    });
                  } else {
                    // Créer un nouveau document de configuration
                    console.log('🆕 Création d\'un nouveau document de configuration');
                    transaction.set(configRef, {
                      totalEmails: {
                        delivered: 1,
                        pending: 0,
                        failed: 0
                      },
                      lastUpdated: new Date()
                    });
                  }
                });
                console.log('✅ Transaction Firestore réussie');
              } catch (transactionError) {
                console.error('❌ Erreur durant la transaction Firestore:', transactionError);
                // Tenter un enregistrement sans transaction en cas d'échec
                console.log('🔄 Tentative d\'enregistrement sans transaction...');
                await deliveredRef.set(emailData, { merge: true });
                console.log('✅ Enregistrement direct réussi');
              }
              
              console.log(`✅ Email ${recipient.email} ajouté à la sous-collection emails/delivered/items de la campagne ${requestData.campaignId}`);
              
              // Mettre à jour les statistiques de la campagne
              try {
                await campaignRef.update({
                  'stats.emailsSent': admin.firestore.FieldValue.increment(1),
                  'stats.lastSent': new Date(),
                  'updatedAt': new Date()
                });
                console.log(`📊 Statistiques de la campagne ${requestData.campaignId} mises à jour`);
              } catch (statsError) {
                console.error('❌ Erreur lors de la mise à jour des statistiques:', statsError);
              }

              // Notifier le système de tracking via API add-to-contacted
              try {
                const contactedResponse = await fetch(`${baseUrl}/api/add-to-contacted`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    email: recipient.email,
                    campaignId: requestData.campaignId
                  }),
                  cache: 'no-store',
                  next: { revalidate: 0 }
                });
                
                console.log('Réponse add-to-contacted:', {
                  status: contactedResponse.status,
                  statusText: contactedResponse.statusText
                });
                
                if (!contactedResponse.ok) {
                  console.warn(`Erreur lors de l'ajout à la liste des contactés: ${contactedResponse.status}`);
                }
              } catch (contactedError) {
                console.error('Erreur lors de l\'appel à add-to-contacted:', contactedError);
              }
            } catch (error) {
              console.error('Erreur lors de l\'ajout de l\'email à la campagne:', error);
            }
          }
          
          successCount++;
        } catch (error: any) {
          console.error(`Erreur lors de l'envoi de l'email à ${recipient.email}:`, error);
          failedCount++;
          errors.push(`${recipient.email}: ${error.message || 'Erreur inconnue'}`);
        }
      }
      
      console.log(`Envoi terminé. Succès: ${successCount}, Échecs: ${failedCount}`);
      
      return NextResponse.json({
        success: true,
        sent: successCount,
        failed: failedCount,
        errors: errors,
        message: `${successCount} emails envoyés avec succès, ${failedCount} échecs`
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'intégration des images ou de l\'envoi des emails:', error);
      return NextResponse.json({
        success: false,
        sent: successCount,
        failed: failedCount,
        error: `Erreur lors de l'envoi : ${error.message}`,
        errors: errors
      });
    }
  } catch (error: any) {
    console.error('Erreur lors du traitement de la requête:', error);
    return NextResponse.json({
      success: false,
      error: `Erreur lors du traitement de la requête: ${error.message}`,
    }, { status: 500 });
  }
}