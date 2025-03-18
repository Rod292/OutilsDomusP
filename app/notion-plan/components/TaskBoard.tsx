"use client";

import React, { useState } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task } from '../types';

interface TaskBoardProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export default function TaskBoard({ tasks, onEditTask, onUpdateTask, onDeleteTask }: TaskBoardProps) {
  const statusColumns = [
    { id: 'à faire', title: 'À faire', color: 'bg-gray-100' },
    { id: 'en cours', title: 'En cours', color: 'bg-blue-50' },
    { id: 'terminée', title: 'Terminée', color: 'bg-green-50' },
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'faible':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Faible</Badge>;
      case 'moyenne':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Moyenne</Badge>;
      case 'élevée':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">Élevée</Badge>;
      case 'urgente':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Urgente</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Non définie';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getActionTypeLabel = (actionType: string) => {
    const actionLabels: Record<string, string> = {
      'newsletter': 'Newsletter',
      'panneau': 'Panneau',
      'flyer': 'Flyer',
      'carousel': 'Carousel',
      'video': 'Vidéo',
      'post_site': 'Post Site Web',
      'post_linkedin': 'Post LinkedIn',
      'post_instagram': 'Post Instagram',
      'autre': 'Autre'
    };
    return actionLabels[actionType] || actionType;
  };

  const getPlatformLabel = (platform: string | null | undefined) => {
    if (!platform) return '';
    
    const platformLabels: Record<string, string> = {
      'site': 'Site Web',
      'linkedin': 'LinkedIn',
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'tiktok': 'TikTok',
      'youtube': 'YouTube',
      'autre': 'Autre'
    };
    return platformLabels[platform] || platform;
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    // Si la tâche est déplacée vers une nouvelle colonne
    if (result.source.droppableId !== newStatus) {
      await onUpdateTask({
        id: draggableId,
        status: newStatus as 'à faire' | 'en cours' | 'terminée'
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statusColumns.map((column) => (
          <div key={column.id} className={`rounded-lg ${column.color} p-4`}>
            <h3 className="text-lg font-medium mb-4">{column.title}</h3>
            
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-3 min-h-[200px]"
                >
                  {getTasksByStatus(column.id).map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white border shadow-sm"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-base font-medium text-gray-900">{task.title}</h4>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontalIcon className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onEditTask(task)}>
                                    <PencilIcon className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => onDeleteTask(task.id)}
                                  >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {/* Informations immobilières */}
                            {(task.propertyAddress || task.dossierNumber) && (
                              <div className="mb-2 text-sm">
                                {task.dossierNumber && (
                                  <p className="text-gray-700 font-medium">N° Logi-pro: {task.dossierNumber}</p>
                                )}
                                {task.propertyAddress && (
                                  <p className="text-gray-700">{task.propertyAddress}</p>
                                )}
                              </div>
                            )}
                            
                            {/* Type d'action */}
                            <div className="mb-2">
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                {getActionTypeLabel(task.actionType)}
                              </Badge>
                              {task.platform && (
                                <Badge className="ml-1 bg-purple-100 text-purple-800 border-purple-200">
                                  {getPlatformLabel(task.platform)}
                                </Badge>
                              )}
                              {task.mediaType && (
                                <Badge className="ml-1 bg-green-100 text-green-800 border-green-200">
                                  {task.mediaType}
                                </Badge>
                              )}
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {getPriorityBadge(task.priority)}
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="bg-gray-50">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                              <span>
                                {task.assignedTo.length > 0 
                                  ? `Assigné à: ${task.assignedTo.join(', ')}` 
                                  : 'Non assigné'}
                              </span>
                              {task.dueDate && (
                                <span>Échéance: {formatDate(task.dueDate)}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
} 