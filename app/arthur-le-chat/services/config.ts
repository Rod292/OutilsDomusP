// Configuration pour l'API Mistral
export const config = {
  apiKey: process.env.MISTRAL_API_KEY || '',
  apiUrl: process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions',
  model: 'mistral-tiny',
  temperature: 0.7,
  maxTokens: 1000
};