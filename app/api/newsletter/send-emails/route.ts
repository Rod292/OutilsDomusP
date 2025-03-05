import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configurer le transporter Nodemailer avec les informations SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Type pour les destinataires
interface Recipient {
  email: string;
  nom: string;
  entreprise: string;
  [key: string]: string;
}

// Fonction pour personnaliser le contenu HTML pour chaque destinataire
function personalizeHtml(html: string, recipient: Recipient): string {
  let personalized = html;
  
  // Remplacer les variables par leurs valeurs
  for (const [key, value] of Object.entries(recipient)) {
    personalized = personalized.replace(new RegExp(`{{${key}}}`, 'gi'), value || '');
  }
  
  // Assurer que toutes les variables non remplacées sont vides
  return personalized.replace(/{{[^{}]+}}/g, '');
}

export async function POST(req: NextRequest) {
  try {
    // Récupérer les données du corps de la requête
    const body = await req.json();
    const { recipients, htmlContent, subject, senderEmail } = body;
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Aucun destinataire spécifié' },
        { status: 400 }
      );
    }
    
    if (!htmlContent) {
      return NextResponse.json(
        { error: 'Contenu HTML manquant' },
        { status: 400 }
      );
    }
    
    // Récupérer l'adresse email de l'expéditeur soit de la requête, soit de l'environnement
    const fromEmail = senderEmail || process.env.SENDER_EMAIL;
    const fromName = process.env.SENDER_NAME || 'Arthur Loyd Bretagne';
    
    // Envoyer les emails
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as { email: string; error: string }[]
    };
    
    // Envoyer à chaque destinataire
    for (const recipient of recipients) {
      try {
        // Personnaliser le contenu HTML
        const personalizedHtml = personalizeHtml(htmlContent, recipient);
        
        // Envoyer l'email
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: recipient.email,
          subject: subject || 'Newsletter Arthur Loyd Bretagne',
          html: personalizedHtml
        });
        
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
        console.error(`Erreur lors de l'envoi à ${recipient.email}:`, error);
      }
    }
    
    // Retourner les résultats
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi des emails' },
      { status: 500 }
    );
  }
} 