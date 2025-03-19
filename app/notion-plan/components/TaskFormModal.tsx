"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  PlusIcon, 
  TrashIcon, 
  XIcon, 
  CheckIcon,
  UserIcon,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Task, TeamMember, CommunicationDetail } from '../types';
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "../../hooks/useAuth";

// Animation de slide-in pour la fenêtre modale
const slideInAnimation = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
`;

// Fonction pour convertir les statuts si nécessaire
const normalizeStatus = (status: string): Task['status'] => {
  const statusMap: Record<string, Task['status']> = {
    'todo': 'à faire',
    'in-progress': 'en cours',
    'done': 'terminée',
    'idea': 'idée',
    'in_development': 'en développement',
    'to_shoot': 'à tourner',
    'to_edit': 'à éditer',
    'write_caption': 'écrire légende',
    'ready_to_publish': 'prêt à publier',
    'published': 'publié',
    'shelved': 'archivé'
  };
  
  return (statusMap[status as keyof typeof statusMap] || status) as Task['status'];
};

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  onDeleteTask?: (id: string) => void;
  teamMembers: TeamMember[];
}

interface TaskFormData {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  assignedTo: string[];
  dueDate: Date | null;
  reminder: Date | null;
  tags: string[];
  propertyAddress: string;
  dossierNumber: string;
  actionType: Task['actionType'];
  communicationDetails: CommunicationDetail[];
  mandatSigne: boolean;
}

export default function TaskFormModal({
  open,
  onOpenChange,
  task,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  teamMembers
}: TaskFormModalProps) {
  // Vérifier que teamMembers est bien défini et rempli
  console.log("TeamMembers dans TaskFormModal:", teamMembers);
  
  // État initial pour le formulaire
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "à faire",
    priority: task?.priority || "moyenne",
    assignedTo: task?.assignedTo || [],
    dueDate: task?.dueDate || null,
    reminder: task?.reminder || null,
    tags: task?.tags || [],
    propertyAddress: task?.propertyAddress || "",
    dossierNumber: task?.dossierNumber || "",
    actionType: task?.actionType || "autre",
    communicationDetails: task?.communicationDetails || [],
    mandatSigne: task?.mandatSigne === true || false
  });

  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  
  const { user } = useAuth();
  
  // Réinitialisation du formulaire quand le modal s'ouvre ou que la tâche change
  useEffect(() => {
    if (task) {
      console.log("Initialisation du formulaire avec la tâche existante:", task);
      console.log("Statut initial du mandat signé:", task.mandatSigne, typeof task.mandatSigne);
      
      // Vérifier l'existence du champ mandatSigne dans la tâche
      if ('mandatSigne' in task) {
        console.log("Le champ mandatSigne est présent dans la tâche");
      } else {
        console.log("Le champ mandatSigne n'est pas défini dans la tâche");
      }
      
      const normalizedMandatSigne = task.mandatSigne === true;
      console.log("Statut du mandat signé normalisé:", normalizedMandatSigne);
      
      setFormData({
        title: task.title,
        description: task.description || '',
        status: normalizeStatus(task.status),
        priority: task.priority,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate || null,
        reminder: task.reminder || null,
        tags: task.tags,
        propertyAddress: task.propertyAddress || '',
        dossierNumber: task.dossierNumber || '',
        actionType: task.actionType || 'autre',
        communicationDetails: task.communicationDetails || [],
        mandatSigne: normalizedMandatSigne
      });
      
      // Vérifier après la mise à jour que la valeur est correcte
      setTimeout(() => {
        console.log("formData.mandatSigne après initialisation:", formData.mandatSigne);
      }, 0);
    } else {
      resetForm();
    }
  }, [task, open]);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'à faire',
      priority: 'moyenne',
      assignedTo: [],
      dueDate: null,
      reminder: null,
      tags: [],
      propertyAddress: '',
      dossierNumber: '',
      actionType: 'autre',
      communicationDetails: [],
      mandatSigne: false
    });
  };

  // Ajouter un détail de communication
  const addCommunicationDetail = () => {
    // S'assurer que le type est valide
    const validType = ['newsletter', 'panneau', 'flyer', 'carousel', 'video', 'post_site', 'post_linkedin', 'post_instagram', 'autre'].includes(formData.actionType) 
      ? formData.actionType 
      : 'autre';
    
    console.log("Ajout d'un détail de communication avec type:", validType);
    
    setFormData(prev => ({
      ...prev,
      communicationDetails: [
        ...prev.communicationDetails,
        {
          type: validType,
          deadline: prev.dueDate,
          details: "",
          status: prev.status,
          platform: null,
          mediaType: null,
          priority: prev.priority,
          assignedTo: []
        } as CommunicationDetail
      ]
    }));
  };
  
  // Supprimer un détail de communication
  const removeCommunicationDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      communicationDetails: prev.communicationDetails.filter((_, i) => i !== index)
    }));
  };
  
  // Mettre à jour un détail de communication
  const updateCommunicationDetail = (index: number, field: keyof CommunicationDetail, value: any) => {
    setFormData(prev => {
      const updatedDetails = [...prev.communicationDetails];
      updatedDetails[index] = {
        ...updatedDetails[index],
        [field]: value
      };
      return {
        ...prev,
        communicationDetails: updatedDetails
      };
    });
  };

  // Préparer les données du formulaire pour la création/mise à jour
  const prepareTaskData = () => {
    // S'assurer que les tableaux comme tags et assignedTo sont bien définis et normalisés
    const tags = formData.tags || [];
    console.log("Préparation des tags pour mise à jour:", tags);
    
    // Si on est en mode édition, comparer avec les tags existants
    if (task) {
      console.log("Tags actuels de la tâche:", task.tags);
      if (JSON.stringify(tags) !== JSON.stringify(task.tags)) {
        console.log("Différence détectée dans les tags");
      }
    }
    
    // Normaliser explicitement le booléen
    const mandatSigne = formData.mandatSigne === true;
    console.log("État mandatSigne normalisé pour envoi:", mandatSigne);

    return {
      title: formData.title,
      description: formData.description || "",
      status: formData.status,
      priority: formData.priority,
      assignedTo: formData.assignedTo || [],
      dueDate: formData.dueDate,
      reminder: formData.reminder,
      tags: tags, // Utiliser la variable normalisée
      propertyAddress: formData.propertyAddress || "",
      dossierNumber: formData.dossierNumber || "",
      actionType: formData.actionType,
      communicationDetails: formData.communicationDetails.map(comm => ({
        ...comm,
        // Normaliser les valeurs pour éviter les undefined
        type: comm.type || "autre",
        status: comm.status || "à faire",
        assignedTo: comm.assignedTo || [],
        priority: comm.priority || "moyenne"
      })),
      mandatSigne: mandatSigne,
      createdBy: user?.email || "" // Ajouter le champ manquant
    };
  };

  // Mettre à jour la partie qui gère l'envoi de notifications après l'assignation de tâches
  // Améliorer pour gérer le mode local si FCM échoue
  const sendNotificationAfterAssignment = async (
    assigneeEmail: string, 
    taskTitle: string, 
    taskId: string, 
    userEmail: string | null | undefined
  ) => {
    if (!userEmail) {
      console.error('Email de l\'utilisateur non disponible, impossible d\'envoyer la notification');
      return;
    }
    
    try {
      // Extraire le nom du consultant à partir de l'email
      const consultantName = assigneeEmail.split('@')[0] || assigneeEmail;
      
      // L'ID de notification est l'email de l'utilisateur connecté + le consultant
      const notificationId = `${userEmail}_${consultantName}`;
      
      // Données de la notification
      const notificationData = {
        userId: notificationId,
        title: '📋 Nouvelle tâche assignée',
        body: `${consultantName}, une nouvelle tâche "${taskTitle}" vous a été assignée.`,
        taskId,
        type: 'task_assigned',
      };
      
      console.log(`Envoi d'une notification à ${userEmail} concernant ${consultantName} pour la tâche assignée.`);
      
      // Envoyer la notification via l'API
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Résultat de l\'envoi de notification:', result);
      
      // Vérifier si le serveur suggère d'utiliser le mode local
      if (result.useLocalMode && typeof window !== 'undefined') {
        console.log('Mode local suggéré par le serveur, tentative directe...');
        const { sendLocalNotification } = await import('../../services/notificationService');
        
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
    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification:', error);
      
      // Essayer le mode local en cas d'échec
      try {
        console.log('Tentative d\'envoi en mode local après échec...');
        
        // Extraire le nom du consultant à partir de l'email
        const consultantName = assigneeEmail.split('@')[0] || assigneeEmail;
        
        // Importer les fonctions nécessaires
        const { sendLocalNotification, createNotification } = await import('../../services/notificationService');
        
        // Construire l'ID de notification et les données
        const notificationId = `${userEmail}_${consultantName}`;
        
        // Enregistrer dans Firestore
        await createNotification({
          userId: notificationId,
          title: '📋 Nouvelle tâche assignée',
          body: `${consultantName}, une nouvelle tâche "${taskTitle}" vous a été assignée.`,
          type: 'task_assigned',
          taskId,
          read: false
        });
        
        // Envoyer notification locale
        await sendLocalNotification({
          title: '📋 Nouvelle tâche assignée',
          body: `${consultantName}, une nouvelle tâche "${taskTitle}" vous a été assignée.`,
          data: { 
            taskId, 
            type: 'task_assigned',
            userId: notificationId
          }
        });
      } catch (localError) {
        console.error('Échec également du mode local:', localError);
      }
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async () => {
    const taskData = prepareTaskData();
    console.log("Données de tâche préparées pour soumission:", taskData);
    console.log("mandatSigne est :", taskData.mandatSigne, "de type:", typeof taskData.mandatSigne);
    
    if (task) {
      console.log("Mise à jour de la tâche ID:", task.id);
      
      // Vérifier les différences entre les données actuelles et les nouvelles données
      const differences = {};
      Object.keys(taskData).forEach(key => {
        // @ts-ignore
        if (JSON.stringify(taskData[key]) !== JSON.stringify(task[key])) {
          // @ts-ignore
          differences[key] = {
            // @ts-ignore
            avant: task[key],
            // @ts-ignore
            après: taskData[key]
          };
        }
      });
      console.log("Différences détectées pour la mise à jour:", differences);
      
      // Vérifier si de nouveaux utilisateurs ont été assignés
      const newAssignees = taskData.assignedTo.filter(
        (email: string) => !task.assignedTo.includes(email)
      );
      
      // Mettre à jour la tâche
      await onUpdateTask({
        id: task.id,
        ...taskData,
      });
      
      // Envoyer des notifications aux nouveaux assignés, mais à l'utilisateur connecté
      if (newAssignees.length > 0 && user?.email) {
        console.log("Envoi de notifications pour les nouveaux assignés:", newAssignees);
        
        // Pour chaque nouvel assigné, envoyer une notification à l'utilisateur connecté
        for (const assigneeEmail of newAssignees) {
          await sendNotificationAfterAssignment(
            assigneeEmail,
            taskData.title,
            task.id,
            user.email
          );
        }
      }
    } else {
      // Créer une nouvelle tâche
      const createdTask = await onCreateTask(taskData);
      
      // Si la tâche a été créée avec succès et a des assignés, envoyer des notifications
      if (createdTask && taskData.assignedTo.length > 0 && user?.email) {
        console.log("Envoi de notifications pour les assignés de la nouvelle tâche:", taskData.assignedTo);
        
        // Pour chaque assigné, envoyer une notification à l'utilisateur connecté
        for (const assigneeEmail of taskData.assignedTo) {
          await sendNotificationAfterAssignment(
            assigneeEmail,
            taskData.title,
            createdTask.id,
            user.email
          );
        }
      }
    }
    
    onOpenChange(false);
  };

  // Gérer la suppression d'une tâche
  const handleDelete = async () => {
    if (task && onDeleteTask) {
      await onDeleteTask(task.id);
      onOpenChange(false);
    }
  };

  // Obtenir le libellé du type d'action
  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
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
    return labels[type] || type;
  };

  // Obtenir la couleur du type d'action pour les badges
  const getActionTypeBadgeColor = (type: string) => {
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

  // Obtenir le libellé de la priorité
  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      'faible': 'Faible',
      'moyenne': 'Moyenne',
      'élevée': 'Élevée',
      'urgente': 'Urgente'
    };
    return labels[priority] || priority;
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'à faire': 'À faire',
      'en cours': 'En cours',
      'terminée': 'Terminée',
      'idée': 'Idée',
      'en développement': 'En développement',
      'à tourner': 'À tourner',
      'à éditer': 'À éditer',
      'écrire légende': 'Écrire légende',
      'prêt à publier': 'Prêt à publier',
      'publié': 'Publié',
      'archivé': 'Archivé'
    };
    return labels[status] || status;
  };

  // Obtenir le nom du membre assigné
  const getAssigneeName = (email: string) => {
    const member = teamMembers.find((m) => m.email === email);
    return member ? member.name : email;
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status: Task['status']) => {
    const colors: Record<string, string> = {
      'idée': 'bg-purple-500',
      'en développement': 'bg-indigo-500',
      'à faire': 'bg-yellow-500',
      'en cours': 'bg-blue-500',
      'à tourner': 'bg-orange-500',
      'à éditer': 'bg-pink-500',
      'écrire légende': 'bg-cyan-500',
      'prêt à publier': 'bg-teal-500',
      'publié': 'bg-green-500',
      'archivé': 'bg-gray-500',
      'terminée': 'bg-green-600',
      'todo': 'bg-yellow-500',
      'in-progress': 'bg-blue-500',
      'done': 'bg-green-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const [tagInput, setTagInput] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      modal={true}
    >
      <DialogContent
        className="p-0 border-0 max-w-[600px] w-[600px] h-screen rounded-none fixed top-0 right-0 bottom-0 left-auto m-0"
        style={{
          animation: 'slideIn 0.3s ease-out forwards',
          transform: 'translateX(0)',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.1)'
        }}
      >
        <style jsx global>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          
          /* Styles pour garantir que les menus déroulants s'affichent correctement */
          .select-content {
            z-index: 9999 !important;
          }
          
          [data-radix-popper-content-wrapper] {
            z-index: 9999 !important;
          }
          
          .popover-content {
            z-index: 9999 !important;
          }
        `}</style>
        <div className={`h-full overflow-y-auto p-6 ${isDarkMode ? 'bg-gray-900 text-white border-l border-gray-700' : 'bg-white text-black border-l border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} 
                placeholder="Titre de la tâche"
                className="text-2xl font-bold border-none focus-visible:ring-0 px-0 h-auto"
              />
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Aperçu de la tâche */}
            <div className={`p-4 rounded-md border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center flex-wrap gap-2">
                  <Badge className={getStatusColor(formData.status)}>
                    {getStatusLabel(formData.status)}
                  </Badge>
                  {formData.communicationDetails.map((detail, index) => (
                    <Badge key={`${detail.type}-${index}`} className={getActionTypeBadgeColor(detail.type)}>
                      {getActionTypeLabel(detail.type)}
                    </Badge>
                  ))}
                </div>
                
                <h3 className="text-lg font-semibold">{formData.title || "Titre de la tâche"}</h3>
                
                {formData.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{formData.description}</p>
                )}
                
                {formData.dueDate && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4" />
                    {format(formData.dueDate, "dd MMM yyyy", { locale: fr })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Formulaire */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: Task['status']) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue>{getStatusLabel(formData.status)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idée">Idée</SelectItem>
                    <SelectItem value="en développement">En Développement</SelectItem>
                    <SelectItem value="à faire">À faire</SelectItem>
                    <SelectItem value="en cours">En cours</SelectItem>
                    <SelectItem value="à tourner">À Tourner</SelectItem>
                    <SelectItem value="à éditer">À Éditer</SelectItem>
                    <SelectItem value="écrire légende">Écrire Légende</SelectItem>
                    <SelectItem value="prêt à publier">Prêt à Publier</SelectItem>
                    <SelectItem value="publié">Publié</SelectItem>
                    <SelectItem value="archivé">Archivé</SelectItem>
                    <SelectItem value="terminée">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: Task['priority']) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue>{getPriorityLabel(formData.priority)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="élevée">Élevée</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="mandatSigne" 
                    checked={formData.mandatSigne} 
                    onCheckedChange={(checked) => {
                      console.log("État de la checkbox mandatSigne changé à:", checked);
                      const newValue = checked === true;
                      console.log("Nouvelle valeur de mandatSigne:", newValue);
                      setFormData(prev => ({
                        ...prev, 
                        mandatSigne: newValue
                      }));
                    }}
                  />
                  <Label 
                    htmlFor="mandatSigne" 
                    className="font-medium cursor-pointer"
                  >
                    Mandat signé
                  </Label>
                </div>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Numéro logi-pro</Label>
                <Input 
                  value={formData.dossierNumber} 
                  onChange={(e) => setFormData(prev => ({ ...prev, dossierNumber: e.target.value }))} 
                  placeholder="Ex: 1213141"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Assigné à</Label>
                <Select onValueChange={(value) => {
                  if (!value) return;
                  
                  const currentAssignees = formData.assignedTo || [];
                  if (!currentAssignees.includes(value)) {
                    setFormData(prev => ({
                      ...prev,
                      assignedTo: [...prev.assignedTo, value]
                    }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un consultant" />
                  </SelectTrigger>
                  <SelectContent 
                    className="max-h-[200px] overflow-y-auto"
                    position="popper"
                    sideOffset={5}
                    align="start"
                    side="bottom"
                    style={{ zIndex: 9999 }}
                  >
                    {teamMembers && teamMembers.length > 0 ? (
                      // Dédupliquer la liste par email
                      [...new Map(teamMembers.map(member => [member.email, member])).values()].map(member => (
                        <SelectItem key={member.email} value={member.email}>
                          {member.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-consultants" disabled>
                        Aucun consultant disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.assignedTo.map(email => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {getAssigneeName(email)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            assignedTo: prev.assignedTo.filter(e => e !== email)
                          }));
                        }}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                  placeholder="Ajouter une description..."
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input 
                    value={tagInput || ""}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ajouter un tag"
                    className="flex-grow"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput && tagInput.trim()) {
                        setFormData(prev => ({
                          ...prev, 
                          tags: [...prev.tags, tagInput.trim()]
                        }));
                        setTagInput('');
                      }
                    }}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            tags: prev.tags.filter((_, i) => i !== idx)
                          }));
                        }}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Section communications */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label className="text-lg">Types de communication</Label>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={addCommunicationDetail}
                  disabled={!formData.mandatSigne}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Ajouter un type
                </Button>
              </div>
              
              {!formData.mandatSigne ? (
                <div className="text-sm text-amber-600 italic py-2">
                  Vous devez d'abord cocher "Mandat signé" pour ajouter des types de communication.
                </div>
              ) : formData.communicationDetails.length === 0 ? (
                <div className="text-sm text-gray-500 italic py-2">
                  Ajoutez des types de communication spécifiques avec leurs propres échéances et détails.
                </div>
              ) : null}
              
              {formData.communicationDetails.length > 0 && (
                <div className="space-y-6">
                  {formData.communicationDetails.map((detail, index) => (
                    <div key={index} className={`border rounded-md p-4 relative ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCommunicationDetail(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={detail.type}
                            onValueChange={(value) => updateCommunicationDetail(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="newsletter">Newsletter</SelectItem>
                              <SelectItem value="panneau">Panneau</SelectItem>
                              <SelectItem value="flyer">Flyer</SelectItem>
                              <SelectItem value="post_site">Post site</SelectItem>
                              <SelectItem value="post_linkedin">Post LinkedIn</SelectItem>
                              <SelectItem value="post_instagram">Post Instagram</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Statut</Label>
                          <Select
                            value={detail.status}
                            onValueChange={(value) => updateCommunicationDetail(index, 'status', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="idée">Idée</SelectItem>
                              <SelectItem value="à faire">À faire</SelectItem>
                              <SelectItem value="en cours">En cours</SelectItem>
                              <SelectItem value="terminée">Terminée</SelectItem>
                              <SelectItem value="en développement">En développement</SelectItem>
                              <SelectItem value="à tourner">À tourner</SelectItem>
                              <SelectItem value="à éditer">À éditer</SelectItem>
                              <SelectItem value="écrire légende">Écrire légende</SelectItem>
                              <SelectItem value="prêt à publier">Prêt à publier</SelectItem>
                              <SelectItem value="publié">Publié</SelectItem>
                              <SelectItem value="archivé">Archivé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Priorité</Label>
                          <Select 
                            value={detail.priority || "moyenne"} 
                            onValueChange={(value) => updateCommunicationDetail(index, 'priority', value)}
                          >
                            <SelectTrigger>
                              <SelectValue>{getPriorityLabel(detail.priority || "moyenne")}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="faible">Faible</SelectItem>
                              <SelectItem value="moyenne">Moyenne</SelectItem>
                              <SelectItem value="élevée">Élevée</SelectItem>
                              <SelectItem value="urgente">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Date d'échéance</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {detail.deadline instanceof Date ? 
                                  format(detail.deadline, "dd MMMM yyyy", { locale: fr }) : 
                                  "Sélectionner une date"
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={detail.deadline instanceof Date ? detail.deadline : undefined}
                                onSelect={(date) => updateCommunicationDetail(index, 'deadline', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="col-span-2 space-y-2">
                          <Label>Assigné à</Label>
                          <Select onValueChange={(value) => {
                            if (!value) return;
                            
                            const currentAssignees = detail.assignedTo || [];
                            if (!currentAssignees.includes(value)) {
                              updateCommunicationDetail(index, 'assignedTo', [...currentAssignees, value]);
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un consultant" />
                            </SelectTrigger>
                            <SelectContent 
                              className="max-h-[200px] overflow-y-auto"
                              position="popper"
                              sideOffset={5}
                              align="start"
                              side="bottom"
                              style={{ zIndex: 9999 }}
                            >
                              {teamMembers && teamMembers.length > 0 ? (
                                // Dédupliquer la liste par email
                                [...new Map(teamMembers.map(member => [member.email, member])).values()].map(member => (
                                  <SelectItem key={member.email} value={member.email}>
                                    {member.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-consultants" disabled>
                                  Aucun consultant disponible
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(detail.assignedTo || []).map(email => (
                              <Badge key={email} variant="secondary" className="flex items-center gap-1">
                                {getAssigneeName(email)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => {
                                    const updatedAssignees = (detail.assignedTo || []).filter(e => e !== email);
                                    updateCommunicationDetail(index, 'assignedTo', updatedAssignees);
                                  }}
                                >
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Plateforme</Label>
                          <Select
                            value={detail.platform || "non-applicable"}
                            onValueChange={(value) => updateCommunicationDetail(index, 'platform', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une plateforme" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="non-applicable">Non applicable</SelectItem>
                              <SelectItem value="site">Site web</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Type de média</Label>
                          <Select
                            value={detail.mediaType || "non-applicable"}
                            onValueChange={(value) => updateCommunicationDetail(index, 'mediaType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type de média" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="non-applicable">Non applicable</SelectItem>
                              <SelectItem value="photo">Photo</SelectItem>
                              <SelectItem value="video">Vidéo</SelectItem>
                              <SelectItem value="carousel">Carousel</SelectItem>
                              <SelectItem value="texte">Texte</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-2 space-y-2">
                          <Label>Détails spécifiques</Label>
                          <Textarea
                            value={detail.details || ""}
                            onChange={(e) => updateCommunicationDetail(index, 'details', e.target.value)}
                            placeholder="Détails spécifiques à ce type de communication..."
                            className="min-h-[60px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between gap-2 mt-6 mb-4">
            {task && onDeleteTask && (
              <Button 
                type="button" 
                variant="destructive"
                onClick={handleDelete}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button 
                type="button" 
                onClick={handleSubmit}
                className="bg-[#DC0032] hover:bg-[#DC0032]/90 text-white"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                {task ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}