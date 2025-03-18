"use client";

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, ImageIcon, VideoIcon, FileTextIcon } from 'lucide-react';
import { Task } from '../types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface TaskCalendarProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
}

// Type d'élément pour le drag and drop
const ItemTypes = {
  TASK: 'task'
};

// Composant pour un élément de tâche draggable
const DraggableTask = ({ 
  task, 
  onEditTask, 
  onUpdateTask,
  commIndex,
  stableCommId
}: { 
  task: Task; 
  onEditTask: (task: Task) => void; 
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  commIndex?: number;
  stableCommId?: string;
}) => {
  // Récupérer les détails de la communication si disponible
  const commDetails = commIndex !== undefined && task.communicationDetails && task.communicationDetails.length > 0 
    ? task.communicationDetails[0] // Dans le calendrier, chaque tâche n'a qu'une seule communication (voir prepareTasksForDisplay)
    : null;
  
  // Récupérer le type de communication
  const commType = commDetails?.type || null;
  
  // Utiliser l'identifiant stable passé en paramètre s'il existe, sinon le calculer
  const stableCommIdForDisplay = stableCommId || (commDetails && commIndex !== undefined ? 
    `${commType}-${commIndex}-${task.id}` : 
    null);
  
  // Générer un ID vraiment unique pour chaque communication
  const uniqueDragId = `${task.id}-${stableCommIdForDisplay || 'main'}`;
  
  // Créer un objet avec toutes les données nécessaires pour identifier correctement la communication
  const dragItem = {
    id: task.id,
    commIndex,
    commType,
    stableCommId: stableCommIdForDisplay,
    uniqueId: uniqueDragId
  };
  
  // Log pour déboguer
  console.log(`Préparation drag: ${JSON.stringify(dragItem)}`);
  
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: dragItem,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Fonction pour obtenir la couleur de fond en fonction du type d'action
  const getBackgroundColor = (actionType: string) => {
    switch (actionType) {
      case 'newsletter':
        return 'bg-blue-50 border-blue-200';
      case 'panneau':
        return 'bg-yellow-50 border-yellow-200';
      case 'flyer':
        return 'bg-green-50 border-green-200';
      case 'carousel':
        return 'bg-purple-50 border-purple-200';
      case 'video':
        return 'bg-orange-50 border-orange-200';
      case 'post_site':
        return 'bg-indigo-50 border-indigo-200';
      case 'post_linkedin':
        return 'bg-blue-50 border-blue-200';
      case 'post_instagram':
        return 'bg-pink-50 border-pink-200';
      default:
        return 'bg-gray-50 border-gray-200';
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

  // Fonction pour obtenir la couleur du badge en fonction du statut
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'à faire':
        return 'bg-yellow-200 text-yellow-800';
      case 'en cours':
        return 'bg-blue-200 text-blue-800';
      case 'terminée':
        return 'bg-green-200 text-green-800';
      case 'à tourner':
        return 'bg-orange-200 text-orange-800';
      case 'à éditer':
        return 'bg-pink-200 text-pink-800';
      case 'écrire légende':
        return 'bg-amber-200 text-amber-800';
      case 'prêt à publier':
        return 'bg-teal-200 text-teal-800';
      case 'publié':
        return 'bg-green-200 text-green-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  // Fonction pour obtenir l'icône du type de média
  const getMediaIcon = (mediaType: string | null | undefined) => {
    if (!mediaType) return null;
    
    switch (mediaType) {
      case 'photo':
        return <ImageIcon className="h-3 w-3 text-purple-600" />;
      case 'video':
        return <VideoIcon className="h-3 w-3 text-orange-600" />;
      case 'texte':
        return <FileTextIcon className="h-3 w-3 text-blue-600" />;
      default:
        return null;
    }
  };

  // Fonction pour obtenir le libellé du type d'action
  const getActionTypeLabel = (actionType: string) => {
    const actionLabels: Record<string, string> = {
      'newsletter': 'Newsletter',
      'panneau': 'Panneau',
      'flyer': 'Flyer',
      'carousel': 'Carousel',
      'video': 'Vidéo',
      'post_site': 'Post Site',
      'post_linkedin': 'LinkedIn',
      'post_instagram': 'Insta',
      'autre': 'Autre'
    };
    
    return actionLabels[actionType] || actionType;
  };

  // Fonction pour obtenir le libellé de la plateforme
  const getPlatformLabel = (platform: string | null | undefined) => {
    if (!platform) return null;
    
    const platformLabels: Record<string, string> = {
      'site': 'Site',
      'linkedin': 'LinkedIn',
      'instagram': 'Insta',
      'facebook': 'Facebook',
      'tiktok': 'TikTok',
      'youtube': 'YT',
      'autre': 'Autre'
    };
    
    return platformLabels[platform] || platform;
  };

  // Afficher la carte principale qui peut contenir des détails de communication
  return (
    <div
      ref={dragRef as any}
      className={`p-2 mb-2 rounded border cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
      onClick={() => onEditTask(task)}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-start gap-1 mb-1">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{task.title}</div>
        </div>
      </div>
      
      {/* Afficher uniquement les détails de communication filtrés pour cette date */}
      {task.communicationDetails && task.communicationDetails.length > 0 ? (
        <div className="flex flex-col gap-2">
          {task.communicationDetails.map((comm, idx) => (
            <div key={idx} className="flex flex-wrap gap-1 mt-1">
              {/* Badge pour le type de communication */}
              <div className={`text-xs font-medium px-2 py-0.5 rounded-md ${getBadgeColor(comm.type)}`}>
                {getActionTypeLabel(comm.type)}
              </div>
              
              {/* Badge pour le statut de la communication */}
              {comm.status && (
                <div className={`text-xs font-medium px-2 py-0.5 rounded-md ${getStatusBadgeColor(comm.status)}`}>
                  {comm.status}
                </div>
              )}
              
              {/* Badge pour la plateforme de la communication */}
              {comm.platform && (
                <div className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-200 text-gray-800">
                  {getPlatformLabel(comm.platform)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Si pas de détails de communication, afficher uniquement le badge pour le type d'action principal
        <div className="flex flex-wrap gap-1 mt-1">
          <div className={`text-xs font-medium px-2 py-0.5 rounded-md ${getBadgeColor(task.actionType)}`}>
            {getActionTypeLabel(task.actionType)}
          </div>
          {task.platform && (
            <div className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-200 text-gray-800">
              {getPlatformLabel(task.platform)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Composant pour une cellule de jour qui peut recevoir des tâches
const DroppableDay = ({ 
  date, 
  tasks, 
  onEditTask, 
  onUpdateTask 
}: { 
  date: Date; 
  tasks: Task[]; 
  onEditTask: (task: Task) => void; 
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>; 
}) => {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: async (item: { id: string, commIndex?: number, commType?: string, stableCommId?: string, uniqueId?: string }) => {
      console.log(`Drop: élément avec uniqueId: ${item.uniqueId}`);
      
      // Trouver la tâche par son ID
      const taskToUpdate = tasks.find(t => t.id === item.id);
      
      if (!taskToUpdate) {
        console.error(`Tâche non trouvée: ${item.id}`);
        return;
      }
      
      // Créer une date formatée pour le débogage
      const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      console.log(`Date cible pour le drop: ${formattedDate}`);

      // Cas 1: Mise à jour d'une communication spécifique
      if (taskToUpdate.communicationDetails && item.stableCommId) {
        // Essayer de trouver l'index de la communication en utilisant l'identifiant stable
        let commIndexToUpdate: number | undefined;
        
        // Recherche par identifiant stable (méthode la plus fiable)
        commIndexToUpdate = taskToUpdate.communicationDetails.findIndex((comm, idx) => {
          const commStableId = `${comm.type}-${idx}`;
          return commStableId === item.stableCommId;
        });
        
        // Si pas trouvé, essayer par type
        if (commIndexToUpdate === -1 && item.commType) {
          commIndexToUpdate = taskToUpdate.communicationDetails.findIndex(
            comm => comm.type === item.commType
          );
          
          if (commIndexToUpdate !== -1) {
            console.warn(`Communication trouvée par type (${item.commType}) à l'index ${commIndexToUpdate}`);
          }
        }
        
        // En dernier recours, utiliser l'index d'origine
        if (commIndexToUpdate === -1) {
          console.error(`Communication non trouvée avec l'identifiant: ${item.stableCommId}`);
          console.warn(`Utilisation de l'index d'origine (${item.commIndex}) comme dernier recours`);
          commIndexToUpdate = item.commIndex;
        }
        
        // Vérifier que l'index est valide
        if (typeof commIndexToUpdate !== 'number' || commIndexToUpdate >= taskToUpdate.communicationDetails.length) {
          console.error(`Index de communication invalide: ${commIndexToUpdate}`);
          return;
        }
        
        // Récupérer la communication spécifique
        const commToUpdate = taskToUpdate.communicationDetails[commIndexToUpdate];
        
        // Récupérer le type de communication pour les logs
        const commType = commToUpdate.type;
        console.log(`Déplacement de la communication: ${commType} (index actuel: ${commIndexToUpdate})`);
        
        try {
          // Créer une copie du tableau des communications
          const updatedComms = taskToUpdate.communicationDetails.map((comm, idx) => {
            // Ne mettre à jour que la communication spécifique
            if (idx === commIndexToUpdate) {
              // Journalisation des dates pour débogage
              const oldDate = comm.deadline ? new Date(comm.deadline) : null;
              const oldDateStr = oldDate 
                ? `${oldDate.getFullYear()}-${oldDate.getMonth() + 1}-${oldDate.getDate()}`
                : "non définie";
              
              const newDateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
              console.log(`Communication '${commType}' déplacée de ${oldDateStr} à ${newDateStr}`);
              
              // Retourner une nouvelle version de cette communication avec la date modifiée
              return {
                ...comm,
                deadline: date
              };
            }
            // Retourner les autres communications inchangées
            return comm;
          });
          
          // Mise à jour atomique avec le tableau mis à jour
          await onUpdateTask({
            id: item.id,
            communicationDetails: updatedComms
          });
          
          console.log("Mise à jour de la communication terminée avec succès");
          // Débogger le tableau final
          console.log("Nouvelles dates des communications:", 
            updatedComms.map((c, i) => `${i}: ${c.type} - ${c.deadline ? new Date(c.deadline).toLocaleDateString() : 'non définie'}`));
        } catch (error) {
          console.error("Erreur lors de la mise à jour:", error);
        }
      } 
      // Cas 2: Mise à jour de la date principale de la tâche
      else {
        const oldDate = taskToUpdate.dueDate 
          ? new Date(taskToUpdate.dueDate) 
          : null;
        
        const oldDateStr = oldDate 
          ? `${oldDate.getFullYear()}-${oldDate.getMonth() + 1}-${oldDate.getDate()}`
          : "non définie";
          
        console.log(`Tâche principale déplacée de ${oldDateStr} à ${formattedDate}`);
        
        // Mise à jour atomique uniquement de la date d'échéance principale
        await onUpdateTask({
          id: item.id,
          dueDate: date
        });
        
        console.log("Mise à jour de la tâche principale terminée avec succès");
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Cette fonction prépare les tâches pour l'affichage, en créant des tâches
  // distinctes pour chaque communication qui correspond à cette date
  const prepareTasksForDisplay = () => {
    // Structure de données qui stocke à la fois la tâche et l'index de communication
    interface DisplayTask {
      task: Task;
      commIndex?: number;
      stableCommId?: string;  // Identifiant stable pour la communication
    }
    
    const displayTasks: DisplayTask[] = [];
    
    tasks.forEach(task => {
      // Cas 1: Tâche sans communications mais avec une date principale qui correspond
      if (task.dueDate) {
        const taskDate = new Date(task.dueDate);
        const sameDate = (
          taskDate.getDate() === date.getDate() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getFullYear() === date.getFullYear()
        );
        
        if (sameDate && (!task.communicationDetails || task.communicationDetails.length === 0)) {
          // Créer une copie distincte de la tâche pour éviter tout effet de bord
          displayTasks.push({ 
            task: JSON.parse(JSON.stringify(task)) 
          });
        }
      }
      
      // Cas 2: Tâche avec des communications - créer une tâche distincte pour chaque communication prévue à cette date
      if (task.communicationDetails && task.communicationDetails.length > 0) {
        // Pour chaque communication, vérifier si elle est prévue pour cette date
        task.communicationDetails.forEach((comm, commIndex) => {
          if (comm.deadline) {
            const commDate = new Date(comm.deadline);
            // Si la date correspond à la date de la cellule
            if (
              commDate.getDate() === date.getDate() &&
              commDate.getMonth() === date.getMonth() &&
              commDate.getFullYear() === date.getFullYear()
            ) {
              // Créer un identifiant stable pour cette communication
              // L'identifiant ne doit PAS inclure la date pour rester stable après déplacement
              // Mais doit inclure l'index pour garantir l'unicité
              const stableCommId = `${comm.type}-${commIndex}-${task.id}`;
              
              // Log pour faciliter le débogage
              console.log(`Préparation de l'affichage pour la communication ${commIndex} (${comm.type}) avec ID stable: ${stableCommId}`);
              
              // IMPORTANT: Créer une copie complètement isolée de la tâche
              // avec SEULEMENT cette communication spécifique
              const taskCopy = {
                ...JSON.parse(JSON.stringify(task)),
                // Remplacer complètement le tableau communicationDetails avec uniquement cette communication
                communicationDetails: [JSON.parse(JSON.stringify(comm))]
              };

              // Effacer les propriétés qui pourraient causer des confusions
              delete taskCopy.dueDate; // Éviter toute confusion avec la date principale
              
              // Stocker l'index original de la communication dans la tâche parente pour le drag and drop
              // ET l'identifiant stable pour une meilleure robustesse
              displayTasks.push({ 
                task: taskCopy, 
                commIndex,
                stableCommId
              });
            }
          }
        });
      }
    });
    
    // Vérifier l'isolation en journalisant les tâches préparées
    if (displayTasks.length > 0) {
      console.log(`Jour ${date.getDate()}: ${displayTasks.length} tâches préparées`);
      
      // Log détaillé pour le débogage
      displayTasks.forEach((item, idx) => {
        const commDetails = item.commIndex !== undefined ? item.task.communicationDetails?.[0] : null;
        console.log(`  ${idx}: Tâche ${item.task.id} - ${item.task.title}, ${
          item.commIndex !== undefined 
            ? `Communication ${item.commIndex} (${commDetails?.type}) [ID: ${item.stableCommId}]` 
            : 'Tâche principale'
        }`);
      });
    }
    
    return displayTasks;
  };

  // Obtenir les tâches préparées pour l'affichage
  const tasksToDisplay = prepareTasksForDisplay();

  // Vérifier si la date est aujourd'hui
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Vérifier si la date est dans le mois actuel
  const isCurrentMonth = (date: Date, currentDate: Date) => {
    return date.getMonth() === currentDate.getMonth() && 
           date.getFullYear() === currentDate.getFullYear();
  };

  return (
    <div
      ref={dropRef as any}
      className={`h-full min-h-[120px] p-1 rounded border border-gray-100 transition-colors ${
        isOver ? 'bg-blue-50' : isToday(date) ? 'bg-red-50' : 'bg-white'
      } ${isCurrentMonth(date, new Date()) ? '' : 'opacity-60'}`}
    >
      <div className={`text-xs font-medium mb-1 ${isToday(date) ? 'text-[#DC0032] font-bold' : ''}`}>
        {date.getDate()}
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {tasksToDisplay.map((item, index) => (
          <DraggableTask
            key={`${item.task.id}-${item.stableCommId || 'main'}-${index}`}
            task={item.task}
            onEditTask={onEditTask}
            onUpdateTask={onUpdateTask}
            commIndex={item.commIndex}
            stableCommId={item.stableCommId}
          />
        ))}
      </div>
    </div>
  );
};

export default function TaskCalendar({ tasks, onEditTask, onUpdateTask }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [displayMode, setDisplayMode] = useState<'month' | 'week'>('month');
  
  // Extraire consultant à partir de l'URL pour filtrer les tâches
  const [consultant, setConsultant] = useState<string | null>(null);
  
  // Fonction pour convertir le nom du consultant en email
  const getConsultantEmail = (name: string | null): string | null => {
    if (!name) return null;
    
    // Liste des consultants disponibles
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
    
    const found = CONSULTANTS.find(c => c.name.toLowerCase() === name.toLowerCase());
    return found ? found.email : null;
  };
  
  useEffect(() => {
    // Récupérer le consultant à partir de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const consultantParam = urlParams.get('consultant');
    setConsultant(consultantParam);
  }, []);
  
  // Filtrer les tâches pour n'afficher que les communications assignées au consultant actuel
  const filteredTasks = React.useMemo(() => {
    if (!consultant) return tasks;
    
    // Convertir le nom du consultant en email pour la correspondance
    const consultantEmail = getConsultantEmail(consultant);
    if (!consultantEmail) return tasks;
    
    // Vérifier si le filtre des tâches assignées est actif
    const isAssignedFilterActive = window.location.search.includes('assignedFilter=true');
    
    // Si le filtre des tâches assignées est actif, montrer toutes les tâches
    if (isAssignedFilterActive) return tasks;
    
    // Sinon, filtrer pour ne montrer que les communications assignées au consultant
    return tasks.map(task => {
      // Copie de la tâche pour éviter de modifier l'original
      const taskCopy = {...task};
      
      // Si la tâche a des détails de communication, filtrer uniquement ceux assignés au consultant
      if (taskCopy.communicationDetails && taskCopy.communicationDetails.length > 0) {
        taskCopy.communicationDetails = taskCopy.communicationDetails.filter(comm => 
          comm.assignedTo?.includes(consultantEmail)
        );
      }
      
      return taskCopy;
    }).filter(task => 
      // Garder seulement les tâches avec au moins une communication ou assignées directement
      task.assignedTo?.includes(consultantEmail) || 
      (task.communicationDetails && task.communicationDetails.length > 0)
    );
  }, [tasks, consultant]);

  // Générer les jours du mois pour le calendrier
  useEffect(() => {
    const days: Date[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Obtenir le premier jour du mois
    const firstDay = new Date(year, month, 1);
    // Obtenir le jour de la semaine du premier jour (0 = dimanche, 1 = lundi, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Ajouter les jours du mois précédent pour compléter la première semaine
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = daysFromPrevMonth; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }
    
    // Ajouter tous les jours du mois actuel
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Ajouter les jours du mois suivant pour compléter la dernière semaine
    const lastDay = new Date(year, month, daysInMonth);
    const lastDayOfWeek = lastDay.getDay();
    const daysFromNextMonth = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    for (let i = 1; i <= daysFromNextMonth; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    setCalendarDays(days);
  }, [currentDate]);

  // Passer au mois précédent
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Passer au mois suivant
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Passer au mois actuel
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Formater le mois et l'année
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Jours de la semaine
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <DndProvider backend={HTML5Backend}>
      <Card className="border-none shadow-none pb-6">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold capitalize">{formatMonthYear(currentDate)}</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, index) => (
              <div key={index} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 h-[calc(100vh-250px)] overflow-auto">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={index}
                  className={`border-b border-r p-1 ${
                    isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <DroppableDay
                    date={day}
                    tasks={filteredTasks}
                    onEditTask={onEditTask}
                    onUpdateTask={onUpdateTask}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </DndProvider>
  );
} 