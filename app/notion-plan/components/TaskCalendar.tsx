"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, ImageIcon, VideoIcon, FileTextIcon } from 'lucide-react';
import { Task, CommunicationDetail } from '../types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  // Récupérer les détails de la communication si disponible
  const commDetails = commIndex !== undefined && task.communicationDetails && task.communicationDetails.length > 0 
    ? task.communicationDetails[0] // Dans le calendrier, chaque tâche n'a qu'une seule communication (voir prepareTasksForDisplay)
    : null;
  
  // Récupérer le type de communication
  const commType = commDetails?.type || null;
  
  // IMPORTANT: Utiliser l'UUID passé par le parent qui est déjà correct
  // plutôt que d'en générer un nouveau qui pourrait être différent
  const communicationUUID = uuid || '';
  
  // Log pour déboguer
  console.log(`Préparation drag: élément avec UUID: ${communicationUUID}, type: ${commType}, index: ${commIndex}`);
  
  // Créer un objet avec toutes les données nécessaires pour identifier correctement la communication
  const dragItem = {
    id: task.id,
    commIndex,
    commType,
    stableCommId: communicationUUID,
    uniqueId: `${task.id}-${communicationUUID}-${Date.now()}`,
    propertyAddress: task.propertyAddress,
    dossierNumber: task.dossierNumber,
    currentDate: commDetails?.deadline ? new Date(commDetails.deadline).toISOString() : null,
    uuid: communicationUUID  // Utiliser l'UUID fourni
  };
  
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
          {task.communicationDetails.map((comm: CommunicationDetail, idx: number) => (
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

  // Cette fonction prépare les tâches pour l'affichage, en créant des tâches
  // distinctes pour chaque communication qui correspond à cette date
  const prepareTasksForDisplay = () => {
    // Structure de données qui stocke à la fois la tâche et l'index de communication
    interface DisplayTask {
      task: Task;
      commIndex?: number;
      stableCommId?: string;  // Identifiant stable pour la communication
      uuid?: string;          // UUID unique pour cette communication
    }
    
    const displayTasks: DisplayTask[] = [];
    
    // Log pour déboguer la préparation des tâches
    console.log(`[SYNC DEBUG] Préparation de l'affichage pour la date: ${date.toLocaleDateString()}, nombre de tâches: ${tasks.length}`);
    
    tasks.forEach(task => {
      // Log pour déboguer chaque tâche
      if (task.communicationDetails && task.communicationDetails.length > 0) {
        console.log(`[SYNC DEBUG] Tâche ${task.id} - ${task.title} a ${task.communicationDetails.length} communications:`, 
          task.communicationDetails.map(c => ({
            type: c.type,
            date: c.deadline ? new Date(c.deadline).toLocaleDateString() : 'sans date',
            status: c.status
          }))
        );
      }
      
      // Cas 1: Tâche sans communications mais avec une date principale qui correspond
      if (task.dueDate) {
        const taskDate = new Date(task.dueDate);
        
        // S'assurer que la comparaison de date est faite correctement avec setHours(0,0,0,0)
        const normalizedTaskDate = new Date(taskDate);
        normalizedTaskDate.setHours(0, 0, 0, 0);
        
        const normalizedCellDate = new Date(date);
        normalizedCellDate.setHours(0, 0, 0, 0);
        
        const sameDate = normalizedTaskDate.getTime() === normalizedCellDate.getTime();
        
        if (sameDate && (!task.communicationDetails || task.communicationDetails.length === 0)) {
          // Log de débogage
          console.log(`[SYNC DEBUG] Affichage de la tâche principale ${task.id} à la date ${normalizedTaskDate.toLocaleDateString()}`);
          
          // Créer une copie distincte de la tâche pour éviter tout effet de bord
          displayTasks.push({ 
            task: JSON.parse(JSON.stringify(task)) 
          });
        }
      }
      
      // Cas 2: Tâche avec des communications - créer une tâche distincte pour chaque communication prévue à cette date
      if (task.communicationDetails && task.communicationDetails.length > 0) {
        // Pour chaque communication, vérifier si elle est prévue pour cette date
        task.communicationDetails.forEach((comm: any, arrayIndex: number) => {
          // Utiliser l'index d'origine s'il est défini, sinon utiliser l'index courant dans le tableau
          const commIndex = comm.originalIndex !== undefined ? comm.originalIndex : arrayIndex;
          
          if (comm.deadline) {
            // S'assurer que deadline est une date JavaScript
            const commDate = comm.deadline instanceof Date ? 
              comm.deadline : 
              new Date(comm.deadline);
              
            // Normaliser la date pour comparaison (ignorer l'heure)
            const normalizedCommDate = new Date(commDate);
            normalizedCommDate.setHours(0, 0, 0, 0);
            
            const normalizedCellDate = new Date(date);
            normalizedCellDate.setHours(0, 0, 0, 0);
            
            // Si la date correspond à la date de la cellule
            if (normalizedCommDate.getTime() === normalizedCellDate.getTime()) {
              // Générer ou récupérer l'UUID pour cette communication
              const communicationUUID = getOrCreateCommunicationUUID(task.id, comm.type, commIndex);
              
              // Log pour faciliter le débogage
              console.log(`[SYNC DEBUG] Préparation de l'affichage pour la communication ${commIndex} (${comm.type}) avec UUID: ${communicationUUID} et date: ${normalizedCommDate.toLocaleDateString()}`);
              
              // IMPORTANT: Créer une copie complètement isolée de la tâche
              // avec SEULEMENT cette communication spécifique
              const taskCopy = {
                ...JSON.parse(JSON.stringify(task)),
                // Remplacer complètement le tableau communicationDetails avec uniquement cette communication
                // mais en gardant aussi l'index original pour référence
                communicationDetails: [
                  {
                    ...JSON.parse(JSON.stringify(comm)),
                    // S'assurer que l'index original est bien préservé
                    originalIndex: commIndex
                  }
                ]
              };

              // Effacer les propriétés qui pourraient causer des confusions
              delete taskCopy.dueDate; // Éviter toute confusion avec la date principale
              
              // Stocker l'index original de la communication dans la tâche parente pour le drag and drop
              // ET l'identifiant stable pour une meilleure robustesse
              displayTasks.push({ 
                task: taskCopy, 
                commIndex,
                stableCommId: communicationUUID, // Pour la compatibilité
                uuid: communicationUUID        // L'UUID est maintenant l'identifiant principal
              });
            } else {
              // Log pour déboguer les communications qui ne correspondent pas à cette date
              console.log(`[SYNC DEBUG] Communication ignorée pour la date ${normalizedCellDate.toLocaleDateString()}: Communication ${commIndex} (${comm.type}) - date: ${normalizedCommDate.toLocaleDateString()}`);
            }
          } else {
            console.log(`[SYNC DEBUG] Communication sans date ignorée: ${commIndex} (${comm.type})`);
          }
        });
      }
    });

    // Log pour déboguer le résultat final
    console.log(`[SYNC DEBUG] Pour la date ${date.toLocaleDateString()}, nombre d'éléments affichés: ${displayTasks.length}`);
    
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
            key={`${item.task.id}-${item.uuid || 'main'}-${index}`}
            task={item.task}
            onEditTask={onEditTask}
            onUpdateTask={onUpdateTask}
            commIndex={item.commIndex}
            stableCommId={item.stableCommId}
            uuid={item.uuid}  // Passer l'UUID explicitement au composant enfant
          />
        ))}
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

export default function TaskCalendar({ tasks, onEditTask, onUpdateTask }: TaskCalendarProps) {
  // Initialiser le système de suivi des communications déplacées
  if (typeof window !== 'undefined') {
    // Créer un registre pour les identifiants permanents si nécessaire
    if (!(window as any).movedCommunications) {
      console.log("Initialisation du système de suivi des communications...");
      (window as any).movedCommunications = {};
    }
    
    // Créer un registre pour les communications déplacées récemment
    if (!(window as any).lastMovedCommunications) {
      console.log("Initialisation du système de suivi des déplacements récents...");
      (window as any).lastMovedCommunications = [];
    }
    
    // Créer un identifiant unique pour chaque communication basé sur son contenu
    if (!(window as any).communicationUUIDs) {
      console.log("Initialisation du système d'identifiants uniques des communications...");
      (window as any).communicationUUIDs = {};
    }
  }
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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
    // Vérifier si le filtre des tâches assignées est actif
    const isAssignedFilterActive = window.location.search.includes('assignedFilter=true');
    
    // Si le filtre des tâches assignées n'est pas actif, montrer toutes les tâches
    if (!isAssignedFilterActive) return tasks;
    
    // Si pas de consultant sélectionné, retourner toutes les tâches
    if (!consultant) return tasks;
    
    // Convertir le nom du consultant en email pour la correspondance
    const consultantEmail = getConsultantEmail(consultant);
    if (!consultantEmail) return tasks;
    
    // Filtrer pour ne montrer que les communications assignées au consultant
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

  // Filtrer les tâches effectives avec les mêmes règles que filteredTasks
  const effectiveFilteredTasks = React.useMemo(() => {
    // Vérifier si le filtre des tâches assignées est actif
    const isAssignedFilterActive = window.location.search.includes('assignedFilter=true');
    
    // Si le filtre des tâches assignées n'est pas actif, montrer toutes les tâches
    if (!isAssignedFilterActive) return filteredTasks;
    
    // Si pas de consultant sélectionné, retourner toutes les tâches
    if (!consultant) return filteredTasks;
    
    // Convertir le nom du consultant en email pour la correspondance
    const consultantEmail = getConsultantEmail(consultant);
    if (!consultantEmail) return filteredTasks;
    
    // Filtrer pour ne montrer que les communications assignées au consultant
    return filteredTasks.map(task => {
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
  }, [filteredTasks, consultant]);

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

  // Ajouter un état local pour stocker les données les plus récentes
  const [latestTasks, setLatestTasks] = useState<Task[]>(tasks);
  const [forceRefresh, setForceRefresh] = useState<number>(0);
  
  // Utiliser les tâches les plus récentes pour le rendu
  const effectiveTasks = useMemo(() => {
    return latestTasks;
  }, [latestTasks, forceRefresh]);
  
  // Ajouter un écouteur d'événement pour les mises à jour de tâches initiales
  useEffect(() => {
    // Mettre à jour l'état local avec les props initiales
    setLatestTasks(tasks);
  }, [tasks]);
  
  // Ajouter un écouteur d'événement pour les mises à jour de tâches
  useEffect(() => {
    const handleTasksUpdated = (event: CustomEvent) => {
      console.log("Événement tasksUpdated reçu dans TaskCalendar");
      // Rafraîchir l'affichage du calendrier lorsque des tâches sont mises à jour
      const updatedTasks = event.detail.tasks;
      console.log("Tâches mises à jour reçues:", updatedTasks.length);
      
      // Log détaillé pour le débogage
      console.log(`[SYNC DEBUG] Événement tasksUpdated reçu à ${new Date().toLocaleTimeString()}`);
      console.log(`[SYNC DEBUG] ${updatedTasks.length} tâches reçues`);
      
      // Rechercher et logger les tâches avec des communications ayant des dates
      const tasksWithDates = updatedTasks.filter(
        (t: Task) => t.communicationDetails && t.communicationDetails.some(
          (c: any) => c.deadline
        )
      );
      
      console.log(`[SYNC DEBUG] ${tasksWithDates.length} tâches ont des communications avec dates`);
      
      tasksWithDates.forEach((task: Task) => {
        if (task.communicationDetails) {
          console.log(`[SYNC DEBUG] Tâche ${task.id} - ${task.title} a des communications avec dates:`);
          task.communicationDetails.forEach((comm: any, idx: number) => {
            if (comm.deadline) {
              const dateStr = comm.deadline instanceof Date 
                ? comm.deadline.toLocaleDateString() 
                : new Date(comm.deadline).toLocaleDateString();
              console.log(`[SYNC DEBUG] - Comm ${idx}: ${comm.type}, date: ${dateStr}, statut: ${comm.status || 'non défini'}`);
            }
          });
        }
      });
      
      // Mise à jour de l'état local avec les nouvelles données
      setLatestTasks(updatedTasks);
      
      // Forcer un rafraîchissement du composant
      setForceRefresh(prev => prev + 1);
      console.log("Calendrier rafraîchi avec les dernières données");
    };

    // Typer correctement l'événement pour TypeScript
    window.addEventListener('tasksUpdated', handleTasksUpdated as EventListener);

    // Nettoyer l'écouteur à la destruction du composant
    return () => {
      window.removeEventListener('tasksUpdated', handleTasksUpdated as EventListener);
    };
  }, []); // Pas de dépendance car on veut juste savoir quand des tâches sont mises à jour

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
                  key={`${index}-${forceRefresh}`}
                  className={`border-b border-r p-1 ${
                    isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <DroppableDay
                    date={day}
                    tasks={effectiveFilteredTasks}
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