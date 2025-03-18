"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/app/components/header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/hooks/useAuth';
import { 
  Brain, Send, User, Bot, Loader2, Copy, Check, Paperclip, X, FileText, 
  Image as ImageIcon, File, Plus, Trash2, MessageSquare, MoreVertical, 
  MoonStar, Sun, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

// Types pour les messages
type MessageType = 'user' | 'assistant';
type AttachmentType = 'image' | 'document' | 'other';

// Composant principal avec Suspense pour résoudre l'erreur de déploiement
export default function IAAssistantPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <IAAssistant />
    </Suspense>
  );
}

// Types pour les messages
interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  url: string;
  file?: File;
  previewUrl?: string;
}

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Composant effectif qui utilise useSearchParams
function IAAssistant() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  // État des conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // État de l'interface
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour obtenir les messages de la conversation active
  const activeMessages = activeConversationId 
    ? conversations.find(c => c.id === activeConversationId)?.messages || []
    : [];

  // Effet pour rediriger si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!loading && !user) {
      router.push('/email-signin');
    }
  }, [user, loading, router]);

  // Effet pour charger les conversations depuis le localStorage
  useEffect(() => {
    if (!loading && user) {
      const savedConversations = localStorage.getItem(`ia-conversations-${user.uid}`);
      if (savedConversations) {
        try {
          // Conversion des timestamps string en objets Date
          const parsed = JSON.parse(savedConversations, (key, value) => {
            if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
              return new Date(value);
            }
            return value;
          });
          setConversations(parsed);
          
          // Charger la dernière conversation active
          const lastActiveId = localStorage.getItem(`ia-active-conversation-${user.uid}`);
          if (lastActiveId && parsed.some((c: Conversation) => c.id === lastActiveId)) {
            setActiveConversationId(lastActiveId);
          } else if (parsed.length > 0) {
            setActiveConversationId(parsed[0].id);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des conversations:', error);
          createNewConversation();
        }
      } else {
        createNewConversation();
      }
    }
  }, [loading, user]);

  // Effet pour sauvegarder les conversations dans le localStorage
  useEffect(() => {
    if (user && conversations.length > 0) {
      localStorage.setItem(`ia-conversations-${user.uid}`, JSON.stringify(conversations));
      if (activeConversationId) {
        localStorage.setItem(`ia-active-conversation-${user.uid}`, activeConversationId);
      }
    }
  }, [conversations, activeConversationId, user]);

  // Effet pour faire défiler vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  // Fonction pour créer une nouvelle conversation
  const createNewConversation = () => {
    const id = Date.now().toString();
    const newConversation: Conversation = {
      id,
      title: `Nouvelle conversation ${new Date().toLocaleString('fr-FR', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`,
      messages: [
        {
          id: 'welcome',
          type: 'assistant',
          content: "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?",
          timestamp: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(id);
    setInput('');
    setAttachments([]);
  };

  // Fonction pour supprimer une conversation
  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    
    // Si la conversation active est supprimée, activer la première conversation
    if (activeConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  // Fonction pour mettre à jour le titre de la conversation
  const updateConversationTitle = (id: string, messages: Message[]) => {
    if (messages.length < 2) return; // Ne pas mettre à jour si pas assez de messages
    
    // Utiliser le premier message de l'utilisateur comme titre
    const firstUserMessage = messages.find(m => m.type === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
      setConversations(prev => prev.map(c => 
        c.id === id ? { ...c, title } : c
      ));
    }
  };

  // Fonction pour gérer l'ajout de pièces jointes
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Fonction pour traiter les fichiers sélectionnés
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    Array.from(files).forEach(file => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const type: AttachmentType = file.type.startsWith('image/') 
        ? 'image' 
        : file.type.includes('pdf') || file.type.includes('word') || file.type.includes('text') 
          ? 'document' 
          : 'other';

      // Créer une URL pour la prévisualisation si c'est une image
      const previewUrl = type === 'image' ? URL.createObjectURL(file) : undefined;

      newAttachments.push({
        id,
        type,
        name: file.name,
        url: '#', // Sera remplacé par l'URL réelle après l'upload
        file,
        previewUrl
      });
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Réinitialiser l'input file pour permettre de sélectionner le même fichier plusieurs fois
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fonction pour supprimer une pièce jointe
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const filtered = prev.filter(attachment => attachment.id !== id);
      
      // Libérer les URL d'objets pour éviter les fuites de mémoire
      const removedAttachment = prev.find(attachment => attachment.id === id);
      if (removedAttachment?.previewUrl) {
        URL.revokeObjectURL(removedAttachment.previewUrl);
      }
      
      return filtered;
    });
  };

  // Fonction pour envoyer un message à l'API Gemini
  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (!activeConversationId) return;

    // Préparer le contenu du message utilisateur
    let userContent = input.trim();
    if (attachments.length > 0) {
      const attachmentNames = attachments.map(a => a.name).join(', ');
      if (userContent) {
        userContent += `\n\nPièces jointes: ${attachmentNames}`;
      } else {
        userContent = `Pièces jointes: ${attachmentNames}`;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userContent,
      timestamp: new Date(),
      attachments: [...attachments]
    };

    // Mettre à jour la conversation avec le nouveau message
    const updatedConversations = conversations.map(conversation => {
      if (conversation.id === activeConversationId) {
        const updatedMessages = [...conversation.messages, userMessage];
        const updatedConversation = {
          ...conversation,
          messages: updatedMessages,
          updatedAt: new Date()
        };
        
        // Mettre à jour le titre si nécessaire
        if (conversation.messages.length === 1) {
          updateConversationTitle(activeConversationId, updatedMessages);
        }
        
        return updatedConversation;
      }
      return conversation;
    });
    
    setConversations(updatedConversations);
    setInput('');
    setAttachments([]);
    setIsProcessing(true);

    try {
      // Préparation des données pour l'API
      let apiContent = input.trim();
      
      // Ajouter des informations sur les pièces jointes dans le prompt
      if (attachments.length > 0) {
        const attachmentDescriptions = attachments.map(a => `- ${a.name} (${a.type})`).join('\n');
        apiContent += `\n\nL'utilisateur a joint les fichiers suivants:\n${attachmentDescriptions}\n\nVeuillez en tenir compte dans votre réponse.`;
      }

      console.log('Envoi de la requête à l\'API Gemini:', apiContent);

      // Appel à l'API via une route API serveur pour protéger la clé
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: apiContent
        }),
      });

      console.log('Statut de la réponse API:', response.status);
      
      if (!response.ok) {
        console.error('Erreur API détaillée:', await response.text());
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      console.log('Réponse API reçue:', data);
      const aiResponse = data.response;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      // Mettre à jour la conversation avec la réponse de l'assistant
      setConversations(prev => prev.map(conversation => {
        if (conversation.id === activeConversationId) {
          return {
            ...conversation,
            messages: [...conversation.messages, assistantMessage],
            updatedAt: new Date()
          };
        }
        return conversation;
      }));
    } catch (error) {
      console.error('Erreur lors de la communication avec l\'API Gemini:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Désolé, une erreur s'est produite lors de la communication avec l'API. Veuillez vérifier que la clé API est correctement configurée sur le serveur.",
        timestamp: new Date()
      };

      // Mettre à jour la conversation avec le message d'erreur
      setConversations(prev => prev.map(conversation => {
        if (conversation.id === activeConversationId) {
          return {
            ...conversation,
            messages: [...conversation.messages, errorMessage],
            updatedAt: new Date()
          };
        }
        return conversation;
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Fonction pour copier le contenu d'un message
  const copyToClipboard = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Gestion de la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Rendu des pièces jointes dans les messages
  const renderAttachments = (messageAttachments: Attachment[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {messageAttachments.map(attachment => (
          <div 
            key={attachment.id}
            className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg p-2 text-xs"
          >
            {attachment.type === 'image' && attachment.previewUrl ? (
              <div className="relative w-8 h-8 mr-2 rounded-md overflow-hidden">
                <Image 
                  src={attachment.previewUrl} 
                  alt={attachment.name}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
            ) : attachment.type === 'document' ? (
              <FileText size={16} className="mr-2 text-orange-400" />
            ) : (
              <File size={16} className="mr-2 text-blue-400" />
            )}
            <span className="truncate max-w-[120px]">{attachment.name}</span>
          </div>
        ))}
      </div>
    );
  };

  // Si l'utilisateur n'est pas encore chargé, afficher un écran de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      {/* Réintégration du Header original */}
      <Header />
      
      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden pt-2">
        {/* Sidebar des conversations avec animation */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="flex flex-col h-full">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-base font-medium text-gray-800 dark:text-white">Conversations</h2>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="h-7 w-7 rounded-full"
                    >
                      {theme === 'dark' ? (
                        <Sun size={16} className="text-yellow-500" />
                      ) : (
                        <MoonStar size={16} className="text-indigo-600" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={createNewConversation}
                      className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 px-2 py-1">
                  <div className="space-y-0.5">
                    {conversations.map((conversation) => (
                      <motion.div 
                        key={conversation.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "group flex items-center justify-between p-1.5 rounded-lg cursor-pointer",
                          conversation.id === activeConversationId 
                            ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-sm" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        )}
                        onClick={() => setActiveConversationId(conversation.id)}
                      >
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <div className={cn(
                            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                            conversation.id === activeConversationId 
                              ? "bg-gradient-to-br from-indigo-500 to-purple-500" 
                              : "bg-gray-200 dark:bg-gray-700"
                          )}>
                            <MessageSquare size={12} className={cn(
                              conversation.id === activeConversationId 
                                ? "text-white" 
                                : "text-gray-600 dark:text-gray-400"
                            )} />
                          </div>
                          <div className="truncate">
                            <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                              {conversation.title}
                            </p>
                            <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                              {conversation.messages.length} messages • {conversation.updatedAt.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})}
                            </p>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={12} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conversation.id);
                              }}
                            >
                              <Trash2 size={14} className="mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    variant="outline" 
                    className="w-full rounded-lg bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 h-8 text-xs"
                    onClick={createNewConversation}
                  >
                    <Plus size={14} className="mr-1.5" />
                    Nouvelle conversation
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Interface de chat principale */}
        <div className="flex-1 flex flex-col h-full">
          {/* En-tête du chat */}
          <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-full h-7 w-7"
              >
                {sidebarOpen ? (
                  <ChevronLeft size={16} />
                ) : (
                  <MessageSquare size={16} />
                )}
              </Button>
              
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-br from-[#DC0032] to-pink-600 text-white p-1.5 rounded-full w-7 h-7 flex items-center justify-center shadow-md">
                  <Brain size={14} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-gray-800 dark:text-white">
                    {activeConversationId ? conversations.find(c => c.id === activeConversationId)?.title : 'Gemini Assistant'}
                  </h2>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Propulsé par Google Gemini
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full h-7 w-7"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <MessageSquare size={16} />}
            </Button>
          </div>
          
          {/* Zone des messages */}
          <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-br from-white/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm">
            <AnimatePresence initial={false}>
              {activeMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div 
                    className={cn(
                      "max-w-[85%] rounded-xl shadow-sm p-2 relative group",
                      message.type === 'user' 
                        ? "bg-gradient-to-r from-[#DC0032] to-rose-600 text-white" 
                        : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                    )}
                  >
                    <div className="flex">
                      <div className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2",
                        message.type === 'user'
                          ? "bg-white/20" 
                          : "bg-gradient-to-br from-purple-500 to-blue-500"
                      )}>
                        {message.type === 'user' ? (
                          <User size={12} className="text-white" />
                        ) : (
                          <Bot size={12} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="prose dark:prose-invert max-w-none text-xs">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          renderAttachments(message.attachments)
                        )}
                        
                        <div className="text-[10px] mt-1 text-gray-300 dark:text-gray-500 flex justify-between items-center">
                          <span>{message.timestamp.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                          
                          {message.type === 'assistant' && (
                            <button 
                              onClick={() => copyToClipboard(message.id, message.content)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {copiedId === message.id ? (
                                <Check size={10} className="text-green-500" />
                              ) : (
                                <Copy size={10} className="text-gray-500 dark:text-gray-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
          
          {/* Zone de saisie */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit}>
              {/* Zone d'affichage des pièces jointes en attente */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1 p-1.5 mb-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {attachments.map(attachment => (
                    <div 
                      key={attachment.id}
                      className="flex items-center bg-white dark:bg-gray-600 rounded-lg p-1 text-[10px] shadow-sm"
                    >
                      {attachment.type === 'image' ? (
                        <ImageIcon size={10} className="mr-1 text-blue-500" />
                      ) : attachment.type === 'document' ? (
                        <FileText size={10} className="mr-1 text-orange-500" />
                      ) : (
                        <File size={10} className="mr-1 text-gray-500" />
                      )}
                      <span className="truncate max-w-[80px]">{attachment.name}</span>
                      <button 
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-500"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Posez votre question ici..."
                    className="resize-none rounded-lg pr-8 pl-3 py-2 min-h-[40px] max-h-20 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:focus:ring-indigo-500 focus:ring-opacity-50 text-xs"
                    disabled={isProcessing}
                    rows={1}
                  />
                  <button 
                    type="button" 
                    onClick={handleAttachmentClick}
                    className="absolute right-2 bottom-2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full"
                    disabled={isProcessing}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </div>
                
                <Button 
                  type="submit" 
                  className="rounded-lg h-[40px] w-[40px] bg-gradient-to-r from-[#DC0032] to-rose-600 hover:from-[#DC0032]/90 hover:to-rose-600/90 text-white shadow-md"
                  size="icon"
                  disabled={isProcessing || (!input.trim() && attachments.length === 0) || !activeConversationId}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Input file caché */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}