import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const GMAIL_CONFIG = {
  CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI: `${process.env.NEXT_PUBLIC_BASE_URL}/oauth-redirect`
};

let _gmailClient: any = null;

export async function getGmailClient() {
  if (_gmailClient) return _gmailClient;

  const oauth2Client = new OAuth2Client(
    GMAIL_CONFIG.CLIENT_ID,
    GMAIL_CONFIG.CLIENT_SECRET,
    GMAIL_CONFIG.REDIRECT_URI
  );

  // Ici, vous devriez récupérer le token d'accès stocké
  // Pour l'instant, nous utilisons un client simple
  _gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
  return _gmailClient;
}

export async function getUserProfile(accessToken: string) {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  const profile = await gmail.users.getProfile({
    userId: 'me'
  });
  
  return profile.data;
}

export function createMessage({ to, subject, html, from }: {
  to: string;
  subject: string;
  html: string;
  from: string;
}) {
  const message = [
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    '',
    html
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendMessage(gmail: any, message: string) {
  return gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: message
    }
  });
} 