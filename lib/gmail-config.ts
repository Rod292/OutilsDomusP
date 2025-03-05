export const GMAIL_CONFIG = {
  CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  SCOPES: 'https://www.googleapis.com/auth/gmail.send',
}; 