"use client";

import React, { useState, useEffect } from 'react';
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
  CameraIcon
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

  // Fonction pour mettre à jour le statut d'une sous-tâche de communication
  const updateCommunicationStatus = async (taskId: string, commIndex: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    updatedDetails[commIndex] = {
      ...updatedDetails[commIndex],
      status: newStatus
    };
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour la priorité d'une sous-tâche de communication
  const updateCommunicationPriority = async (taskId: string, commIndex: number, newPriority: string) => {
    console.log(`Mise à jour de la priorité pour la communication ${commIndex} de la tâche ${taskId}: ${newPriority}`);
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    updatedDetails[commIndex] = {
      ...updatedDetails[commIndex],
      priority: newPriority as Task['priority']
    };
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour la date d'une sous-tâche de communication
  const updateCommunicationDate = async (taskId: string, commIndex: number, newDate: Date | null) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    updatedDetails[commIndex] = {
      ...updatedDetails[commIndex],
      deadline: newDate
    };
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour le type de média d'une sous-tâche de communication
  const updateCommunicationMediaType = async (taskId: string, commIndex: number, newMediaType: string) => {
    console.log(`Mise à jour du type de média pour la communication ${commIndex} de la tâche ${taskId}: ${newMediaType}`);
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    updatedDetails[commIndex] = {
      ...updatedDetails[commIndex],
      mediaType: newMediaType === "non-applicable" ? null : newMediaType as CommunicationDetail['mediaType']
    };
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour mettre à jour le type de communication
  const updateCommunicationType = async (taskId: string, commIndex: number, newType: string) => {
    console.log(`Mise à jour du type de communication pour la communication ${commIndex} de la tâche ${taskId}: ${newType}`);
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    updatedDetails[commIndex] = {
      ...updatedDetails[commIndex],
      type: newType as CommunicationDetail['type']
    };
    
    await onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    });
  };

  // Fonction pour obtenir le badge cliquable du type de communication
  const getTypeBadge = (type: string, taskId: string, commIndex: number) => {
    const iconMap: Record<string, React.ReactNode> = {
      'newsletter': <MailIcon className="h-2.5 w-2.5 mr-0.5" />,
      'panneau': <SignpostIcon className="h-2.5 w-2.5 mr-0.5" />,
      'flyer': <FileTextIcon className="h-2.5 w-2.5 mr-0.5" />,
      'post_site': <GlobeIcon className="h-2.5 w-2.5 mr-0.5" />,
      'post_linkedin': <LinkedinIcon className="h-2.5 w-2.5 mr-0.5" />,
      'post_instagram': <InstagramIcon className="h-2.5 w-2.5 mr-0.5" />,
      'autre': <FileIcon className="h-2.5 w-2.5 mr-0.5" />
    };
    
    // Libellés pour l'affichage
    const labels: Record<string, string> = {
      'newsletter': 'Newsletter',
      'panneau': 'Panneau',
      'flyer': 'Flyer',
      'post_site': 'Site Web',
      'post_linkedin': 'LinkedIn',
      'post_instagram': 'Instagram',
      'autre': 'Autre'
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
          <DropdownMenuItem onClick={() => updateCommunicationType(taskId, commIndex, 'autre')}>
            <FileIcon className="h-3.5 w-3.5 mr-2 text-gray-600" />
            <span>Autre</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Fonction pour ajouter un consultant à une sous-tâche de communication
  const addCommunicationAssignee = async (taskId: string, commIndex: number, email: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    const communication = updatedDetails[commIndex];
    const currentAssignees = Array.isArray(communication.assignedTo) ? [...communication.assignedTo] : [];
    
    if (!currentAssignees.includes(email)) {
      updatedDetails[commIndex] = {
        ...communication,
        assignedTo: [...currentAssignees, email]
      };
      
      await onUpdateTask({
        id: taskId,
        communicationDetails: updatedDetails
      });
    }
  };

  // Fonction pour supprimer un consultant d'une sous-tâche de communication
  const removeCommunicationAssignee = async (taskId: string, commIndex: number, email: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.communicationDetails) return;
    
    const updatedDetails = [...task.communicationDetails];
    const communication = updatedDetails[commIndex];
    const currentAssignees = Array.isArray(communication.assignedTo) ? [...communication.assignedTo] : [];
    
    updatedDetails[commIndex] = {
      ...communication,
      assignedTo: currentAssignees.filter(e => e !== email)
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

  // Fonction pour ajouter un nouveau type de communication à une tâche
  const addCommunicationType = (taskId: string, type: string) => {
    console.log("Ajout d'un type de communication:", type, "à la tâche:", taskId);
    
    // Trouver la tâche dans la liste complète des tâches (pas seulement les tâches filtrées)
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error("Tâche non trouvée:", taskId);
      return;
    }
    
    console.log("Tâche trouvée:", task);
    
    // Valider le type de communication
    const validTypes = ['newsletter', 'panneau', 'flyer', 'post_site', 'post_linkedin', 'post_instagram', 'carousel', 'video', 'autre'];
    const validType = validTypes.includes(type) ? type : 'autre';
    
    // Créer une copie profonde des détails de communication existants
    // S'assurer que communicationDetails est un tableau
    const existingDetails = Array.isArray(task.communicationDetails) 
      ? [...task.communicationDetails] 
      : [];
    
    console.log("Détails de communication existants:", existingDetails);
    
    // Créer un nouvel objet de détail pour la communication à ajouter avec tous les champs requis
    const newDetail = {
      type: validType as CommunicationDetail['type'], // Cast au type approprié
      status: 'en cours',
      priority: 'moyenne' as CommunicationDetail['priority'], // Cast au type approprié
      deadline: task.dueDate ? new Date(task.dueDate) : null, // Utiliser la date de la tâche principale comme date par défaut
      details: "",
      platform: null,
      mediaType: null,
      assignedTo: task.assignedTo ? [...task.assignedTo] : [] // Conserver l'assignation de la tâche principale
    };
    
    console.log("Nouveau détail à ajouter avec date:", newDetail);
    
    // Ajouter le nouveau détail à la liste existante
    const updatedDetails = [...existingDetails, newDetail];
    
    console.log("Détails de communication mis à jour:", updatedDetails);
    
    // Forcer l'expansion de la tâche immédiatement si ce n'est pas déjà fait
    if (!expandedTasks[taskId]) {
      setExpandedTasks(prev => ({
        ...prev,
        [taskId]: true
      }));
    }
    
    // Mettre à jour la tâche
    onUpdateTask({
      id: taskId,
      communicationDetails: updatedDetails
    }).then(() => {
      console.log("Communication ajoutée avec succès");
      
      // Forcer un rafraîchissement complet de l'interface
      setTimeout(() => {
        console.log("Forçage du rafraîchissement après ajout de communication");
        setExpandedTasks(prev => ({...prev}));
      }, 100);
    }).catch(error => {
      console.error("Erreur lors de l'ajout de la communication:", error);
    });
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
  const getBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'newsletter':
        return 'bg-purple-200 text-purple-900';
      case 'panneau':
        return 'bg-yellow-200 text-yellow-900';
      case 'flyer':
        return 'bg-emerald-200 text-emerald-900';
      case 'carousel':
        return 'bg-purple-200 text-purple-900';
      case 'video':
        return 'bg-orange-200 text-orange-900';
      case 'post_site':
        return 'bg-indigo-200 text-indigo-900';
      case 'post_linkedin':
        return 'bg-sky-200 text-sky-900';
      case 'post_instagram':
        return 'bg-pink-200 text-pink-900';
      default:
        return 'bg-gray-200 text-gray-900';
    }
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
                    <TableCell className="py-1.5">
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
                          {task.description && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {task.description}
                            </div>
                          )}
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
                    <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                      {getStatusBadge(task.status, task.id)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-5 text-xs flex items-center px-1 py-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            addCommunicationType(task.id, 'autre');
                            
                            // Force re-render to show the new communication immediately
                            setTimeout(() => {
                              console.log("Forcing re-render after adding communication");
                              setExpandedTasks({...expandedTasks});
                            }, 100);
                          }}
                        >
                          <PlusIcon className="h-3 w-3 mr-1" />
                          Ajouter un type de communication
                        </Button>
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
