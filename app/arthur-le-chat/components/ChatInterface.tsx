"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { sendMessage, ChatMessage } from '../services/chatApi';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Faire défiler vers le bas lorsque de nouveaux messages sont ajoutés
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input au chargement
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Gérer l'envoi d'un message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

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
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      // Ajouter un message d'erreur
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
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

  return (
    <div className="flex flex-col h-[600px] max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-r from-[#DC0032] to-[#FF3366] p-4 text-white">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3 border-2 border-white">
            <AvatarImage src="/arthur-avatar.png" alt="Arthur le chat" />
            <AvatarFallback className="bg-white text-[#DC0032]">AC</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Arthur le chat</h3>
            <p className="text-xs opacity-90">Assistant virtuel Arthur Loyd</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
            <Avatar className="h-20 w-20 mb-6 shadow-lg">
              <AvatarImage src="/arthur-avatar.png" alt="Arthur le chat" />
              <AvatarFallback className="bg-[#DC0032] text-white text-xl">AC</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-medium text-gray-700 mb-2">Bonjour, je suis Arthur !</h3>
            <p className="text-gray-500 max-w-md">
              Je suis votre assistant virtuel spécialisé en immobilier d'entreprise. 
              Comment puis-je vous aider aujourd'hui ?
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
              <Button 
                variant="outline" 
                className="text-left justify-start p-3 h-auto"
                onClick={() => setInput("Quels sont les services proposés par Arthur Loyd ?")}
              >
                Services Arthur Loyd
              </Button>
              <Button 
                variant="outline" 
                className="text-left justify-start p-3 h-auto"
                onClick={() => setInput("Comment fonctionne un état des lieux ?")}
              >
                États des lieux
              </Button>
              <Button 
                variant="outline" 
                className="text-left justify-start p-3 h-auto"
                onClick={() => setInput("Quels types de biens proposez-vous ?")}
              >
                Types de biens
              </Button>
              <Button 
                variant="outline" 
                className="text-left justify-start p-3 h-auto"
                onClick={() => setInput("Comment contacter un conseiller ?")}
              >
                Contacter un conseiller
              </Button>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                  <AvatarImage src="/arthur-avatar.png" alt="Arthur" />
                  <AvatarFallback className="bg-[#DC0032] text-white">AC</AvatarFallback>
                </Avatar>
              )}
              <Card className={`max-w-[85%] ${
                msg.role === 'user' 
                  ? 'bg-[#DC0032] text-white border-[#DC0032]' 
                  : 'bg-white border-gray-200'
              }`}>
                <CardContent className="p-3 text-sm">
                  {formatMessage(msg.content)}
                </CardContent>
              </Card>
              {msg.role === 'user' && (
                <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                  <AvatarFallback className="bg-gray-200">U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <Avatar className="h-8 w-8 mr-2 mt-1">
              <AvatarImage src="/arthur-avatar.png" alt="Arthur" />
              <AvatarFallback className="bg-[#DC0032] text-white">AC</AvatarFallback>
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
  );
} 