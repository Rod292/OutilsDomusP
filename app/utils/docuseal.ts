// app/utils/docuseal.ts
const DOCUSEAL_API_URL = process.env.DOCUSEAL_API_URL || 'https://api.docuseal.com';
const DOCUSEAL_UI_URL = process.env.NEXT_PUBLIC_DOCUSEAL_URL || 'https://docuseal.com';
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY || '2Ai5r4MjkAA6bJKj76UxbaZ7WzW6RbJWwYfDQTf8G4u';
const DOCUSEAL_TEST_API_KEY = process.env.DOCUSEAL_TEST_API_KEY || 'g7LoisNUUtAJNqtcZWQeZ69w2gVT9KJCUj7r2tAH68d';
const DOCUSEAL_TEST_MODE = process.env.DOCUSEAL_TEST_MODE === 'true';

// Fonction qui détermine quelle clé API utiliser
export function getApiKey() {
  return DOCUSEAL_TEST_MODE ? DOCUSEAL_TEST_API_KEY : DOCUSEAL_API_KEY;
}

// Helper pour les requêtes API
export async function docusealFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${DOCUSEAL_API_URL}${endpoint}`;
  const apiKey = getApiKey();
  
  const headers = {
    'X-Auth-Token': apiKey as string,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`DocuSeal API Error (${response.status}): ${error}`);
  }
  
  return response.json();
}

// Fonctions API
export async function fetchTemplates() {
  return docusealFetch('/templates');
}

export async function createSubmission(templateId: string, submitters: Array<{email: string, name?: string}>) {
  return docusealFetch('/submissions', {
    method: 'POST',
    body: JSON.stringify({
      template_id: templateId,
      submitters
    })
  });
}

export async function getSubmission(submissionId: string) {
  return docusealFetch(`/submissions/${submissionId}`);
}

export async function uploadDocument(templateId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const apiKey = getApiKey();
  
  const response = await fetch(`${DOCUSEAL_API_URL}/templates/${templateId}/documents`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': apiKey as string,
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Erreur lors du téléchargement: ${response.status}`);
  }
  
  return response.json();
}

// Fonction pour basculer entre mode test et production
export function isTestMode() {
  return DOCUSEAL_TEST_MODE;
}

// Fonction pour obtenir l'URL de DocuSeal UI
export function getDocuSealURL() {
  return DOCUSEAL_UI_URL;
} 