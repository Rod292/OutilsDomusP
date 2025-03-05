import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { parse } from 'csv-parse/sync';
import { uploadImage } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Configuration de l'envoi d'emails
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const senderEmail = process.env.SENDER_EMAIL || '';
const senderName = process.env.SENDER_NAME || 'Arthur Loyd Bretagne';

// Vérifie que les variables d'environnement SMTP sont définies
const isSmtpConfigured = smtpHost && smtpPort && smtpUser && smtpPass && senderEmail;

// Fonction pour sauvegarder une image uploadée
async function saveImage(file: File): Promise<string> {
  try {
    // Utiliser Firebase Storage plutôt que le stockage local
    const downloadURL = await uploadImage(file, 'newsletter-pemsud');
    return downloadURL;
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error);
    throw error;
  }
}

// Fonction pour récupérer le template HTML de la newsletter
async function getNewsletterTemplate(
  templateId: string, 
  params: {
    title: string;
    headline: string;
    introduction: string;
    propertyTitle: string;
    propertyLocation: string;
    propertySize: string;
    propertyPrice: string;
    propertyDescription: string;
    highlightsList: string;
    ctaText: string;
    ctaUrl: string;
    imageUrl1?: string;
    imageUrl2?: string;
    imageUrl3?: string;
    imageUrl4?: string;
    clientName?: string; // Ajout du nom du client
    clientCompany?: string; // Ajout de l'entreprise du client
  },
  recipientEmail: string
): Promise<string> {
  // Construction de l'URL pour appeler l'API preview-newsletter
  let url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/preview-newsletter`);
  url.searchParams.append('templateId', templateId);
  url.searchParams.append('title', params.title);
  url.searchParams.append('headline', params.headline);
  url.searchParams.append('introduction', params.introduction);
  url.searchParams.append('propertyTitle', params.propertyTitle);
  url.searchParams.append('propertyLocation', params.propertyLocation);
  url.searchParams.append('propertySize', params.propertySize);
  url.searchParams.append('propertyPrice', params.propertyPrice);
  url.searchParams.append('propertyDescription', params.propertyDescription);
  url.searchParams.append('highlightsList', params.highlightsList);
  url.searchParams.append('ctaText', params.ctaText);
  url.searchParams.append('ctaUrl', params.ctaUrl);
  url.searchParams.append('email', recipientEmail);
  
  // Ajouter les informations du client pour la personnalisation
  if (params.clientName) url.searchParams.append('clientName', params.clientName);
  if (params.clientCompany) url.searchParams.append('clientCompany', params.clientCompany);
  
  // Ajouter les URLs des images si elles existent
  if (params.imageUrl1) url.searchParams.append('imageUrl1', params.imageUrl1);
  if (params.imageUrl2) url.searchParams.append('imageUrl2', params.imageUrl2);
  if (params.imageUrl3) url.searchParams.append('imageUrl3', params.imageUrl3);
  if (params.imageUrl4) url.searchParams.append('imageUrl4', params.imageUrl4);
  
  // Récupérer le contenu HTML du template
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération du template: ${response.statusText}`);
  }
  
  // Obtenir le HTML du template
  let html = await response.text();
  return html;
}

// Fonction pour envoyer un email
async function sendEmail(
  to: string, 
  subject: string, 
  html: string, 
  recipientName?: string
): Promise<void> {
  if (!isSmtpConfigured) {
    throw new Error('Configuration SMTP incomplète. Vérifiez les variables d\'environnement.');
  }
  
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  
  // Personnaliser l'objet avec le nom du destinataire s'il est fourni
  const personalizedSubject = recipientName ? `${subject} - ${recipientName}` : subject;
  
  await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject: personalizedSubject,
    html,
  });
}

// Utiliser le client SMTP pour envoyer un email test
async function sendTestEmail(params: {
  to: string;
  subject: string;
  templateId: string;
  title: string;
  headline: string;
  introduction: string;
  propertyTitle: string;
  propertyLocation: string;
  propertySize: string;
  propertyPrice: string;
  propertyDescription: string;
  highlightsList: string;
  ctaText: string;
  ctaUrl: string;
  imageUrls: string[];
  clientName?: string; // Ajout du nom du client
  clientCompany?: string; // Ajout de l'entreprise du client
}) {
  const {
    to,
    subject,
    templateId,
    title,
    headline,
    introduction,
    propertyTitle,
    propertyLocation,
    propertySize,
    propertyPrice,
    propertyDescription,
    highlightsList,
    ctaText,
    ctaUrl,
    imageUrls,
    clientName,
    clientCompany
  } = params;
  
  // ... existing code ...
  
  // Si c'est le template PEM Sud
  if (templateId === 'pem_sud') {
    // Générer le contenu HTML en utilisant le template PEM Sud
    htmlContent = await generatePemSudTemplate({
      title,
      headline,
      introduction,
      propertyTitle,
      propertyLocation,
      propertySize,
      propertyPrice,
      propertyDescription,
      highlightsList,
      ctaText,
      ctaUrl,
      imageUrl1: imageUrls[0] || null,
      imageUrl2: imageUrls[1] || null,
      imageUrl3: imageUrls[2] || null,
      imageUrl4: imageUrls[3] || null,
      unsubscribeEmail: to,
      clientName,
      clientCompany
    });
  }
  
  // ... existing code ...
}

// Filtrer les emails désinscrits avant envoi
async function filterUnsubscribedEmails(recipients: any[]) {
  try {
    if (!db) {
      console.error('Firebase DB non initialisé');
      return recipients;
    }

    console.log(`Filtrage des emails désinscrits parmi ${recipients.length} destinataires...`);
    
    // Récupérer tous les emails désinscrits depuis Firestore
    const unsubscribedRef = collection(db, 'unsubscribed');
    const unsubscribedSnapshot = await getDocs(unsubscribedRef);
    
    if (unsubscribedSnapshot.empty) {
      console.log('Aucun email désinscrit trouvé');
      return recipients;
    }
    
    // Créer un ensemble d'emails désinscrits pour une recherche efficace
    const unsubscribedEmails = new Set();
    unsubscribedSnapshot.forEach(doc => {
      unsubscribedEmails.add(doc.data().email.toLowerCase());
    });
    
    console.log(`${unsubscribedEmails.size} emails désinscrits trouvés`);
    
    // Filtrer les destinataires
    const filteredRecipients = recipients.filter(recipient => {
      const email = recipient.EMAIL || recipient.email || '';
      if (!email) return false;
      
      const isUnsubscribed = unsubscribedEmails.has(email.toLowerCase());
      if (isUnsubscribed) {
        console.log(`Filtrage de l'email désinscrit: ${email}`);
      }
      
      return !isUnsubscribed;
    });
    
    console.log(`${recipients.length - filteredRecipients.length} emails filtrés. Nombre final de destinataires: ${filteredRecipients.length}`);
    return filteredRecipients;
  } catch (error) {
    console.error('Erreur lors du filtrage des emails désinscrits:', error);
    return recipients;
  }
}

// Analyser le fichier CSV et envoyer la newsletter à tous les clients
async function processCsvAndSendNewsletter(
  csvBuffer: Buffer,
  subject: string,
  templateId: string,
  templateParams: any
): Promise<{ successful: number; failed: number; total: number }> {
  if (!isSmtpConfigured) {
    throw new Error('La configuration SMTP est incomplète. Veuillez configurer les variables d\'environnement SMTP.');
  }
  
  // Analyser le fichier CSV
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true
  });
  
  // Statistiques d'envoi
  let successful = 0;
  let failed = 0;
  const total = records.length;
  
  // Filtrer les emails désinscrits
  const filteredRecipients = await filterUnsubscribedEmails(records);

  if (filteredRecipients.length === 0) {
    return { successful: 0, failed: 0, total: 0 };
  }
  
  // Parcourir chaque enregistrement du CSV et envoyer l'email
  for (const record of records) {
    try {
      const email = record.EMAIL;
      if (!email) {
        console.warn('Enregistrement sans adresse email:', record);
        failed++;
        continue;
      }
      
      // Récupérer les informations client pour la personnalisation
      const clientName = record.NOM_CLIENT || '';
      const clientCompany = record.ENTREPRISE || '';
      
      // Obtenir le HTML du template avec personnalisation
      const paramsWithClient = {
        ...templateParams,
        clientName,
        clientCompany
      };
      
      const html = await getNewsletterTemplate(templateId, paramsWithClient, email);
      
      // Envoyer l'email
      await sendEmail(email, subject, html, clientName);
      successful++;
    } catch (error) {
      console.error('Erreur lors de l\'envoi à un destinataire:', error);
      failed++;
    }
  }
  
  return { successful, failed, total };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    const subject = formData.get('subject') as string;
    const templateId = formData.get('templateId') as string;
    
    if (!subject || !templateId) {
      return NextResponse.json(
        { message: 'Objet ou ID du template manquant' },
        { status: 400 }
      );
    }
    
    // Récupérer les paramètres du template
    const title = formData.get('title') as string || 'Arthur Loyd - Newsletter';
    const headline = formData.get('headline') as string || '';
    const introduction = formData.get('introduction') as string || '';
    const propertyTitle = formData.get('propertyTitle') as string || '';
    const propertyLocation = formData.get('propertyLocation') as string || '';
    const propertySize = formData.get('propertySize') as string || '';
    const propertyPrice = formData.get('propertyPrice') as string || '';
    const propertyDescription = formData.get('propertyDescription') as string || '';
    const highlightsList = formData.get('highlightsList') as string || '';
    const ctaText = formData.get('ctaText') as string || 'Découvrir le projet';
    const ctaUrl = formData.get('ctaUrl') as string || 'https://www.arthur-loyd-bretagne.com';
    
    // Traiter les images (jusqu'à 4 images)
    const image1 = formData.get('image1') as File | null;
    const image2 = formData.get('image2') as File | null;
    const image3 = formData.get('image3') as File | null;
    const image4 = formData.get('image4') as File | null;
    
    // Variables pour stocker les URLs des images
    let imageUrl1, imageUrl2, imageUrl3, imageUrl4;
    
    // Enregistrer les images et obtenir leurs URLs (maintenant avec Firebase Storage)
    if (image1 && image1.size > 0) {
      imageUrl1 = await saveImage(image1);
    }
    
    if (image2 && image2.size > 0) {
      imageUrl2 = await saveImage(image2);
    }
    
    if (image3 && image3.size > 0) {
      imageUrl3 = await saveImage(image3);
    }
    
    if (image4 && image4.size > 0) {
      imageUrl4 = await saveImage(image4);
    }
    
    // Paramètres complets pour le template
    const templateParams = {
      title,
      headline,
      introduction,
      propertyTitle,
      propertyLocation,
      propertySize,
      propertyPrice,
      propertyDescription,
      highlightsList,
      ctaText,
      ctaUrl,
      imageUrl1,
      imageUrl2,
      imageUrl3,
      imageUrl4
    };
    
    // Traitement de l'action "test"
    if (action === 'test') {
      const testEmail = formData.get('testEmail') as string;
      const clientName = formData.get('clientName') as string || '';
      const clientCompany = formData.get('clientCompany') as string || '';
      
      if (!testEmail) {
        return NextResponse.json(
          { message: 'Adresse email de test manquante' },
          { status: 400 }
        );
      }
      
      try {
        // CONTOURNEMENT TEMPORAIRE - utiliser des URLs d'images par défaut au lieu d'uploader
        console.log("Contournement du téléchargement d'images vers Firebase pour le test");
        
        const imageUrl1 = image1 && image1.size > 0 
          ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/newsletter-pemsud/project-photo-1.png` 
          : undefined;
        
        const imageUrl2 = image2 && image2.size > 0 
          ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/newsletter-pemsud/project-photo-2.png` 
          : undefined;
          
        const imageUrl3 = image3 && image3.size > 0 
          ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/newsletter-pemsud/project-photo-3.png` 
          : undefined;
          
        const imageUrl4 = image4 && image4.size > 0 
          ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/newsletter-pemsud/project-photo-1.png` 
          : undefined;
        
        // Paramètres du template avec images par défaut
        const templateParamsWithClient = {
          ...templateParams,
          imageUrl1,
          imageUrl2,
          imageUrl3,
          imageUrl4,
          clientName,
          clientCompany
        };
        
        // Récupérer le HTML du template
        const html = await getNewsletterTemplate(templateId, templateParamsWithClient, testEmail);
        
        // Envoyer l'email de test
        await sendEmail(testEmail, subject, html, clientName);
        
        return NextResponse.json({ 
          message: 'Email test envoyé avec succès (images de test utilisées)',
          note: 'Les images ont été remplacées par des images de test en raison d\'un problème avec Firebase Storage'
        });
      } catch (error) {
        console.error("Erreur lors de l'envoi du test avec contournement:", error);
        return NextResponse.json(
          { message: `Erreur lors de l'envoi du test: ${error instanceof Error ? error.message : String(error)}` },
          { status: 500 }
        );
      }
    }
    
    // Envoi en masse
    if (action === 'bulk') {
      const clientsFile = formData.get('clientsFile') as File;
      
      if (!clientsFile) {
        return NextResponse.json(
          { message: 'Fichier CSV des clients manquant' },
          { status: 400 }
        );
      }
      
      // Lire et parser le fichier CSV
      const csvContent = await clientsFile.text();
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
      });
      
      if (!records || records.length === 0) {
        return NextResponse.json(
          { message: 'Le fichier CSV ne contient aucun enregistrement valide' },
          { status: 400 }
        );
      }
      
      // Statistiques pour le suivi
      const stats = {
        total: records.length,
        successful: 0,
        failed: 0,
      };
      
      // Filtrer les emails désinscrits
      const filteredRecipients = await filterUnsubscribedEmails(records);

      if (filteredRecipients.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Aucun destinataire valide après filtrage des désinscrits'
        }, { status: 400 });
      }
      
      // Envoyer les emails en série pour éviter de surcharger le serveur SMTP
      for (const record of filteredRecipients) {
        try {
          const email = record.EMAIL || record.email || '';
          const name = record.NOM_CLIENT || record.nom_client || record.nom || '';
          const company = record.ENTREPRISE || record.entreprise || '';
          
          if (!email) {
            stats.failed++;
            continue;
          }
          
          // Récupérer le HTML du template personnalisé pour chaque destinataire
          let html = await getNewsletterTemplate(templateId, {
            ...templateParams,
            clientName: name,
            clientCompany: company
          }, email);
          
          // Envoyer l'email
          await sendEmail(email, subject, html, name);
          
          stats.successful++;
        } catch (error) {
          console.error('Erreur lors de l\'envoi à un destinataire:', error);
          stats.failed++;
        }
      }
      
      return NextResponse.json({
        message: `Newsletter envoyée: ${stats.successful} réussis, ${stats.failed} échecs sur ${stats.total} total`,
        successful: stats.successful,
        failed: stats.failed,
        total: stats.total,
      });
    }
    
    return NextResponse.json(
      { message: 'Action non reconnue. Utilisez "test" ou "bulk".' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Erreur lors de l\'envoi de la newsletter:', error);
    
    return NextResponse.json(
      { message: `Erreur lors de l'envoi: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 