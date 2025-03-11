"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Cat, AlertTriangle, Trash2, Plus, MessageSquare } from 'lucide-react';
import { 
  sendMessage, 
  ChatMessage, 
  Conversation, 
  getConversations, 
  saveConversation, 
  deleteConversation, 
  generateConversationId, 
  generateConversationTitle 
} from '../services/chatApi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger les conversations au démarrage
  useEffect(() => {
    const savedConversations = getConversations();
    setConversations(savedConversations);
    
    // Si des conversations existent, charger la plus récente
    if (savedConversations.length > 0) {
      const mostRecent = savedConversations.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      )[0];
      
      setActiveConversationId(mostRecent.id);
      setMessages(mostRecent.messages);
    }
  }, []);

  // Faire défiler vers le bas lorsque de nouveaux messages sont ajoutés
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input au chargement
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sauvegarder la conversation active lorsque les messages changent
  useEffect(() => {
    if (messages.length > 0 && activeConversationId) {
      const conversation: Conversation = {
        id: activeConversationId,
        title: generateConversationTitle(messages),
        messages: messages,
        lastUpdated: new Date().toISOString()
      };
      
      saveConversation(conversation);
      
      // Mettre à jour la liste des conversations
      setConversations(getConversations());
    }
  }, [messages, activeConversationId]);

  // Créer une nouvelle conversation
  const handleNewConversation = () => {
    const newId = generateConversationId();
    setActiveConversationId(newId);
    setMessages([]);
    setInput('');
    setApiError(null);
    setIsMobileMenuOpen(false);
    inputRef.current?.focus();
  };

  // Charger une conversation existante
  const handleLoadConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversationId(conversationId);
      setMessages(conversation.messages);
      setApiError(null);
      setIsMobileMenuOpen(false);
    }
  };

  // Supprimer une conversation
  const handleDeleteConversation = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    deleteConversation(conversationId);
    setConversations(getConversations());
    
    // Si la conversation active est supprimée, créer une nouvelle conversation
    if (conversationId === activeConversationId) {
      handleNewConversation();
    }
  };

  // Gérer l'envoi d'un message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Réinitialiser l'erreur API
    setApiError(null);

    // Créer une nouvelle conversation si nécessaire
    if (!activeConversationId) {
      const newId = generateConversationId();
      setActiveConversationId(newId);
    }

    // Ajouter le message de l'utilisateur
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    // Mettre à jour l'interface
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Envoyer le message à l'API
      const response = await sendMessage(userMessage.content, messages);

      // Ajouter la réponse d'Arthur
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      // Vérifier si l'erreur contient des détails spécifiques
      let errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        
        // Vérifier s'il s'agit d'une erreur d'API manquante
        if (error.response.status === 500 && error.response.data.error.includes('Configuration API manquante')) {
          setApiError('La clé API Mistral n\'est pas configurée. Veuillez configurer une clé API valide dans le fichier .env.local.');
        }
      }
      
      // Ajouter un message d'erreur
      const errorAssistantMessage: ChatMessage = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
      // Focus sur l'input après l'envoi
      inputRef.current?.focus();
    }
  };

  // Formater le texte avec des sauts de ligne
  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy, HH:mm', { locale: fr });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] w-full max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      {/* Barre latérale pour les conversations (masquée sur mobile) */}
      <div className={`w-80 bg-gray-50 border-r border-gray-200 flex-shrink-0 ${isMobileMenuOpen ? 'block absolute inset-y-0 left-0 z-50 h-full' : 'hidden md:block'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <Button 
              onClick={handleNewConversation}
              className="w-full bg-[#DC0032] hover:bg-[#B00029] flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle conversation
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune conversation</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations
                  .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                  .map(conversation => (
                    <div 
                      key={conversation.id}
                      onClick={() => handleLoadConversation(conversation.id)}
                      className={`p-3 rounded-lg cursor-pointer flex items-center justify-between group ${
                        activeConversationId === conversation.id 
                          ? 'bg-[#DC0032]/10 text-[#DC0032]' 
                          : 'hover:bg-gray-200/50 text-gray-700'
                      }`}
                    >
                      <div className="flex-1 truncate">
                        <p className="font-medium truncate">{conversation.title}</p>
                        <p className="text-xs opacity-70">
                          {formatDate(conversation.lastUpdated)}
                        </p>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDeleteConversation(e, conversation.id)}
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Supprimer cette conversation</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))
                }
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      
      {/* Zone principale de chat */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gradient-to-r from-[#DC0032] to-[#FF3366] p-4 text-white flex justify-between items-center">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3 border-2 border-white">
              <AvatarFallback className="bg-white text-[#DC0032]">
                <Cat size={20} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">Arthur le chat</h3>
              <p className="text-xs opacity-90">Assistant virtuel Arthur Loyd</p>
            </div>
          </div>
          
          {/* Bouton pour afficher/masquer le menu sur mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-white hover:bg-white/20"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        
        {apiError && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">{apiError}</p>
              <p className="text-xs mt-1 text-amber-700">
                Pour obtenir une clé API Mistral, créez un compte sur <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="underline">console.mistral.ai</a>
              </p>
            </div>
          </div>
        )}
        
        <ScrollArea className="flex-1 p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
              <Avatar className="h-20 w-20 mb-6 shadow-lg">
                <AvatarFallback className="bg-[#DC0032] text-white text-xl">
                  <Cat size={32} />
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-medium text-gray-700 mb-2">Bonjour, je suis Arthur !</h3>
              <p className="text-gray-500 max-w-md">
                Je suis votre assistant virtuel spécialisé en immobilier d'entreprise. 
                Comment puis-je vous aider aujourd'hui ?
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-[#DC0032] text-white">
                        <Cat size={16} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    <Card className={`max-w-[85%] ${
                      msg.role === 'user' 
                        ? 'bg-[#DC0032] text-white border-[#DC0032]' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <CardContent className="p-3 text-sm">
                        {formatMessage(msg.content)}
                      </CardContent>
                    </Card>
                    <span className="text-xs text-gray-500 mt-1 px-2">
                      {formatDate(msg.timestamp)}
                    </span>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-gray-200">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Avatar className="h-8 w-8 mr-2 mt-1">
                    <AvatarFallback className="bg-[#DC0032] text-white">
                      <Cat size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="bg-white border-gray-200 w-24">
                    <CardContent className="p-3 flex justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[#DC0032]" />
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-gray-200 bg-white">
          <form 
            className="flex space-x-2" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message..."
              disabled={isLoading}
              className="flex-1 border-gray-300 focus:border-[#DC0032] focus:ring-[#DC0032]"
            />
            <Button 
              type="submit"
              onClick={handleSendMessage} 
              disabled={isLoading}
              className="bg-[#DC0032] hover:bg-[#B00029]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Envoyer</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 