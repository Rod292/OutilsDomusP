import axios from 'axios';

// Interface pour la réponse de l'API
interface ChatResponse {
  message: string;
  timestamp: string;
  status: string;
}

// Interface pour l'historique des messages
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Envoie un message à l'API via notre proxy
 * @param message Le message à envoyer
 * @param history L'historique des messages précédents (optionnel)
 * @returns La réponse de l'API
 */
export async function sendMessage(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
  try {
    // Préparer les données pour l'API
    const payload = {
      message: message,
      history: history
    };
    
    // Appel à notre proxy Mistral
    const response = await axios.post('/api/mistral-proxy', payload);
    
    // Formater la réponse
    return {
      message: response.data.message || 'Pas de réponse',
      timestamp: new Date().toISOString(),
      status: 'success'
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    
    // Retourne une réponse d'erreur
    return {
      message: 'Désolé, une erreur est survenue lors de la communication avec Arthur. Veuillez réessayer.',
      timestamp: new Date().toISOString(),
      status: 'error'
    };
  }
} 