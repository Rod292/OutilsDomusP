// Configuration pour l'API Mistral
export const config = {
  apiKey: process.env.NEXT_PUBLIC_LECHAT_API_KEY || '',
  apiUrl: process.env.NEXT_PUBLIC_LECHAT_API_URL || 'https://api.lechat.io/v1',
  agentId: process.env.NEXT_PUBLIC_LECHAT_AGENT_ID || ''
}; 