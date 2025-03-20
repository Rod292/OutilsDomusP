"use client";

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, ImageIcon, VideoIcon, FileTextIcon, MailIcon, SignpostIcon, GlobeIcon, LinkedinIcon, InstagramIcon, LightbulbIcon, FileIcon, LayoutIcon } from 'lucide-react';
import { Task, CommunicationDetail } from '../types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { cn } from '@/lib/utils';
import { format, getDay, startOfMonth, endOfMonth, eachDayOfInterval, parse, isSameMonth, isSameDay, addMonths, subMonths, isToday, isAfter, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskCalendarProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
}

// Interface pour les props du jour déposable
interface DroppableDayProps {
  date: Date;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  canDrop?: boolean;
}

// Type d'élément pour le drag and drop
const ItemTypes = {
  TASK: 'task'
};

// Composant pour une tâche pouvant être déplacée
const DraggableTask = ({ 
  task, 
  onEditTask, 
  onUpdateTask,
  commIndex,
  stableCommId,
  uuid
}: { 
  task: Task; 
  onEditTask: (task: Task) => void; 
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  commIndex?: number;
  stableCommId?: string;
  uuid?: string;
}) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { 
      id: task.id,
      commIndex,
      commType: commIndex !== undefined && task.communicationDetails && task.communicationDetails.length > 0
        ? task.communicationDetails[0]?.type 
        : undefined,
      stableCommId,
      propertyAddress: task.propertyAddress,
      dossierNumber: task.dossierNumber,
      currentDate: task.dueDate?.toISOString() || null,
      uuid // Inclure l'UUID pour l'identification
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [task.id, commIndex, task.propertyAddress, task.dossierNumber, task.dueDate]);

  // Déterminer si c'est une communication
  const isCommunication = commIndex !== undefined && task.communicationDetails && task.communicationDetails.length > 0;
  
  // Accéder à la communication spécifique si c'est une communication
  const communication = isCommunication ? task.communicationDetails[0] : null;
  
  // Déterminer le titre à afficher
  const displayTitle = isCommunication 
    ? `${communication?.type || 'Comm.'} - ${task.title}` 
    : task.title;
  
  // Déterminer le type d'action
  const actionType = task.actionType || 'autre';
  
  const getBackgroundColor = (actionType: string) => {
    const colors: Record<string, string> = {
      'newsletter': 'bg-purple-100 dark:bg-purple-900',
      'panneau': 'bg-blue-100 dark:bg-blue-900',
      'flyer': 'bg-green-100 dark:bg-green-900',
      'carousel': 'bg-yellow-100 dark:bg-yellow-900',
      'video': 'bg-red-100 dark:bg-red-900',
      'post_site': 'bg-indigo-100 dark:bg-indigo-900',
      'post_linkedin': 'bg-sky-100 dark:bg-sky-900',
      'post_instagram': 'bg-pink-100 dark:bg-pink-900',
      'autre': 'bg-gray-100 dark:bg-gray-800'
    };
    return colors[actionType] || 'bg-gray-100 dark:bg-gray-800';
  };
  
  const getBadgeColor = (actionType: string) => {
    const colors: Record<string, string> = {
      'newsletter': 'bg-purple-500 text-white',
      'panneau': 'bg-blue-500 text-white',
      'flyer': 'bg-green-500 text-white',
      'carousel': 'bg-yellow-500 text-black',
      'video': 'bg-red-500 text-white',
      'post_site': 'bg-indigo-500 text-white',
      'post_linkedin': 'bg-sky-500 text-white',
      'post_instagram': 'bg-pink-500 text-white',
      'autre': 'bg-gray-500 text-white'
    };
    return colors[actionType] || 'bg-gray-500 text-white';
  };
  
  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'à faire': 'bg-yellow-500 text-white',
      'en cours': 'bg-blue-500 text-white',
      'terminée': 'bg-green-500 text-white',
      'en attente': 'bg-orange-500 text-white'
    };
    return colors[status] || 'bg-gray-500 text-white';
  };
  
  const getMediaIcon = (mediaType: string | null | undefined) => {
    if (!mediaType) return null;
    
    const icons: Record<string, JSX.Element> = {
      'image': <ImageIcon className="h-3 w-3" />,
      'video': <VideoIcon className="h-3 w-3" />,
      'document': <FileTextIcon className="h-3 w-3" />
    };
    
    return icons[mediaType] || null;
  };
  
  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'newsletter': 'Newsletter',
      'panneau': 'Panneau',
      'flyer': 'Flyer',
      'carousel': 'Carousel',
      'video': 'Vidéo',
      'post_site': 'Site Web',
      'post_linkedin': 'LinkedIn',
      'post_instagram': 'Instagram',
      'autre': 'Autre'
    };
    return labels[actionType] || 'Autre';
  };
  
  const getPlatformLabel = (platform: string | null | undefined) => {
    if (!platform) return null;
    
    const labels: Record<string, string> = {
      'linkedin': 'LinkedIn',
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'website': 'Site Web',
      'youtube': 'YouTube',
      'mailing': 'Mailing',
      'email': 'Email'
    };
    
    return labels[platform] || platform;
  };

  // Classes CSS pour les écrans plus petits (mobile)
  const mobileClasses = "md:hidden block";
  // Classes CSS pour les écrans plus grands (desktop)
  const desktopClasses = "hidden md:block";

  return (
    <div
      ref={dragRef as any}
      onClick={() => onEditTask(task)}
      className={`${getBackgroundColor(actionType)} p-1 mb-1 rounded cursor-pointer 
        border border-transparent hover:border-blue-400 transition-colors 
        ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {/* Version mobile - Affichage compact */}
      <div className={`${mobileClasses} text-xs`}>
        <div className="font-medium mb-1 truncate" style={{ maxWidth: '100%' }}>
          {displayTitle.length > 15 ? displayTitle.substring(0, 15) + '...' : displayTitle}
        </div>
        <div className="flex items-center space-x-1">
          <Badge className={`${getBadgeColor(actionType)} text-[0.6rem] px-1 py-0 h-4`}>
            {getActionTypeLabel(actionType).substring(0, 3)}
          </Badge>
          {task.status && (
            <Badge className={`${getStatusBadgeColor(task.status)} text-[0.6rem] px-1 py-0 h-4`}>
              {task.status.substring(0, 1).toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Version desktop - Affichage détaillé */}
      <div className={`${desktopClasses}`}>
        <div className="flex justify-between items-start">
          <h3 className="text-xs font-medium truncate" style={{ maxWidth: 'calc(100% - 20px)' }}>
            {displayTitle}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTask(task);
            }}
            className="p-0.5 hover:bg-gray-200 rounded-full"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center space-x-1 mt-1 flex-wrap">
          <Badge className={`${getBadgeColor(actionType)} text-[0.6rem] px-1 py-0 h-4`}>
            {getActionTypeLabel(actionType)}
          </Badge>
          {task.status && (
            <Badge className={`${getStatusBadgeColor(task.status)} text-[0.6rem] px-1 py-0 h-4`}>
              {task.status}
            </Badge>
          )}
          {task.mediaType && getMediaIcon(task.mediaType) && (
            <Badge variant="outline" className="text-[0.6rem] px-1 py-0 h-4 flex items-center">
              {getMediaIcon(task.mediaType)}
            </Badge>
          )}
          {task.platform && getPlatformLabel(task.platform) && (
            <Badge variant="outline" className="text-[0.6rem] px-1 py-0 h-4">
              {getPlatformLabel(task.platform)}
            </Badge>
          )}
        </div>
        {task.assignedTo && task.assignedTo.length > 0 && Array.isArray(task.assignedTo) && (
          <div className="mt-1 flex flex-wrap">
            {task.assignedTo.map((email: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-[0.6rem] px-1 py-0 h-4 mr-1 mb-1">
                {email.split('@')[0]}
              </Badge>
            ))}
          </div>
        )}
        {isCommunication && communication?.assignedTo && communication.assignedTo.length > 0 && Array.isArray(communication.assignedTo) && (
          <div className="mt-1 flex flex-wrap">
            {communication.assignedTo.map((email: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-[0.6rem] px-1 py-0 h-4 mr-1 mb-1">
                {email.split('@')[0]}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant pour une cellule de jour qui peut recevoir des tâches
const DroppableDay: React.FC<DroppableDayProps> = ({ 
  date, 
  tasks, 
  onEditTask, 
  onUpdateTask, 
  canDrop
}) => {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: async (item: { 
      id: string, 
      commIndex?: number, 
      commType?: string, 
      stableCommId?: string, 
      uniqueId?: string,
      propertyAddress?: string,
      dossierNumber?: string,
      currentDate?: string | null,
      uuid?: string
    }) => {
      console.log(`Déplacement de la communication vers ${date.toLocaleDateString()}`);
      
      try {
        // Récupérer la tâche à mettre à jour depuis le localStorage pour avoir les données locales les plus à jour
        // et non pas les données retournées par la requête Firestore qui peuvent être plus anciennes
        let taskToUpdate;
        
        // D'abord essayer de récupérer la tâche depuis l'état local
        if (typeof window !== 'undefined') {
          const localTasksJSON = localStorage.getItem('current_tasks');
          if (localTasksJSON) {
            try {
              const localTasks = JSON.parse(localTasksJSON);
              taskToUpdate = localTasks.find((t: any) => t.id === item.id);
              console.log("Utilisation des données locales pour la mise à jour", taskToUpdate?.communicationDetails?.map((c: any, i: number) => 
                `${i}: ${c.type} - ${c.deadline ? new Date(c.deadline).toLocaleDateString() : 'non définie'}`
              ));
            } catch (e) {
              console.log("Erreur lors de la lecture du localStorage:", e);
            }
          }
        }
        
        // Si la tâche n'a pas été trouvée dans localStorage, utiliser les données de l'état
        if (!taskToUpdate) {
          taskToUpdate = tasks.find(t => t.id === item.id);
          console.log("Utilisation des données de l'état pour la mise à jour");
        }
        
        if (!taskToUpdate) {
          console.log(`Tâche non trouvée: ${item.id}`);
          return;
        }
        
        // Cas 1: Mise à jour d'une communication spécifique
        if (taskToUpdate.communicationDetails && item.uuid) {
          console.log(`Recherche de la communication avec UUID: ${item.uuid}`);
          
          // IMPORTANT: Vérifier toutes les communications et afficher leurs détails
          if (taskToUpdate.communicationDetails.length > 0) {
            console.log(`Détails des ${taskToUpdate.communicationDetails.length} communications disponibles:`);
            
            taskToUpdate.communicationDetails.forEach((comm, idx) => {
              const commUUID = getOrCreateCommunicationUUID(taskToUpdate.id, comm.type, comm.originalIndex !== undefined ? comm.originalIndex : idx);
              console.log(`- Index actuel ${idx}, originalIndex ${comm.originalIndex}, type ${comm.type}, UUID: ${commUUID}`);
            });
          }
          
          // Rechercher la communication en étant plus souple sur les critères de correspondance
          let commIndexToUpdate = -1;
          
          // D'abord, essayons de chercher par UUID exact (méthode préférée)
          commIndexToUpdate = taskToUpdate.communicationDetails.findIndex((comm, idx) => {
            const commUUID = getOrCreateCommunicationUUID(taskToUpdate.id, comm.type, comm.originalIndex !== undefined ? comm.originalIndex : idx);
            return commUUID === item.uuid;
          });
          
          // Si on ne trouve pas par UUID, essayons par index ou type
          if (commIndexToUpdate === -1 && item.commIndex !== undefined) {
            console.log(`UUID non trouvé, tentative de recherche par index ${item.commIndex}`);
            
            // Recherche par index original
            commIndexToUpdate = taskToUpdate.communicationDetails.findIndex(
              comm => comm.originalIndex === item.commIndex
            );
            
            // Si toujours pas trouvé, essayez par index de tableau
            if (commIndexToUpdate === -1 && item.commIndex < taskToUpdate.communicationDetails.length) {
              console.log(`Index original non trouvé, utilisation de l'index de tableau ${item.commIndex}`);
              commIndexToUpdate = item.commIndex;
            }
          }
          
          // Dernière tentative: chercher par type de communication
          if (commIndexToUpdate === -1 && item.commType) {
            console.log(`Index non trouvé, tentative de recherche par type ${item.commType}`);
            commIndexToUpdate = taskToUpdate.communicationDetails.findIndex(
              comm => comm.type === item.commType
            );
          }
          
          if (commIndexToUpdate === -1) {
            console.log(`Communication non trouvée avec UUID: ${item.uuid}, ni par index, ni par type`);
            return;
          }
          
          console.log(`Communication trouvée à l'index ${commIndexToUpdate}`);
          
          // Créer une copie profonde des communications existantes
          const updatedCommunications = JSON.parse(JSON.stringify(taskToUpdate.communicationDetails));
          
          // Mettre à jour uniquement la date de la communication spécifique
          updatedCommunications[commIndexToUpdate] = {
            ...updatedCommunications[commIndexToUpdate],
            deadline: date,
            originalIndex: updatedCommunications[commIndexToUpdate].originalIndex // Conserver l'index original
          };
          
          console.log(`Communications mises à jour:`, updatedCommunications.map((c: any, i: number) => 
            `${i}: ${c.type} - ${c.deadline ? new Date(c.deadline).toLocaleDateString() : 'non définie'}`
          ));
          
          // IMPORTANT: Stocker temporairement les communications mises à jour dans le localStorage
          // pour assurer que nous avons les données les plus récentes pour la prochaine mise à jour
          if (typeof window !== 'undefined') {
            try {
              const localTasksJSON = localStorage.getItem('current_tasks');
              if (localTasksJSON) {
                const localTasks = JSON.parse(localTasksJSON);
                const taskIndex = localTasks.findIndex((t: any) => t.id === item.id);
                if (taskIndex !== -1) {
                  localTasks[taskIndex].communicationDetails = updatedCommunications;
                  localStorage.setItem('current_tasks', JSON.stringify(localTasks));
                  console.log("État local mis à jour dans localStorage pour les prochaines opérations");
                }
              } else {
                // Si pas encore de tâches stockées, les initialiser avec l'état actuel
                const initialTasks = tasks.map(t => {
                  if (t.id === item.id) {
                    return {...t, communicationDetails: updatedCommunications};
                  }
                  return t;
                });
                localStorage.setItem('current_tasks', JSON.stringify(initialTasks));
              }
            } catch (e) {
              console.log("Erreur lors de la mise à jour du localStorage:", e);
            }
          }
          
          // Envoyer toutes les communications pour s'assurer qu'aucune n'est perdue
          await onUpdateTask({
            id: item.id,
            communicationDetails: updatedCommunications
          });
          
          console.log(`Demande de mise à jour envoyée pour la communication ${commIndexToUpdate}`);
        } 
        // Cas 2: Mise à jour de la date principale de la tâche
        else {
          await onUpdateTask({
            id: item.id,
            dueDate: date
          });
        }
      } catch (error) {
        console.error("Erreur:", error);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Fonction pour trier et limiter les tâches en fonction de la vue mobile ou desktop
  const prepareTasksForDisplay = () => {
    // Trier les tâches par priorité
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder: Record<string, number> = { 'haute': 0, 'moyenne': 1, 'basse': 2 };
      return (priorityOrder[a.priority || 'moyenne'] || 1) - (priorityOrder[b.priority || 'moyenne'] || 1);
    });

    // Pour mobile, limiter à 3 tâches principales
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      return sortedTasks.slice(0, 3);
    }
    
    // Pour desktop, afficher toutes les tâches
    return sortedTasks;
  };

  const tasksToDisplay = prepareTasksForDisplay();
  const hiddenTasksCount = tasks.length - tasksToDisplay.length;

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

  const maxTasksToShow = {
    mobile: 3,  // Nombre max de tâches à afficher sur mobile
    desktop: 100 // Pas de limite sur desktop
  };

  // Vérifier si on est sur mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // Nombre de tâches à afficher en fonction de l'appareil
  const visibleTasks = tasksToDisplay.slice(0, isMobile ? maxTasksToShow.mobile : maxTasksToShow.desktop);
  
  // S'il y a des tâches supplémentaires non affichées
  const hasMoreTasks = tasksToDisplay.length > visibleTasks.length;

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
        {visibleTasks.map((item, index) => (
          <DraggableTask
            key={`${item.id}-${index}`}
            task={item}
            onEditTask={onEditTask}
            onUpdateTask={onUpdateTask}
            commIndex={undefined}
            stableCommId={undefined}
            uuid={undefined}
          />
        ))}
        {hasMoreTasks && (
          <div className="text-xs text-center text-gray-500 mt-1 p-1 bg-gray-100 rounded">
            +{tasksToDisplay.length - visibleTasks.length} autres
          </div>
        )}
      </div>
    </div>
  );
};

// Fonction utilitaire pour générer un UUID aléatoire
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Fonction pour obtenir ou créer un UUID pour une communication
const getOrCreateCommunicationUUID = (taskId: string, commType: string, commIndex: number) => {
  if (typeof window === 'undefined') return generateUUID();
  
  const key = `${taskId}:${commType}:${commIndex}`;
  
  if (!(window as any).communicationUUIDs) {
    (window as any).communicationUUIDs = {};
  }
  
  if (!(window as any).communicationUUIDs[key]) {
    // Générer un nouvel UUID
    (window as any).communicationUUIDs[key] = generateUUID();
    console.log(`SYSTÈME UUID: Création d'un nouvel UUID pour ${key}: ${(window as any).communicationUUIDs[key]}`);
  }
  
  return (window as any).communicationUUIDs[key];
};

// Typing des fonctions de rendu de communications
const renderCommunications = (
  task: Task, 
  onEditTask: (task: Task) => void, 
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>
) => {
  if (!task.communicationDetails || task.communicationDetails.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 mt-1">
      {task.communicationDetails.map((comm, idx) => (
        <div
          key={`${task.id}-comm-${idx}`}
          className="text-xs pl-1 border-l-2 border-gray-300"
        >
          <div className="flex items-center gap-1">
            {getTypeIcon(comm.type)}
            <span className="text-gray-600 truncate">{getTypeLabel(comm.type)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Types pour les paramètres des fonctions helper
const getTypeIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'newsletter':
      return <MailIcon className="h-3 w-3 text-purple-600" />;
    case 'panneau':
      return <SignpostIcon className="h-3 w-3 text-yellow-600" />;
    case 'flyer':
      return <FileTextIcon className="h-3 w-3 text-emerald-600" />;
    case 'post_site':
      return <GlobeIcon className="h-3 w-3 text-indigo-600" />;
    case 'post_linkedin':
      return <LinkedinIcon className="h-3 w-3 text-sky-600" />;
    case 'post_instagram':
      return <InstagramIcon className="h-3 w-3 text-pink-600" />;
    case 'carousel':
      return <ImageIcon className="h-3 w-3 text-purple-600" />;
    case 'plan_2d_3d':
      return <LayoutIcon className="h-3 w-3 text-blue-600" />;
    case 'video':
      return <VideoIcon className="h-3 w-3 text-red-600" />;
    case 'idee':
      return <LightbulbIcon className="h-3 w-3 text-amber-600" />;
    default:
      return <FileIcon className="h-3 w-3 text-gray-600" />;
  }
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'newsletter': 'Newsletter',
    'panneau': 'Panneau',
    'flyer': 'Flyer',
    'post_site': 'Site web',
    'post_linkedin': 'LinkedIn',
    'post_instagram': 'Instagram',
    'carousel': 'Carousel',
    'plan_2d_3d': 'Plan 2D/3D',
    'video': 'Vidéo',
    'idee': 'Idée',
    'autre': 'Autre'
  };
  
  return labels[type] || 'Autre';
};

export default function TaskCalendar({ tasks, onEditTask, onUpdateTask }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(currentDate));
  const [displayedWeeks, setDisplayedWeeks] = useState<Date[][]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile(); // Vérifier l'état initial
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Générer les semaines pour l'affichage du calendrier
  useEffect(() => {
    const startDate = startOfMonth(visibleMonth);
    const endDate = endOfMonth(visibleMonth);

    // Obtenir tous les jours du mois
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Trouver le jour de la semaine du premier jour (0 = dimanche, 1 = lundi, ...)
    const startDay = getDay(startDate);

    // Ajouter les jours du mois précédent pour compléter la première semaine
    let previousMonthDays = [];
    for (let i = (startDay === 0 ? 6 : startDay - 1); i > 0; i--) {
      previousMonthDays.push(addDays(startDate, -i));
    }

    // Combiner tous les jours
    const allDays = [...previousMonthDays, ...days];

    // Ajouter les jours du mois suivant pour compléter la dernière semaine
    const remainingDays = 7 - (allDays.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        allDays.push(addDays(endDate, i));
      }
    }

    // Diviser en semaines
    const weeks: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    setDisplayedWeeks(weeks);
  }, [visibleMonth]);

  // Navigation dans le calendrier
  const goToNextMonth = () => setVisibleMonth(addMonths(visibleMonth, 1));
  const goToPreviousMonth = () => setVisibleMonth(subMonths(visibleMonth, 1));
  const goToCurrentMonth = () => setVisibleMonth(startOfMonth(new Date()));

  // Composant pour un jour qui accepte le drop de tâches
  const DroppableDay = ({ date, tasks, onEditTask, onUpdateTask }: DroppableDayProps) => {
    // Filtrer les tâches pour ce jour
    const dayTasks = tasks.filter((task) =>
      task.dueDate && isSameDay(new Date(task.dueDate), date)
    );

    // Limiter le nombre de tâches affichées sur mobile
    const maxVisibleTasks = isMobile ? 3 : 10;
    const visibleTasks = dayTasks.slice(0, maxVisibleTasks);
    const hiddenTasksCount = dayTasks.length - visibleTasks.length;

    // Configuration du drop
    const [{ isOver, canDrop }, drop] = useDrop({
      accept: ItemTypes.TASK,
      drop: (item: { task: Task }) => {
        onUpdateTask({
          id: item.task.id,
          dueDate: date
        });
      },
      canDrop: () => isAfter(date, new Date()) || isToday(date),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
      })
    });

    return (
      <div
        ref={drop}
        className={cn(
          'h-full min-h-24 p-1 overflow-y-auto',
          isOver && canDrop ? 'bg-green-50 dark:bg-green-900/20' : '',
          isOver && !canDrop ? 'bg-red-50 dark:bg-red-900/20' : '',
          !isSameMonth(date, visibleMonth) && 'opacity-50'
        )}
      >
        <div className="flex flex-col gap-1">
          {visibleTasks.map((item) => (
            <DraggableTask
              key={item.id}
              task={item}
              onEditTask={onEditTask}
              onUpdateTask={onUpdateTask}
              commIndex={undefined}
              stableCommId={undefined}
              uuid={undefined}
            />
          ))}
          {hiddenTasksCount > 0 && (
            <div className="text-xs text-gray-500 mt-1 flex items-center">
              <LayoutIcon size={12} className="mr-1" /> {hiddenTasksCount} autres tâches
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* En-tête du calendrier */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {format(visibleMonth, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grille du calendrier */}
      <div className="flex-1 grid grid-cols-7 overflow-hidden border rounded-lg">
        {/* Jours de la semaine */}
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div key={day} className="p-2 text-center font-medium bg-muted">
            {day}
          </div>
        ))}

        {/* Jours du mois */}
        {displayedWeeks.flatMap((week) =>
          week.map((day, dayIndex) => (
            <div
              key={day.toString()}
              className={cn(
                'border-t border-l p-1 relative',
                dayIndex === 6 && 'border-r', // Ajouter une bordure à droite pour le dimanche
                isToday(day) && 'bg-blue-50 dark:bg-blue-900/20'
              )}
            >
              {/* Date du jour */}
              <div className="text-right text-sm mb-1">
                {format(day, 'd')}
              </div>
              
              {/* Tâches du jour */}
              <DroppableDay
                date={day}
                tasks={tasks}
                onEditTask={onEditTask}
                onUpdateTask={onUpdateTask}
                canDrop={isAfter(day, new Date()) || isToday(day)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
} 