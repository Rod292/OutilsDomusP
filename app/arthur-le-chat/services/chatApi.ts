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

// Interface pour une conversation complète
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

/**
 * Envoie un message à l'API via notre proxy
 * @param message Le message à envoyer
 * @param history L'historique des messages précédents (optionnel)
 * @param consultant Le nom du consultant sélectionné (optionnel)
 * @returns La réponse de l'API
 */
export async function sendMessage(
  message: string, 
  history: ChatMessage[] = [], 
  consultant: string = 'votre conseiller'
): Promise<ChatResponse> {
  try {
    // Préparer les données pour l'API
    const payload = {
      message: message,
      history: history,
      consultant: consultant
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
    throw error;
  }
}

// Clé de stockage local pour les conversations
const STORAGE_KEY = 'arthur_chat_conversations';

/**
 * Récupère toutes les conversations sauvegardées
 */
export function getConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    return [];
  }
}

/**
 * Sauvegarde une conversation
 */
export function saveConversation(conversation: Conversation): void {
  if (typeof window === 'undefined') return;
  
  const conversations = getConversations();
  
  // Vérifier si la conversation existe déjà
  const existingIndex = conversations.findIndex(c => c.id === conversation.id);
  
  if (existingIndex >= 0) {
    // Mettre à jour la conversation existante
    conversations[existingIndex] = conversation;
  } else {
    // Ajouter la nouvelle conversation
    conversations.push(conversation);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

/**
 * Supprime une conversation
 */
export function deleteConversation(conversationId: string): void {
  if (typeof window === 'undefined') return;
  
  const conversations = getConversations();
  const updatedConversations = conversations.filter(c => c.id !== conversationId);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConversations));
}

/**
 * Génère un titre pour une conversation basé sur le premier message
 */
export function generateConversationTitle(messages: ChatMessage[]): string {
  if (!messages.length) return 'Nouvelle conversation';
  
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'Nouvelle conversation';
  
  // Limiter la longueur du titre
  const content = firstUserMessage.content.trim();
  if (content.length <= 30) return content;
  
  return content.substring(0, 27) + '...';
}

/**
 * Génère un ID unique pour une nouvelle conversation
 */
export function generateConversationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
} 