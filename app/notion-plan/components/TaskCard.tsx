import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, UserIcon, FileTextIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Task } from '../types';
import TaskNotificationButton from './TaskNotificationButton';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isDarkMode?: boolean;
}

// Fonction pour obtenir la couleur du badge de statut
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'idée': 'bg-gray-500',
    'à faire': 'bg-blue-500',
    'en cours': 'bg-amber-500',
    'terminé': 'bg-green-500',
    'en attente': 'bg-purple-500',
    'annulé': 'bg-red-500',
    'en développement': 'bg-indigo-500',
    'à tourner': 'bg-amber-600',
    'à éditer': 'bg-orange-500',
    'écrire légende': 'bg-teal-500',
    'prêt à publier': 'bg-emerald-500',
    'publié': 'bg-green-600',
    'archivé': 'bg-gray-600'
  };
  return colors[status] || 'bg-gray-500';
};

// Fonction pour obtenir la couleur du type d'action
const getActionTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'newsletter': 'bg-purple-500',
    'panneau': 'bg-blue-500',
    'flyer': 'bg-green-500',
    'carousel': 'bg-yellow-500',
    'video': 'bg-red-500',
    'post_site': 'bg-indigo-500',
    'post_linkedin': 'bg-sky-500',
    'post_instagram': 'bg-pink-500',
    'autre': 'bg-gray-500'
  };
  return colors[type] || 'bg-gray-500';
};

// Fonction pour obtenir le libellé du type d'action
const getActionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'newsletter': 'Newsletter',
    'panneau': 'Panneau',
    'panneau à coller': 'Panneau à coller',
    'flyer': 'Flyer',
    'carousel': 'Carousel',
    'video': 'Vidéo',
    'post_site': 'Post site',
    'post_linkedin': 'Post LinkedIn',
    'post_instagram': 'Post Instagram',
    'autre': 'Autre'
  };
  return labels[type] || type;
};

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onClick, 
  onDragStart,
  isDarkMode = false
}) => {
  // Extraire le nom du consultant assigné (sans le domaine email)
  const getConsultantName = (email: string) => {
    return email.split('@')[0];
  };

  // Empêcher la propagation du clic sur le bouton de notification
  const handleNotificationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`${
        isDarkMode ? 'bg-[#2d2d2d] hover:bg-[#383838] border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'
      } p-4 rounded-lg border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-wrap gap-2">
            {task.status && (
              <Badge className={`${getStatusColor(task.status)} text-white px-2 py-0.5`}>
                {task.status}
              </Badge>
            )}
            {task.actionType && (
              <Badge className={`${getActionTypeColor(task.actionType)} text-white px-2 py-0.5`}>
                {getActionTypeLabel(task.actionType)}
              </Badge>
            )}
            {task.platform && (
              <Badge variant="outline" className={`${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-400 text-gray-700'} px-2 py-0.5`}>
                {task.platform}
              </Badge>
            )}
          </div>
        </div>
        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{task.title}</h3>
        {task.description && (
          <p className={`text-sm line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{task.description}</p>
        )}
        
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className={`text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'}`}>
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className={`flex items-center justify-between flex-wrap gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex items-center flex-wrap gap-3">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(task.dueDate), "dd MMM yyyy", { locale: fr })}
              </div>
            )}
            {task.assignedTo && task.assignedTo.length > 0 && (
              <div className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {task.assignedTo.length > 1 
                  ? `${task.assignedTo.length} personnes` 
                  : getConsultantName(task.assignedTo[0])}
              </div>
            )}
            {task.dossierNumber && (
              <div className="flex items-center gap-1">
                <FileTextIcon className="h-3 w-3" />
                {task.dossierNumber}
              </div>
            )}
          </div>
          
          {/* Bouton de notification pour la première personne assignée */}
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div onClick={handleNotificationClick}>
              <TaskNotificationButton 
                consultantName={getConsultantName(task.assignedTo[0])} 
                size="icon"
                className={`h-6 w-6 p-0 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard; 