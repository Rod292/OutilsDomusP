"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PlusIcon, 
  MoreHorizontalIcon, 
  PencilIcon, 
  ImageIcon, 
  VideoIcon, 
  FileTextIcon, 
  GlobeIcon, 
  LinkedinIcon, 
  InstagramIcon, 
  FacebookIcon, 
  YoutubeIcon,
  MailIcon,
  SignpostIcon,
  FileIcon,
  SlidersHorizontalIcon,
  MonitorIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarIcon,
  UserIcon,
  UserPlusIcon,
  XIcon,
  ChevronUpIcon,
  CameraIcon,
  LightbulbIcon,
  LayoutIcon,
  CheckIcon,
  PhoneIcon,
  MessageSquareIcon,
  PhoneCallIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Task, TeamMember, CommunicationDetail } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '../../hooks/useAuth';
import { useAssignedToFilter } from '../hooks/useAssignedToFilter';
import { Input } from '@/components/ui/input';

// Liste des consultants disponibles pour l'assignation des tâches
const CONSULTANTS = [
  { name: "Anne", email: "acoat@arthurloydbretagne.fr" },
  { name: "Elowan", email: "ejouan@arthurloydbretagne.fr" },
  { name: "Erwan", email: "eleroux@arthurloydbretagne.fr" },
  { name: "Julie", email: "jdalet@arthurloydbretagne.fr" },
  { name: "Justine", email: "jjambon@arthurloydbretagne.fr" },
  { name: "Morgane", email: "agencebrest@arthurloydbretagne.fr" },
  { name: "Nathalie", email: "npers@arthurloydbretagne.fr" },
  { name: "Pierre", email: "pmottais@arthurloydbretagne.fr" },
  { name: "Pierre-Marie", email: "pmjaumain@arthurloydbretagne.fr" },
  { name: "Sonia", email: "shadjlarbi@arthur-loyd.com" }
];

interface NotionTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onCreateTask: () => void;
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  onDeleteTask: (id: string) => void;
  initialExpandedTasks?: Record<string, boolean>;
}

export default function NotionTable({ tasks, onEditTask, onCreateTask, onUpdateTask, onDeleteTask, initialExpandedTasks = {} }: NotionTableProps) {
  // Ajouter un log pour déboguer
  console.log("NotionTable rendering with tasks:", tasks);
  
  // État local pour gérer l'expansion des tâches avec des communications multiples
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(initialExpandedTasks);
  
  // États pour les filtres et tri
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Utiliser le hook global de filtre d'assignation au lieu de l'état local
  const { assignedToFilter, setAssignedToFilter } = useAssignedToFilter();
  
  // Récupérer l'email de l'utilisateur connecté
  const { user } = useAuth();
  const currentUserEmail = user?.email || '';
  
  // Synchroniser les filtres avec l'URL lors du chargement initial
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const assignedFilter = searchParams.get('assignedFilter');
    const consultant = searchParams.get('consultant');
    
    // Si le filtre est activé et qu'un consultant est spécifié
    if (assignedFilter === 'true' && consultant) {
      // Trouver l'email correspondant au consultant
      const consultantEmail = CONSULTANTS.find(
        c => c.name.toLowerCase() === consultant.toLowerCase()
      )?.email;
      
      // Si l'email est trouvé et n'est pas déjà dans les filtres, l'ajouter
      if (consultantEmail && !assignedToFilter.includes(consultantEmail)) {
        setAssignedToFilter([consultantEmail]);
      }
    }
  }, []);
  
  // Fonction pour gérer le tri
  const handleSort = (field: string) => {
    console.log("Tri demandé sur le champ:", field);
    console.log("Champ de tri actuel:", sortField);
    console.log("Direction de tri actuelle:", sortDirection);
    
    if (sortField === field) {
      // Inverser la direction du tri
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log("Nouvelle direction:", newDirection);
      setSortDirection(newDirection);
    } else {
      // Nouveau champ de tri
      console.log("Nouveau champ de tri:", field);
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Forcer un rafraîchissement de l'interface après le tri
    setTimeout(() => {
      console.log("Rafraîchissement de l'interface après tri");
      setExpandedTasks({...expandedTasks});
    }, 50);
  };
  
  // Fonction pour filtrer et trier les tâches
  const filteredTasks = React.useMemo(() => {
    // Fonction pour comparer les priorités
    const priorityOrder = { 'urgente': 1, 'élevée': 2, 'moyenne': 3, 'faible': 4 };
    
    // Fonction pour comparer les statuts
    const statusOrder = { 
      'idée': 1, 
      'en développement': 2, 
      'à faire': 3, 
      'en cours': 4, 
      'à tourner': 5, 
      'à éditer': 6, 
      'écrire légende': 7, 
      'prêt à publier': 8, 
      'publié': 9, 
      'archivé': 10, 
      'terminée': 11 
    };
    
    // IMPORTANT: Ne pas filtrer les communications ici, mais les afficher toutes
    // On laisse le filtre s'appliquer uniquement au niveau des tâches
    let processedTasks = [...tasks];
    
    // Filtrer les tâches (les locaux) selon le filtre d'assignation
    let filteredTaskList = processedTasks.filter(task => {
      // Si aucun filtre d'assignation n'est actif, afficher toutes les tâches
      if (assignedToFilter.length === 0) {
        return true;
      }
      
      // Vérifier si la tâche principale est assignée aux personnes filtrées
      const taskAssigned = task.assignedTo && task.assignedTo.some(email => 
        assignedToFilter.includes(email)
      );
      
      // Vérifier si au moins une communication est assignée aux personnes filtrées
      const commAssigned = task.communicationDetails && task.communicationDetails.some(comm => 
        comm.assignedTo && comm.assignedTo.some(email => 
          assignedToFilter.includes(email)
        )
      );
      
      // La tâche passe le filtre UNIQUEMENT si elle ou l'une de ses communications est assignée
      // à la personne filtrée
      return taskAssigned || commAssigned;
    });
    
    // Pour chaque tâche, filtrer ses communications si un filtre d'assignation est actif
    if (assignedToFilter.length > 0) {
      filteredTaskList = filteredTaskList.map(task => {
        // Si la tâche n'a pas de communications, la retourner telle quelle
        if (!task.communicationDetails || task.communicationDetails.length === 0) {
          return task;
        }
        
        // Créer une copie de la tâche
        const taskCopy = {...task};
        
        // Filtrer les communications pour ne garder que celles assignées aux personnes filtrées
        // Ou si la tâche principale est assignée à la personne filtrée
        const isTaskAssigned = task.assignedTo && task.assignedTo.some(email => 
          assignedToFilter.includes(email)
        );
        
        if (!isTaskAssigned) {
          // Si la tâche principale n'est pas assignée à la personne filtrée,
          // ne garder que les communications assignées à cette personne
          taskCopy.communicationDetails = task.communicationDetails.filter(comm =>
            comm.assignedTo && comm.assignedTo.some(email => 
              assignedToFilter.includes(email)
            )
          );
        }
        
        return taskCopy;
      });
    }
    
    // Trier les tâches selon le critère de tri sélectionné
    return filteredTaskList.sort((a, b) => {
      if (!sortField) return 0;
      
      let comparison = 0;
      
      if (sortField === 'status') {
        const statusA = statusOrder[a.status as keyof typeof statusOrder] || 999;
        const statusB = statusOrder[b.status as keyof typeof statusOrder] || 999;
        comparison = statusA - statusB;
      } 
      else if (sortField === 'priority') {
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 999;
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 999;
        comparison = priorityA - priorityB;
      }
      else if (sortField === 'dueDate') {
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tasks, sortField, sortDirection, assignedToFilter]);
  
  // Fonction pour basculer le filtrage par assignation
  const toggleAssignedToFilter = (email: string) => {
    setAssignedToFilter(
      assignedToFilter.includes(email) 
        ? assignedToFilter.filter((e: string) => e !== email) 
        : [...assignedToFilter, email]
    );
  };
  
  // Fonction pour extraire tous les emails d'assignation uniques des tâches
  const allAssignees = React.useMemo(() => {
    const assignees = new Set<string>();
    
    // Ajouter les assignations des tâches principales
    tasks.forEach(task => {
      if (task.assignedTo && task.assignedTo.length > 0) {
        task.assignedTo.forEach(email => assignees.add(email));
      }
      
      // Ajouter également les assignations des communications
      if (task.communicationDetails && task.communicationDetails.length > 0) {
        task.communicationDetails.forEach(comm => {
          if (comm.assignedTo && comm.assignedTo.length > 0) {
            comm.assignedTo.forEach(email => assignees.add(email));
          }
        });
      }
    });
    
    return Array.from(assignees);
  }, [tasks]);
  
  // Fonction pour basculer l'état d'expansion d'une tâche
  const toggleTaskExpansion = (taskId: string) => {
    // Trouver la tâche originale avec toutes ses communications
    const task = tasks.find(t => t.id === taskId);
    
    console.log("Toggle expansion pour la tâche:", taskId);
    console.log("Tâche complète:", task);
    console.log("Nombre de communications:", task?.communicationDetails?.length || 0);
    console.log("Communications:", task?.communicationDetails);
    
    // Forcer un rendu complet des communications en créant un nouvel objet
    setExpandedTasks(prev => {
      const newState = {...prev};
      newState[taskId] = !prev[taskId];
      
      // Log pour déboguer
      console.log("État d'expansion mis à jour:", newState);
      console.log(`La tâche ${taskId} est maintenant: ${newState[taskId] ? "développée" : "réduite"}`);
      
      return newState;
    });
    
    // Forcer un nouveau rendu pour assurer que les communications s'affichent
    if (!expandedTasks[taskId]) {
      // Si on va développer la tâche, mettre une minuterie pour recharger l'état
      setTimeout(() => {
        console.log("Forçage du rafraîchissement des communications");
        setExpandedTasks(prev => ({...prev}));
      }, 50);
    }
  };

  // Fonction pour formater la date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Fonction pour mettre à jour le statut
  const updateStatus = async (taskId: string, newStatus: string) => {
    await onUpdateTask({
      id: taskId,
      status: newStatus as Task['status']
    });
  };

  // Fonction pour mettre à jour la priorité
  const updatePriority = async (taskId: string, newPriority: string) => {
    console.log("updatePriority appelé avec:", taskId, newPriority);
    try {
      // Assurez-vous que la nouvelle priorité est l'une des valeurs valides
      const validPriorities = ['faible', 'moyenne', 'élevée', 'urgente'];
      if (!validPriorities.includes(newPriority)) {
        console.error(`Priorité invalide: ${newPriority}. Valeurs attendues: ${validPriorities.join(', ')}`);
        return;
      }
      
      // Mettre à jour l'interface utilisateur immédiatement pour un retour visuel
      console.log("Envoi de la mise à jour au serveur...");
      
      await onUpdateTask({
        id: taskId,
        priority: newPriority as Task['priority']
      });
      
      console.log("Priorité mise à jour avec succès dans la base de données");
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la priorité:", error);
    }
  };

  // Fonction pour mettre à jour la date
  const updateDate = async (taskId: string, newDate: Date | null) => {
    console.log("updateDate appelé avec:", taskId, newDate);
    try {
      console.log("Envoi de la mise à jour de date au serveur...");
      
      // Vérifier que taskId existe bien
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Tâche ${taskId} non trouvée lors du changement de date`);
        return;
      }
      
      // Convertir la date si nécessaire
      const dateToStore = newDate;
      console.log("Date à enregistrer:", dateToStore);
      
      await onUpdateTask({
        id: taskId,
        dueDate: dateToStore
      });
      
      console.log("Date mise à jour avec succès dans la base de données");
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la date:", error);
    }
  };

  // Fonction pour mettre à jour le statut d'une communication
  const updateCommunicationStatus = async (taskId: string, commIndex: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    console.log(`Mise à jour du statut pour la communication ${commIndex} de la tâche ${taskId}: ${newStatus}`);
    
    const updatedDetails = [...task.communicationDetails];
    
    // Vérifier que l'index est valide
    if (commIndex < 0 || commIndex >= updatedDetails.length) {
      console.error(`Index de communication invalide: ${commIndex}`);
      return;
    }
    
    // Conserver toutes les propriétés existantes, y compris l'index original
    const existingComm = updatedDetails[commIndex];
    const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
    
    updatedDetails[commIndex] = {
      ...existingComm,
      status: newStatus,
      originalIndex // Préserver l'index original
    };
    
    console.log(`Communication mise à jour à l'index ${commIndex}, index original: ${originalIndex}`);
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour la priorité d'une communication
  const updateCommunicationPriority = async (taskId: string, commIndex: number, newPriority: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    console.log(`Mise à jour de la priorité pour la communication ${commIndex} de la tâche ${taskId}: ${newPriority}`);
    
    const updatedDetails = [...task.communicationDetails];
    
    // Vérifier que l'index est valide
    if (commIndex < 0 || commIndex >= updatedDetails.length) {
      console.error(`Index de communication invalide: ${commIndex}`);
      return;
    }
    
    // Conserver toutes les propriétés existantes, y compris l'index original
    const existingComm = updatedDetails[commIndex];
    const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
    
    updatedDetails[commIndex] = {
      ...existingComm,
      priority: newPriority as CommunicationDetail['priority'],
      originalIndex // Préserver l'index original
    };
    
    console.log(`Communication mise à jour à l'index ${commIndex}, index original: ${originalIndex}`);
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour la date d'une communication
  const updateCommunicationDate = async (taskId: string, commIndex: number, newDate: Date | null) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    console.log(`Mise à jour de la date pour la communication ${commIndex} de la tâche ${taskId}: ${newDate}`);
    
    const updatedDetails = [...task.communicationDetails];
    
    // Vérifier que l'index est valide
    if (commIndex < 0 || commIndex >= updatedDetails.length) {
      console.error(`Index de communication invalide: ${commIndex}`);
      return;
    }
    
    // Conserver toutes les propriétés existantes, y compris l'index original
    const existingComm = updatedDetails[commIndex];
    const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
    
    updatedDetails[commIndex] = {
      ...existingComm,
      deadline: newDate,
      originalIndex // Préserver l'index original
    };
    
    console.log(`Communication mise à jour à l'index ${commIndex}, index original: ${originalIndex}`);
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour le type de média
  const updateCommunicationMediaType = async (taskId: string, commIndex: number, newMediaType: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    console.log(`Mise à jour du type de média pour la communication ${commIndex} de la tâche ${taskId}: ${newMediaType}`);
    
    const updatedDetails = [...task.communicationDetails];
    
    // Vérifier que l'index est valide
    if (commIndex < 0 || commIndex >= updatedDetails.length) {
      console.error(`Index de communication invalide: ${commIndex}`);
      return;
    }
    
    // Conserver toutes les propriétés existantes, y compris l'index original
    const existingComm = updatedDetails[commIndex];
    const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
    
    updatedDetails[commIndex] = {
      ...existingComm,
      mediaType: newMediaType === "non-applicable" ? null : newMediaType as CommunicationDetail['mediaType'],
      originalIndex // Préserver l'index original
    };
    
    console.log(`Communication mise à jour à l'index ${commIndex}, index original: ${originalIndex}`);
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour le type de communication
  const updateCommunicationType = async (taskId: string, commIndex: number, newType: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    console.log(`Mise à jour du type de communication à l'index ${commIndex} pour la tâche ${taskId} : ${newType}`);
    
    const updatedDetails = [...task.communicationDetails];
    
    // Vérifier que l'index est valide
    if (commIndex < 0 || commIndex >= updatedDetails.length) {
      console.error(`Index de communication invalide: ${commIndex}`);
      return;
    }
    
    // Conserver toutes les propriétés existantes de la communication, y compris l'index original
    const existingComm = updatedDetails[commIndex];
    const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
    
    updatedDetails[commIndex] = {
      ...existingComm,
      type: newType as CommunicationDetail['type'],
      originalIndex // S'assurer que l'index original est préservé
    };
    
    console.log(`Communication mise à jour à l'index ${commIndex}, index original: ${originalIndex}`);
    console.log("Détails de communication mis à jour:", updatedDetails[commIndex]);
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour obtenir le badge cliquable du type de communication
  const getTypeBadge = (type: string, taskId: string, commIndex: number, customType?: string) => {
    // Icônes pour les différents types de communication
    const iconMap: Record<string, React.ReactNode> = {
      'newsletter': <MailIcon className="h-2.5 w-2.5 mr-0.5" />,
      'panneau': <SignpostIcon className="h-2.5 w-2.5 mr-0.5" />,
      'flyer': <FileTextIcon className="h-2.5 w-2.5 mr-0.5" />,
      'carousel': <ImageIcon className="h-2.5 w-2.5 mr-0.5" />,
      'video': <VideoIcon className="h-2.5 w-2.5 mr-0.5" />,
      'post_site': <GlobeIcon className="h-2.5 w-2.5 mr-0.5" />,
      'post_linkedin': <LinkedinIcon className="h-2.5 w-2.5 mr-0.5" />,
      'post_instagram': <InstagramIcon className="h-2.5 w-2.5 mr-0.5" />,
      'idee': <LightbulbIcon className="h-2.5 w-2.5 mr-0.5" />,
      'plan_2d_3d': <LayoutIcon className="h-2.5 w-2.5 mr-0.5" />,
      'autre': <FileIcon className="h-2.5 w-2.5 mr-0.5" />
    };
    
    // Libellés pour les différents types de communication
    const labels: Record<string, string> = {
      'newsletter': 'Newsletter',
      'panneau': 'Panneau',
      'flyer': 'Flyer',
      'carousel': 'Carousel',
      'video': 'Vidéo',
      'post_site': 'Site Web',
      'post_linkedin': 'LinkedIn',
      'post_instagram': 'Instagram',
      'idee': 'Idée',
      'plan_2d_3d': 'Plan 2D/3D',
      'autre': customType || 'Autre'
    };
    
    // États pour le mode d'édition du type personnalisé
    const [isEditing, setIsEditing] = useState(false);
    const [editedCustomType, setEditedCustomType] = useState(customType || '');
    
    // Fonction pour mettre à jour le type personnalisé
    const updateCustomType = async () => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.communicationDetails) return;
      
      const updatedDetails = [...task.communicationDetails];
      
      if (commIndex < 0 || commIndex >= updatedDetails.length) {
        console.error(`Index de communication invalide: ${commIndex}`);
        return;
      }
      
      const existingComm = updatedDetails[commIndex];
      const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
      
      updatedDetails[commIndex] = {
        ...existingComm,
        customType: editedCustomType.trim(),
        originalIndex
      };
      
      await onUpdateTask({
        id: taskId,
        communicationDetails: updatedDetails
      });
      
      setIsEditing(false);
    };
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="p-0 h-auto">
            <Badge className={`text-xs font-medium px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-opacity-80 flex items-center ${getBadgeColor(type)}`}>
              {iconMap[type] || <FileIcon className="h-2.5 w-2.5 mr-0.5" />}
              {labels[type] || type}
              <ChevronDownIcon className="h-2.5 w-2.5 ml-0.5 opacity-70" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'newsletter')}>
            <MailIcon className="h-3.5 w-3.5 mr-2 text-purple-600" />
            <span>Newsletter</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'panneau')}>
            <SignpostIcon className="h-3.5 w-3.5 mr-2 text-yellow-600" />
            <span>Panneau</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'flyer')}>
            <FileTextIcon className="h-3.5 w-3.5 mr-2 text-emerald-600" />
            <span>Flyer</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'idee')}>
            <LightbulbIcon className="h-3.5 w-3.5 mr-2 text-amber-600" />
            <span>Idée</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'plan_2d_3d')}>
            <LayoutIcon className="h-3.5 w-3.5 mr-2 text-blue-600" />
            <span>Plan 2D/3D</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'post_site')}>
            <GlobeIcon className="h-3.5 w-3.5 mr-2 text-indigo-600" />
            <span>Site Web</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'post_linkedin')}>
            <LinkedinIcon className="h-3.5 w-3.5 mr-2 text-sky-600" />
            <span>LinkedIn</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'post_instagram')}>
            <InstagramIcon className="h-3.5 w-3.5 mr-2 text-pink-600" />
            <span>Instagram</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {
            updateCommunicationType(taskId, commIndex, 'autre');
            setIsEditing(true);
          }}>
            <FileIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
            <span>Autre</span>
          </DropdownMenuItem>
          
          {/* Champ pour personnaliser le type "Autre" */}
          {type === 'autre' && (
            <div className="px-2 py-1 mt-1 border-t">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input 
                    type="text" 
                    value={editedCustomType}
                    onChange={e => setEditedCustomType(e.target.value)}
                    placeholder="Nom personnalisé"
                    className="h-6 text-xs"
                    autoFocus
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 p-0 px-1"
                    onClick={updateCustomType}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs">{customType || 'Autre'}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 p-0 px-1"
                    onClick={() => setIsEditing(true)}
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Fonction pour ajouter un consultant à une sous-tâche de communication
  const addCommunicationAssignee = async (taskId: string, commIndex: number, email: string) => {
    try {
      // Vérifier et récupérer l'email de l'utilisateur actuel de plusieurs sources
      const userEmail = sessionStorage.getItem('userEmail') || 
                       localStorage.getItem('userEmail') ||
                       sessionStorage.getItem('currentUserEmail') ||
                       localStorage.getItem('currentUserEmail');
      
      console.log(`Ajout consultant - Session userEmail: ${userEmail}, consultantEmail: ${email}, taskId: ${taskId}`);
      
      // Si l'email n'est pas disponible, essayer d'obtenir l'email à partir de la session NextAuth
      let emailToUse = userEmail;
      if (!emailToUse) {
        console.warn('Email utilisateur non trouvé dans le stockage local, tentative de récupération...');
        
        try {
          // Tenter d'accéder à l'email stocké dans le navigateur
          const storedEmail = window.localStorage.getItem('user-email');
          if (storedEmail) {
            emailToUse = storedEmail;
            console.log(`Email utilisateur récupéré du localStorage 'user-email': ${emailToUse}`);
            
            // Sauvegarder dans sessionStorage pour les futures requêtes
            sessionStorage.setItem('userEmail', emailToUse);
          } else {
            console.error('Email utilisateur non disponible dans aucune source de stockage');
          }
        } catch (storageError) {
          console.error('Erreur lors de la récupération de l\'email utilisateur:', storageError);
        }
      }
      
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.communicationDetails) {
        console.error('Tâche ou détails de communication introuvables.');
        return;
      }
      
      const updatedDetails = [...task.communicationDetails];
      
      // Vérifier que l'index est valide
      if (commIndex < 0 || commIndex >= updatedDetails.length) {
        console.error(`Index de communication invalide: ${commIndex}`);
        return;
      }
      
      // Conserver toutes les propriétés existantes, y compris l'index original
      const existingComm = updatedDetails[commIndex];
      const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
      const currentAssignees = Array.isArray(existingComm.assignedTo) ? [...existingComm.assignedTo] : [];
      
      // Vérifier si l'utilisateur est déjà assigné
      if (currentAssignees.includes(email)) {
        console.log(`L'utilisateur ${email} est déjà assigné à cette communication.`);
        return;
      }
      
      // Ajouter le nouvel assigné
      updatedDetails[commIndex] = {
        ...existingComm,
        assignedTo: [...currentAssignees, email],
        originalIndex // Préserver l'index original
      };
      
      // Mettre à jour la tâche
      await onUpdateTask({
        id: taskId,
        communicationDetails: updatedDetails
      });
      
      console.log(`Utilisateur ${email} ajouté à la communication ${commIndex} de la tâche ${taskId}`);
      
      // Envoyer une notification si l'email de l'utilisateur est disponible
      if (emailToUse) {
        try {
          // S'assurer que la communication a un ID pour l'envoi de notification
          const communicationWithId = {
            ...existingComm,
            id: `${taskId}_comm_${commIndex}` // Créer un ID unique pour cette communication
          };
          
          console.log('Communication avec ID pour notification:', communicationWithId);
          console.log(`Préparation notification: userEmail=${emailToUse}, consultantEmail=${email}, taskTitle=${task.title}`);
          
          const { sendTaskAssignedNotification } = await import('@/app/services/notificationService');
          
          // Envoyer une notification spécifique pour une communication
          const notificationResult = await sendTaskAssignedNotification(
            communicationWithId,
            email, // email du consultant assigné
            emailToUse, // email de l'utilisateur actuel qui a fait l'assignation
            true, // Indiquer qu'il s'agit d'une communication
            task.title // Passer le titre de la tâche parente
          );
          
          console.log(`Notification envoyée: ${notificationResult ? 'succès' : 'échec'}`);
          
          // Si la notification a échoué, essayer d'envoyer directement via une API fetch
          if (!notificationResult) {
            console.log('Tentative d\'envoi de notification via API directe...');
            try {
              const notificationData = {
                userId: `${emailToUse}_${email.split('@')[0]}`, // Format attendu: email_consultant
                title: "📝 Nouvelle communication assignée",
                body: `${email.split('@')[0]} a reçu une nouvelle communication "${existingComm.type || 'Communication'}" pour la tâche "${task.title}".`,
                type: "communication_assigned",
                taskId: `${taskId}_comm_${commIndex}`
              };
              
              console.log('Données de notification:', notificationData);
              
              const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(notificationData),
              });
              
              const result = await response.json();
              console.log('Résultat API notification directe:', result);
              
              if (result.useLocalMode) {
                console.log('Mode local suggéré, tentative d\'envoi de notification locale...');
                const { sendLocalNotification } = await import('@/app/services/notificationService');
                await sendLocalNotification({
                  title: notificationData.title,
                  body: notificationData.body,
                  data: { 
                    taskId: notificationData.taskId,
                    type: notificationData.type,
                    userId: notificationData.userId
                  }
                });
              }
            } catch (apiError) {
              console.error('Erreur lors de l\'envoi direct via API:', apiError);
            }
          }
        } catch (notifError) {
          console.error('Erreur lors de l\'envoi de la notification de communication:', notifError);
        }
      } else {
        console.error('Impossible d\'envoyer une notification: email utilisateur non disponible');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'un assigné à une communication:', error);
    }
  };

  // Fonction pour supprimer un consultant d'une sous-tâche de communication
  const removeCommunicationAssignee = async (taskId: string, commIndex: number, email: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    
    // Vérifier que l'index est valide
    if (commIndex < 0 || commIndex >= updatedDetails.length) {
      console.error(`Index de communication invalide: ${commIndex}`);
      return;
    }
    
    // Conserver toutes les propriétés existantes, y compris l'index original
    const existingComm = updatedDetails[commIndex];
    const originalIndex = existingComm.originalIndex !== undefined ? existingComm.originalIndex : commIndex;
    const currentAssignees = Array.isArray(existingComm.assignedTo) ? [...existingComm.assignedTo] : [];
    
    updatedDetails[commIndex] = {
      ...existingComm,
      assignedTo: currentAssignees.filter(e => e !== email),
      originalIndex // Préserver l'index original
    };
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour obtenir le libellé du statut et rendre le menu déroulant
  const getStatusBadge = (status: string, taskId: string) => {
    const statusColors: Record<string, string> = {
      'idée': 'bg-purple-100 text-purple-800',
      'en développement': 'bg-indigo-100 text-indigo-800',
      'à faire': 'bg-yellow-100 text-yellow-800',
      'en cours': 'bg-blue-100 text-blue-800',
      'à tourner': 'bg-orange-100 text-orange-800',
      'à éditer': 'bg-pink-100 text-pink-800',
      'écrire légende': 'bg-cyan-100 text-cyan-800',
      'prêt à publier': 'bg-emerald-100 text-emerald-800',
      'publié': 'bg-green-100 text-green-800',
      'archivé': 'bg-gray-100 text-gray-800',
      'terminée': 'bg-green-100 text-green-800'
    };
    
    const handleStatusChange = async (value: string) => {
      console.log(`Changement de statut pour la tâche ${taskId} : ${value}`);
      await updateStatus(taskId, value);
    };
    
    return (
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className={`px-1.5 py-0.5 text-xs rounded-md w-full max-w-[150px] h-6 ${statusColors[status] || 'bg-gray-100 text-gray-800'} border-0 focus:ring-1 focus:ring-offset-0`}>
          <SelectValue>{status}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="idée">Idée</SelectItem>
          <SelectItem value="en développement">En développement</SelectItem>
          <SelectItem value="à faire">À faire</SelectItem>
          <SelectItem value="en cours">En cours</SelectItem>
          <SelectItem value="à tourner">À tourner</SelectItem>
          <SelectItem value="à éditer">À éditer</SelectItem>
          <SelectItem value="écrire légende">Écrire légende</SelectItem>
          <SelectItem value="prêt à publier">Prêt à publier</SelectItem>
          <SelectItem value="publié">Publié</SelectItem>
          <SelectItem value="archivé">Archivé</SelectItem>
          <SelectItem value="terminée">Terminée</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  // Fonction pour obtenir le libellé de la priorité
  const getPriorityBadge = (priority: string, taskId: string) => {
    console.log(`Rendu du badge de priorité pour la tâche ${taskId} avec priorité ${priority}`);
    
    const priorityColors: Record<string, string> = {
      'faible': 'bg-blue-50 text-blue-700',
      'moyenne': 'bg-amber-50 text-amber-700',
      'élevée': 'bg-red-50 text-red-700',
      'urgente': 'bg-red-100 text-red-900'
    };
    
    const handlePriorityChange = async (value: string) => {
      console.log(`handlePriorityChange appelé pour la tâche ${taskId}, nouvelle valeur: ${value}`);
      
      // Vérifier que taskId existe bien
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Tâche ${taskId} non trouvée lors du changement de priorité`);
        return;
      }
      
      // Assurer que la valeur est l'une des priorités valides
      const validPriorities = ['faible', 'moyenne', 'élevée', 'urgente'];
      if (!validPriorities.includes(value)) {
        console.error(`Priorité invalide: ${value}`);
        return;
      }
      
      await updatePriority(taskId, value);
    };
    
    return (
      <Select value={priority} onValueChange={handlePriorityChange}>
        <SelectTrigger className={`px-1.5 py-0.5 text-xs rounded-md w-full max-w-[100px] h-6 ${priorityColors[priority] || 'bg-gray-100 text-gray-800'} border-0 focus:ring-1 focus:ring-offset-0`}>
          <SelectValue>{priority}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="faible">Faible</SelectItem>
          <SelectItem value="moyenne">Moyenne</SelectItem>
          <SelectItem value="élevée">Élevée</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  // Fonction pour obtenir le libellé du type d'action avec icône
  const getActionTypeLabel = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'newsletter': <MailIcon className="h-4 w-4 text-purple-500" />,
      'panneau': <SignpostIcon className="h-4 w-4 text-blue-500" />,
      'flyer': <FileTextIcon className="h-4 w-4 text-green-500" />,
      'post_site': <GlobeIcon className="h-4 w-4 text-indigo-500" />,
      'post_linkedin': <LinkedinIcon className="h-4 w-4 text-sky-500" />,
      'post_instagram': <InstagramIcon className="h-4 w-4 text-pink-500" />,
      'autre': <FileIcon className="h-4 w-4 text-gray-500" />
    };
    
    const labels: Record<string, string> = {
      'newsletter': 'Newsletter',
      'panneau': 'Panneau',
      'flyer': 'Flyer',
      'post_site': 'Post Site Web',
      'post_linkedin': 'Post LinkedIn',
      'post_instagram': 'Post Instagram',
      'autre': 'Autre'
    };
    
    return (
      <div className="flex items-center gap-2">
        {icons[type] || <FileIcon className="h-4 w-4" />}
        <span>{labels[type] || type}</span>
      </div>
    );
  };

  // Fonction pour obtenir une badge du type d'action (pour affichage dans la cellule principale)
  const getActionTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      'newsletter': 'bg-purple-100 text-purple-800',
      'panneau': 'bg-blue-100 text-blue-800',
      'flyer': 'bg-green-100 text-green-800',
      'carousel': 'bg-purple-100 text-purple-800',
      'video': 'bg-orange-100 text-orange-800',
      'post_site': 'bg-indigo-100 text-indigo-800',
      'post_linkedin': 'bg-sky-100 text-sky-800',
      'post_instagram': 'bg-pink-100 text-pink-800',
      'autre': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={`${typeColors[type] || 'bg-gray-100 text-gray-800'} mr-1`}>
        {getActionTypeLabel(type)}
      </Badge>
    );
  };

  // Fonction pour afficher les personnes assignées avec possibilité d'ajouter/supprimer
  const getAssignedToDisplay = (assignedTo: string[] = [], taskId: string, isCommunication: boolean = false, commIndex: number = -1) => {
    // Convertir les emails en noms et préparer l'affichage
    const assignedConsultants = assignedTo.map(email => {
      const consultant = CONSULTANTS.find(c => c.email === email);
      return {
        name: consultant ? consultant.name : email.split('@')[0],
        email
      };
    });

    // Liste des consultants disponibles (non assignés)
    const availableConsultants = CONSULTANTS.filter(c => 
      !assignedTo.includes(c.email)
    );
    
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-1">
          {assignedConsultants.map(consultant => (
            <Badge 
              key={consultant.email} 
              variant="outline" 
              className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-xs"
            >
              <UserIcon className="h-2.5 w-2.5 text-gray-500" />
              <span>{consultant.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isCommunication && commIndex >= 0) {
                    removeCommunicationAssignee(taskId, commIndex, consultant.email);
                  } else {
                    removeAssignee(taskId, consultant.email);
                  }
                }}
                className="h-3.5 w-3.5 p-0 ml-0.5 text-gray-400 hover:text-red-500"
              >
                <XIcon className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          ))}
          
          {availableConsultants.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-5 text-xs px-1 py-0 bg-transparent"
                >
                  <PlusIcon className="h-2.5 w-2.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {availableConsultants.map(consultant => (
                  <DropdownMenuItem 
                    key={consultant.email} 
                    onClick={() => {
                      if (isCommunication && commIndex >= 0) {
                        addCommunicationAssignee(taskId, commIndex, consultant.email);
                      } else {
                        addAssignee(taskId, consultant.email);
                      }
                    }}
                  >
                    <UserIcon className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    {consultant.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  // Fonction pour obtenir l'icône de la plateforme
  const getPlatformIcon = (platform: string | null | undefined) => {
    if (!platform) return null;
    
    const icons: Record<string, React.ReactNode> = {
      'site': <GlobeIcon className="h-2.5 w-2.5 text-indigo-500" />,
      'linkedin': <LinkedinIcon className="h-2.5 w-2.5 text-sky-500" />,
      'instagram': <InstagramIcon className="h-2.5 w-2.5 text-pink-500" />
    };
    
    return icons[platform] || <MonitorIcon className="h-2.5 w-2.5 text-gray-500" />;
  };

  // Fonction pour obtenir le badge de plateforme
  const getPlatformBadge = (platform: string | null | undefined) => {
    if (!platform || platform === 'non-applicable') return null;
    
    const colors: Record<string, string> = {
      'site': 'bg-indigo-100 text-indigo-800',
      'linkedin': 'bg-sky-100 text-sky-800',
      'instagram': 'bg-pink-100 text-pink-800',
      'autre': 'bg-gray-100 text-gray-800'
    };
    
    const labels: Record<string, string> = {
      'site': 'Site',
      'linkedin': 'LinkedIn',
      'instagram': 'Insta',
      'autre': 'Autre'
    };
    
    return (
      <Badge className={`${colors[platform] || 'bg-gray-100 text-gray-800'} mr-1 text-xs px-1.5 py-0.5`}>
        <div className="flex items-center gap-0.5">
          {getPlatformIcon(platform)}
          <span>{labels[platform] || platform}</span>
        </div>
      </Badge>
    );
  };

  // Date picker component
  const DatePickerCell = ({ date, taskId, isCommunication = false, commIndex = -1 }: 
    { date: Date | null | undefined, taskId: string, isCommunication?: boolean, commIndex?: number }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className="px-1.5 py-0.5 h-auto flex items-center gap-1 justify-start min-w-[140px] hover:bg-gray-100 rounded text-xs"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-gray-500" />
            {date ? format(new Date(date), "dd MMM yyyy", { locale: fr }) : "Date non définie"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={(day: Date | undefined) => {
              if (isCommunication && commIndex >= 0) {
                // Mise à jour de la date d'une communication
                updateCommunicationDate(taskId, commIndex, day || null);
              } else {
                // Mise à jour de la date de la tâche principale
                updateDate(taskId, day || null);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  };

  // Fonction pour ajouter un type de communication
  const addCommunicationType = async (taskId: string, type: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Tâche ${taskId} non trouvée pour l'ajout d'une communication`);
        return;
      }
      
      // Vérifier si la tâche a un mandat signé
      if (!task.mandatSigne) {
        console.warn(`Tâche ${taskId} n'a pas de mandat signé - communication ajoutée quand même`);
        // On permet l'ajout même sans mandat signé pour plus de flexibilité
      }
      
      console.log(`Ajout d'une communication ${type} à la tâche ${taskId}`);
      
      // Liste des types valides (pour validation)
      const communicationValidTypes = [
        'appel', 'sms', 'email', 'rdv_physique', 'rdv_tel', 'courrier', 'commentaire', 'envoi_doc', 'autre',
        'idée', 'plan_2d_3d', // Nouveaux types ajoutés
        'newsletter', 'panneau', 'flyer', 'post_site', 'post_linkedin', 'post_instagram', 'post_facebook'
      ];
      
      // Vérifier que le type est valide
      if (!communicationValidTypes.includes(type)) {
        console.error(`Type de communication invalide: ${type}`);
        return;
      }
      
      // Obtenir la liste actuelle des communications ou initialiser un tableau vide
      const communicationDetails = task.communicationDetails || [];
      
      console.log("Communications existantes:", communicationDetails);
      
      // Créer une nouvelle communication
      const newCommunication: CommunicationDetail = {
        type: type,
        status: 'à faire',
        priority: 'moyenne',
        deadline: new Date(),
        details: '',
        mediaType: null,
        assignedTo: [],
        originalIndex: communicationDetails.length
      };
      
      // Ajouter la nouvelle communication à la liste
      const updatedDetails = [...communicationDetails, newCommunication];
      
      console.log("Nouvelles communications:", updatedDetails);
      
      // Mettre à jour la tâche
      await onUpdateTask({
        id: taskId,
        communicationDetails: updatedDetails
      });
      
      // Forcer un rendu des communications pour qu'elles apparaissent immédiatement
      setTimeout(() => {
        console.log("Forçage du rafraîchissement des communications après ajout");
        setExpandedTasks(prev => ({...prev}));
      }, 50);
    } catch (error) {
      console.error("Erreur lors de l'ajout d'une communication:", error);
    }
  };

  // Fonction pour convertir les types de communication en badges pour la ligne principale
  const renderTypeBadges = (task: Task) => {
    const types = new Set<string>();
    
    // Ajouter le type principal de la tâche
    types.add(task.actionType);
    
    // Ajouter les types des détails de communication
    if (task.communicationDetails && task.communicationDetails.length > 0) {
      task.communicationDetails.forEach(detail => {
        if (detail.type) types.add(detail.type);
      });
    }
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Array.from(types).map(type => (
          <Badge key={type} className="text-xs">
            {getActionTypeLabel(type)}
          </Badge>
        ))}
      </div>
    );
  };

  // Fonction pour ajouter un consultant à une tâche
  const addAssignee = async (taskId: string, email: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const currentAssignees = Array.isArray(task.assignedTo) ? [...task.assignedTo] : [];
    if (!currentAssignees.includes(email)) {
      await onUpdateTask({
        id: taskId,
        assignedTo: [...currentAssignees, email]
      });
    }
  };

  // Fonction pour supprimer un consultant d'une tâche
  const removeAssignee = async (taskId: string, email: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const currentAssignees = Array.isArray(task.assignedTo) ? [...task.assignedTo] : [];
    await onUpdateTask({
      id: taskId,
      assignedTo: currentAssignees.filter(e => e !== email)
    });
  };

  // Fonction pour supprimer une communication spécifique
  const removeCommunication = async (taskId: string, commIndex: number) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.communicationDetails) return;
      
      // Vérifier si l'index est valide
      if (commIndex < 0 || commIndex >= task.communicationDetails.length) {
        console.error(`Index de communication invalide: ${commIndex}`);
        return;
      }
      
      // Confirmation de suppression
      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer cette communication ?`)) {
        return;
      }
      
      console.log(`Suppression de la communication à l'index ${commIndex} pour la tâche ${taskId}`);
      console.log("Communication à supprimer:", task.communicationDetails[commIndex]);
      
      // Créer une copie des communications sans celle à supprimer
      const updatedComms = task.communicationDetails.filter((_, index) => index !== commIndex);
      console.log("Communications après suppression:", updatedComms);
      
      // Mettre à jour la tâche dans Firestore
      await onUpdateTask({
        id: taskId,
        communicationDetails: updatedComms
      });
      
      // Forcer un rafraîchissement de l'interface
      setTimeout(() => {
        console.log("Forçage du rafraîchissement de l'interface après suppression");
        setExpandedTasks(prev => {
          // Réinitialiser l'état d'expansion pour forcer le rendu
          return {...prev};
        });
      }, 50);
      
      console.log(`Communication supprimée avec succès. Nombre de communications restantes: ${updatedComms.length}`);
    } catch (error) {
      console.error("Erreur lors de la suppression de la communication:", error);
    }
  };

  // Fonction pour obtenir la couleur du badge en fonction du type d'action
  const getBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'newsletter': 'bg-purple-100 text-purple-800 border-purple-200',
      'panneau': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'flyer': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'idée': 'bg-amber-100 text-amber-800 border-amber-200',
      'plan_2d_3d': 'bg-blue-100 text-blue-800 border-blue-200',
      'post_site': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'post_linkedin': 'bg-sky-100 text-sky-800 border-sky-200',
      'post_instagram': 'bg-pink-100 text-pink-800 border-pink-200',
      'post_facebook': 'bg-blue-100 text-blue-800 border-blue-200',
      'appel': 'bg-gray-100 text-gray-800 border-gray-200',
      'sms': 'bg-gray-100 text-gray-800 border-gray-200',
      'email': 'bg-gray-100 text-gray-800 border-gray-200',
      'rdv_physique': 'bg-gray-100 text-gray-800 border-gray-200',
      'rdv_tel': 'bg-gray-100 text-gray-800 border-gray-200',
      'courrier': 'bg-gray-100 text-gray-800 border-gray-200',
      'commentaire': 'bg-gray-100 text-gray-800 border-gray-200',
      'envoi_doc': 'bg-gray-100 text-gray-800 border-gray-200',
      'autre': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Fonction pour obtenir le badge de type de média cliquable
  const getMediaTypeBadge = (mediaType: string | null | undefined, taskId: string, commIndex: number) => {
    // Valeur à afficher si pas de type défini
    const defaultValue = "Non défini";
    
    // Icônes pour les différents types de média
    const iconMap: Record<string, React.ReactNode> = {
      'photo': <ImageIcon className="h-2.5 w-2.5 mr-0.5" />,
      'video': <VideoIcon className="h-2.5 w-2.5 mr-0.5" />,
      'texte': <FileTextIcon className="h-2.5 w-2.5 mr-0.5" />,
      'autre': <FileIcon className="h-2.5 w-2.5 mr-0.5" />,
    };
    
    // Couleurs plus contrastées pour les badges
    const colorMap: Record<string, string> = {
      'photo': 'bg-violet-200 text-violet-900 border-violet-300',
      'video': 'bg-orange-200 text-orange-900 border-orange-300',
      'texte': 'bg-cyan-200 text-cyan-900 border-cyan-300',
      'autre': 'bg-slate-200 text-slate-900 border-slate-300',
    };
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="p-0 h-auto">
            <Badge className={`text-xs font-medium px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-opacity-80 flex items-center ${
              mediaType ? colorMap[mediaType] || 'bg-gray-200 text-gray-900' : 'bg-gray-200 text-gray-900 border border-dashed border-gray-400'
            }`}>
              {mediaType ? (
                <>
                  {iconMap[mediaType] || <FileIcon className="h-2.5 w-2.5 mr-0.5" />}
                  {mediaType}
                </>
              ) : (
                <>
                  <CameraIcon className="h-2.5 w-2.5 mr-0.5" />
                  {defaultValue}
                </>
              )}
              <ChevronDownIcon className="h-2.5 w-2.5 ml-0.5 opacity-70" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => updateCommunicationMediaType(taskId, commIndex, "photo")}>
            <ImageIcon className="h-4 w-4 mr-2 text-violet-600" />
            <span>Photo</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationMediaType(taskId, commIndex, "video")}>
            <VideoIcon className="h-4 w-4 mr-2 text-orange-600" />
            <span>Vidéo</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationMediaType(taskId, commIndex, "texte")}>
            <FileTextIcon className="h-4 w-4 mr-2 text-cyan-600" />
            <span>Texte</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateCommunicationMediaType(taskId, commIndex, "autre")}>
            <FileIcon className="h-4 w-4 mr-2 text-gray-600" />
            <span>Autre</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => updateCommunicationMediaType(taskId, commIndex, "non-applicable")}>
            <XIcon className="h-4 w-4 mr-2 text-gray-600" />
            <span>Non défini</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Fonction pour obtenir le badge de priorité pour les communications
  const getCommunicationPriorityBadge = (priority: string, taskId: string, commIndex: number) => {
    console.log(`Rendu du badge de priorité pour la communication ${commIndex} de la tâche ${taskId} avec priorité ${priority}`);
    
    const priorityColors: Record<string, string> = {
      'faible': 'bg-blue-50 text-blue-700',
      'moyenne': 'bg-amber-50 text-amber-700',
      'élevée': 'bg-red-50 text-red-700',
      'urgente': 'bg-red-100 text-red-900'
    };
    
    const handlePriorityChange = async (value: string) => {
      console.log(`handlePriorityChange appelé pour la communication ${commIndex} de la tâche ${taskId}, nouvelle valeur: ${value}`);
      
      // Vérifier que taskId existe bien
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.communicationDetails) {
        console.error(`Tâche ${taskId} non trouvée ou communication non trouvée lors du changement de priorité`);
        return;
      }
      
      // Assurer que la valeur est l'une des priorités valides
      const validPriorities = ['faible', 'moyenne', 'élevée', 'urgente'];
      if (!validPriorities.includes(value)) {
        console.error(`Priorité invalide: ${value}`);
        return;
      }
      
      await updateCommunicationPriority(taskId, commIndex, value);
    };
    
    return (
      <Select value={priority} onValueChange={handlePriorityChange}>
        <SelectTrigger className={`px-1 py-0 text-xs rounded-md w-full max-w-[90px] h-5 ${priorityColors[priority] || 'bg-gray-100 text-gray-800'} border-0 focus:ring-1 focus:ring-offset-0`}>
          <SelectValue>{priority}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="faible">Faible</SelectItem>
          <SelectItem value="moyenne">Moyenne</SelectItem>
          <SelectItem value="élevée">Élevée</SelectItem>
          <SelectItem value="urgente">Urgente</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  // Fonction pour trier les communications en fonction du champ de tri actuel
  const sortCommunications = (communications: CommunicationDetail[]): CommunicationDetail[] => {
    if (!sortField) return communications;
    
    // Fonction pour comparer les priorités
    const priorityOrder = { 'urgente': 1, 'élevée': 2, 'moyenne': 3, 'faible': 4 };
    
    // Fonction pour comparer les statuts
    const statusOrder = { 
      'idée': 1, 
      'en développement': 2, 
      'à faire': 3, 
      'en cours': 4, 
      'à tourner': 5, 
      'à éditer': 6, 
      'écrire légende': 7, 
      'prêt à publier': 8, 
      'publié': 9, 
      'archivé': 10, 
      'terminée': 11 
    };
    
    return [...communications].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'status') {
        const statusA = statusOrder[a.status as keyof typeof statusOrder] || 999;
        const statusB = statusOrder[b.status as keyof typeof statusOrder] || 999;
        comparison = statusA - statusB;
      } 
      else if (sortField === 'priority') {
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 999;
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 999;
        comparison = priorityA - priorityB;
      }
      else if (sortField === 'dueDate') {
        if (!a.deadline && !b.deadline) comparison = 0;
        else if (!a.deadline) comparison = 1;
        else if (!b.deadline) comparison = -1;
        else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Fonction pour mettre à jour la description d'une tâche
  const updateDescription = async (taskId: string, newDescription: string) => {
    try {
      console.log(`Mise à jour de la description pour la tâche ${taskId}`);
      await onUpdateTask({
        id: taskId,
        description: newDescription
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la description:", error);
    }
  };

  // Composant pour afficher et éditer la description
  const DescriptionCell = ({ description, taskId }: { description: string | undefined, taskId: string }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedDescription, setEditedDescription] = useState(description || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const handleSave = () => {
      updateDescription(taskId, editedDescription);
      setIsEditing(false);
    };
    
    // Ajuster automatiquement la hauteur du textarea
    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing, editedDescription]);
    
    if (isEditing) {
      return (
        <div className="flex flex-col w-full">
          <textarea
            ref={textareaRef}
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="w-full text-xs p-1 border rounded resize-none min-h-[60px]"
            autoFocus
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSave();
              }
            }}
          />
          <div className="flex justify-end mt-1 gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 py-0 px-2 text-xs"
              onClick={() => setIsEditing(false)}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-6 py-0 px-2 text-xs"
              onClick={handleSave}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-start gap-1 group">
        <div 
          className="flex-1 text-xs text-gray-700 whitespace-pre-wrap cursor-pointer hover:underline hover:text-gray-900"
          onClick={() => setIsEditing(true)}
        >
          {description || <span className="italic text-gray-400">Ajouter une description...</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0"
          onClick={() => setIsEditing(true)}
        >
          <PencilIcon className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="rounded-md border overflow-hidden">
        <Table className="border">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="w-[280px] font-bold py-2">Contenu</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50 font-bold py-2 w-[120px]"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Statut
                  {sortField === 'status' && (
                    sortDirection === 'asc' 
                      ? <ChevronUpIcon className="h-3.5 w-3.5" /> 
                      : <ChevronDownIcon className="h-3.5 w-3.5" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50 font-bold py-2 w-[100px]" 
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">
                  Priorité
                  {sortField === 'priority' && (
                    sortDirection === 'asc' 
                      ? <ChevronUpIcon className="h-3.5 w-3.5" /> 
                      : <ChevronDownIcon className="h-3.5 w-3.5" />
                  )}
                </div>
              </TableHead>
              <TableHead className="font-bold py-2 w-[180px]">
                <div className="flex items-center gap-1">
                  <span>Assigné à</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <SlidersHorizontalIcon className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-2" align="start">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Filtrer par personne</p>
                        {allAssignees.map(email => {
                          const consultant = CONSULTANTS.find(c => c.email === email);
                          const name = consultant ? consultant.name : email.split('@')[0];
                          
                          return (
                            <div key={email} className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id={`assignee-${email}`}
                                checked={assignedToFilter.includes(email)}
                                onChange={() => toggleAssignedToFilter(email)}
                                className="rounded border-gray-300 text-[#DC0032] focus:ring-[#DC0032]"
                              />
                              <label htmlFor={`assignee-${email}`} className="text-sm cursor-pointer">
                                {name}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50 font-bold py-2 w-[150px]"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortField === 'dueDate' && (
                    sortDirection === 'asc' 
                      ? <ChevronUpIcon className="h-3.5 w-3.5" /> 
                      : <ChevronDownIcon className="h-3.5 w-3.5" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right w-[90px] font-bold py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  Aucune tâche pour le moment. Cliquez sur "Ajouter" pour créer une nouvelle tâche.
                </TableCell>
              </TableRow>
            ) : 
              filteredTasks.flatMap((task) => {
                // Toujours considérer les tâches avec des communications comme ayant des sous-tâches
                const hasSubItems = true;
                const isExpanded = expandedTasks[task.id] || false;
                
                // Ligne principale de la tâche
                const mainRow = (
                  <TableRow 
                    key={task.id} 
                    className={`cursor-pointer hover:bg-gray-50 ${isExpanded ? 'border-b-0' : ''}`}
                    onClick={() => toggleTaskExpansion(task.id)}
                  >
                    <TableCell className="py-1.5 w-[40%]">
                      <div className="flex items-start gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="px-0.5 py-0 h-4 mt-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskExpansion(task.id);
                          }}
                        >
                          {isExpanded ? 
                            <ChevronDownIcon className="h-3 w-3" /> : 
                            <ChevronRightIcon className="h-3 w-3" />}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          
                          {/* Utiliser le composant DescriptionCell pour permettre l'édition de la description */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <DescriptionCell description={task.description} taskId={task.id} />
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {task.dossierNumber && (
                              <span className="text-xs text-gray-400">
                                N° {task.dossierNumber}
                              </span>
                            )}
                            {task.mandatSigne ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs py-0 px-1">
                                Mandat signé
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-0 px-1">
                                Mandat non signé
                              </Badge>
                            )}
                            {task.tags && task.tags.length > 0 && task.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {task.tags && task.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                +{task.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5 w-[15%]">
                      {getStatusBadge(task.status, task.id)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5 w-[15%]">
                      {getPriorityBadge(task.priority, task.id)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                      {getAssignedToDisplay(task.assignedTo || [], task.id)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                      <DatePickerCell date={task.dueDate} taskId={task.id} />
                    </TableCell>
                    <TableCell className="text-right py-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-gray-500 hover:text-gray-900"
                          onClick={() => onEditTask(task)}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
                
                // Sous-lignes pour les détails de communication
                const commRows = isExpanded ? [
                  // Ligne pour ajouter un nouveau type de communication
                  <TableRow 
                    key={`${task.id}-add-comm`} 
                    className="bg-gray-50 border-b"
                  >
                    <TableCell colSpan={6} className="pl-10 py-0.5">
                      <div className="flex items-center justify-start">
                        {/* Menu déroulant pour ajouter un type de communication */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="text-xs py-1 h-7 gap-1">
                              <PlusIcon className="h-3 w-3" />
                              Ajouter une communication
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'appel')}>
                              <PhoneIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
                              <span>Appel</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'sms')}>
                              <MessageSquareIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
                              <span>SMS</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'email')}>
                              <MailIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
                              <span>Email</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'rdv_physique')}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
                              <span>RDV Physique</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'rdv_tel')}>
                              <PhoneCallIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
                              <span>RDV Téléphonique</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'newsletter')}>
                              <MailIcon className="h-3.5 w-3.5 mr-2 text-purple-600" />
                              <span>Newsletter</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'panneau')}>
                              <SignpostIcon className="h-3.5 w-3.5 mr-2 text-yellow-600" />
                              <span>Panneau</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'flyer')}>
                              <FileTextIcon className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              <span>Flyer</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'idée')}>
                              <LightbulbIcon className="h-3.5 w-3.5 mr-2 text-amber-600" />
                              <span>Idée</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'plan_2d_3d')}>
                              <LayoutIcon className="h-3.5 w-3.5 mr-2 text-blue-600" />
                              <span>Plan 2D/3D</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'post_site')}>
                              <GlobeIcon className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                              <span>Site Web</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'post_linkedin')}>
                              <LinkedinIcon className="h-3.5 w-3.5 mr-2 text-sky-600" />
                              <span>LinkedIn</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'post_instagram')}>
                              <InstagramIcon className="h-3.5 w-3.5 mr-2 text-pink-600" />
                              <span>Instagram</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addCommunicationType(task.id, 'autre')}>
                              <FileIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
                              <span>Autre</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>,
                  
                  // Rendu des détails de communication s'il y en a
                  ...(task.communicationDetails && task.communicationDetails.length > 0
                    ? sortCommunications(task.communicationDetails).map((comm, index) => (
                        <TableRow 
                          key={`${task.id}-comm-${index}`} 
                          className="bg-gray-50 hover:bg-gray-100"
                        >
                          <TableCell className="pl-10 py-1">
                            <div className="flex flex-wrap items-center gap-1">
                              {getTypeBadge(comm.type, task.id, index)}
                              {getPlatformBadge(comm.platform)}
                              {getMediaTypeBadge(comm.mediaType, task.id, index)}
                              {comm.details && (
                                <span className="text-xs text-gray-500">{comm.details}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="py-1">
                            <Select 
                              value={comm.status} 
                              onValueChange={(value) => updateCommunicationStatus(task.id, index, value)}
                            >
                              <SelectTrigger className={`px-1.5 py-0.5 text-xs rounded-md w-full max-w-[150px] h-5 ${
                                comm.status === 'idée' ? 'bg-purple-100 text-purple-800' :
                                comm.status === 'en développement' ? 'bg-indigo-200 text-indigo-900' :
                                comm.status === 'à faire' ? 'bg-yellow-100 text-yellow-800' :
                                comm.status === 'en cours' ? 'bg-blue-100 text-blue-800' :
                                comm.status === 'à tourner' ? 'bg-orange-100 text-orange-800' :
                                comm.status === 'à éditer' ? 'bg-pink-100 text-pink-800' :
                                comm.status === 'écrire légende' ? 'bg-cyan-100 text-cyan-800' :
                                comm.status === 'prêt à publier' ? 'bg-emerald-100 text-emerald-800' :
                                comm.status === 'publié' ? 'bg-green-100 text-green-800' :
                                comm.status === 'archivé' ? 'bg-gray-100 text-gray-800' :
                                comm.status === 'terminée' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              } border-0 focus:ring-1 focus:ring-offset-0`}>
                                <SelectValue>{comm.status}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="idée">Idée</SelectItem>
                                <SelectItem value="en développement">En développement</SelectItem>
                                <SelectItem value="à faire">À faire</SelectItem>
                                <SelectItem value="en cours">En cours</SelectItem>
                                <SelectItem value="à tourner">À tourner</SelectItem>
                                <SelectItem value="à éditer">À éditer</SelectItem>
                                <SelectItem value="écrire légende">Écrire légende</SelectItem>
                                <SelectItem value="prêt à publier">Prêt à publier</SelectItem>
                                <SelectItem value="publié">Publié</SelectItem>
                                <SelectItem value="archivé">Archivé</SelectItem>
                                <SelectItem value="terminée">Terminée</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="py-1">
                            {getCommunicationPriorityBadge(comm.priority || 'moyenne', task.id, index)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="py-1">
                            {getAssignedToDisplay(comm.assignedTo || [], task.id, true, index)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="py-1">
                            <DatePickerCell date={comm.deadline} taskId={task.id} isCommunication={true} commIndex={index} />
                          </TableCell>
                          <TableCell className="text-right py-1">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-gray-500 hover:text-gray-900"
                                onClick={() => onEditTask(task)}
                              >
                                <PencilIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-gray-500 hover:text-red-600"
                                onClick={() => removeCommunication(task.id, index)}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : [<TableRow key={`${task.id}-no-comm`} className="bg-gray-50">
                        <TableCell colSpan={6} className="pl-10 text-xs text-gray-500 italic py-1">
                          Aucun détail de communication. Utilisez le bouton + pour en ajouter.
                        </TableCell>
                      </TableRow>]
                  )
                ] : [];
                
                return [mainRow, ...commRows];
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
