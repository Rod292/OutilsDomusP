// Ce fichier contient la configuration pour l'API Google Gmail.
// Ces valeurs doivent correspondre exactement à celles configurées dans la console Google Cloud.
// IMPORTANT : Ne pas inclure d'espaces supplémentaires au début ou à la fin des valeurs.

// Pour l'authentification OAuth, vous devez également configurer un CLIENT_SECRET
// dans les variables d'environnement de votre serveur (GOOGLE_CLIENT_SECRET)

export const GMAIL_CONFIG = {
  // L'ID client OAuth de votre projet Google Cloud
  CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",

  // La clé API de votre projet Google Cloud
  API_KEY: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "", // On utilise le même ID client comme clé API

  // Le doc de découverte pour l'API Gmail
  DISCOVERY_DOC: "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",

  // L'étendue des permissions demandées
  SCOPES: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"
}; 