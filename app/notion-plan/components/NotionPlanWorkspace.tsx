"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc, serverTimestamp, orderBy, Firestore, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PlusIcon, CalendarIcon, ListChecksIcon, TagIcon, ChevronDownIcon, MenuIcon, FilterIcon, SearchIcon, XIcon, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'next/navigation';

// Composants UI
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

// Composants personnalisés
import SidebarNav from './SidebarNav';
import TaskCalendar from './TaskCalendar';
import TaskBoard from './TaskBoard';
import TaskFormModal from './TaskFormModal';
import NotionTable from './NotionTable';
import NotionHeader from './NotionHeader';
import NotionTabs from './NotionTabs';
import { Header } from '../../components/header';
import { Task, TeamMember } from '../types';

// Types
interface NotionPlanWorkspaceProps {
  consultant?: string | null;
}

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

// Fonction pour convertir les statuts si nécessaire
const normalizeStatus = (status: string): Task['status'] => {
  const statusMap: Record<string, Task['status']> = {
    'todo': 'à faire',
    'in-progress': 'en cours',
    'done': 'terminée'
  };
  
  return (statusMap[status as keyof typeof statusMap] || status) as Task['status'];
};

// Fonction pour ajouter les consultants à Firebase s'ils n'existent pas déjà
const initializeConsultants = async () => {
  try {
    const consultantsRef = collection(db, 'teamMembers');
    const querySnapshot = await getDocs(consultantsRef);
    
    // Si la collection est vide, ajouter les consultants
    if (querySnapshot.empty) {
      const consultants = [
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
      
      for (const consultant of consultants) {
        await addDoc(consultantsRef, consultant);
      }
      
      console.log("Consultants ajoutés à Firebase");
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation des consultants:", error);
  }
};

// Fonction pour obtenir la couleur du type d'action
const getActionTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'newsletter': 'bg-purple-500 hover:bg-purple-600',
    'panneau': 'bg-blue-500 hover:bg-blue-600',
    'flyer': 'bg-green-500 hover:bg-green-600',
    'carousel': 'bg-yellow-500 hover:bg-yellow-600',
    'video': 'bg-red-500 hover:bg-red-600',
    'post_site': 'bg-indigo-500 hover:bg-indigo-600',
    'post_linkedin': 'bg-sky-500 hover:bg-sky-600',
    'post_instagram': 'bg-pink-500 hover:bg-pink-600',
    'autre': 'bg-gray-500 hover:bg-gray-600'
  };
  return colors[type] || 'bg-gray-500 hover:bg-gray-600';
};

export default function NotionPlanWorkspace({ consultant }: NotionPlanWorkspaceProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const searchParams = useSearchParams();
  const urlActiveView = searchParams.get('activeView') as 'table' | 'board' | 'calendar' | null;
  const [activeView, setActiveView] = useState<'table' | 'board' | 'calendar'>(urlActiveView || 'table');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Nouveaux états pour les filtres
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  // Nouvel état pour filtrer uniquement les tâches assignées
  const [showAssignedTasksOnly, setShowAssignedTasksOnly] = useState(false);
  // État pour les tâches développées initialement
  const [initialExpandedTasks, setInitialExpandedTasks] = useState<Record<string, boolean>>({});

  // Écouter les changements dans les paramètres d'URL pour la vue active
  useEffect(() => {
    if (urlActiveView && ['table', 'board', 'calendar'].includes(urlActiveView)) {
      setActiveView(urlActiveView);
    }
  }, [urlActiveView]);

  // Charger les tâches depuis Firebase
  useEffect(() => {
    console.log("État actuel des tâches:", tasks);
  }, [tasks]);

  useEffect(() => {
    setLoading(true);
    console.log("Récupération des tâches initiée...");

    // Vérifier si les consultants existent, sinon les initialiser
    const checkAndInitConsultants = async () => {
      try {
        // Utiliser la même collection pour initialiser et récupérer
        const teamMembersRef = collection(db, "teamMembers");
        const teamMembersSnapshot = await getDocs(teamMembersRef);
        
        if (teamMembersSnapshot.empty) {
          console.log("Initialisation des consultants...");
          await initializeConsultants();
          
          // Récupérer à nouveau après initialisation
          const updatedSnapshot = await getDocs(teamMembersRef);
          const teamMembersData = updatedSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TeamMember[];
          
          console.log("TeamMembers chargés depuis Firebase après initialisation:", teamMembersData);
          setTeamMembers(teamMembersData);
        } else {
          // Récupérer les membres de l'équipe existants
          const teamMembersData = teamMembersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TeamMember[];
          
          console.log("TeamMembers chargés depuis Firebase:", teamMembersData);
          setTeamMembers(teamMembersData);
        }
        
        // Pas besoin de récupérer à nouveau, utiliser directement les données déjà récupérées
        // Vérifier si les données récupérées sont vides
        if (teamMembersSnapshot.empty) {
          console.log("Aucun consultant trouvé dans Firebase, utilisation de la liste prédéfinie");
          // Convertir CONSULTANTS en TeamMember[]
          const consultantsAsTeamMembers = CONSULTANTS.map((consultant, index) => ({
            id: `local-${index}`,
            name: consultant.name,
            email: consultant.email
          })) as TeamMember[];
          
          setTeamMembers(consultantsAsTeamMembers);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des consultants:", error);
        
        // En cas d'erreur, utiliser la liste prédéfinie
        console.log("Erreur de chargement des consultants, utilisation de la liste prédéfinie");
        const consultantsAsTeamMembers = CONSULTANTS.map((consultant, index) => ({
          id: `local-${index}`,
          name: consultant.name,
          email: consultant.email
        })) as TeamMember[];
        
        setTeamMembers(consultantsAsTeamMembers);
      }
    };

    // Récupérer les tâches avec un écouteur en temps réel
    const fetchTasks = async () => {
      await checkAndInitConsultants();
      
      try {
        console.log("Mise en place de l'écouteur de tâches...");
        const tasksRef = collection(db, "tasks");
        let q = assignedToFilter === 'all' 
          ? tasksRef 
          : query(tasksRef, where("assignedTo", "==", assignedToFilter));

        // Mettre en place un écouteur pour les mises à jour en temps réel
        const unsubscribe = onSnapshot(q, (snapshot) => {
          console.log("Changement détecté dans les tâches, nombre de documents:", snapshot.docs.length);
          const taskData = snapshot.docs.map(doc => {
            const data = doc.data();
            // Normaliser les données (convertir les timestamps en Date, etc.)
            const task: Task = {
              id: doc.id,
              title: data.title || '',
              description: data.description || '',
              status: data.status || 'not_started',
              priority: data.priority || 'medium',
              assignedTo: data.assignedTo || '',
              dueDate: data.dueDate ? 
                (data.dueDate instanceof Timestamp ? new Date(data.dueDate.toMillis()) : new Date(data.dueDate)) 
                : null,
              reminder: data.reminder ? 
                (data.reminder instanceof Timestamp ? new Date(data.reminder.toMillis()) : new Date(data.reminder)) 
                : null,
              tags: data.tags || [],
              propertyAddress: data.propertyAddress || '',
              dossierNumber: data.dossierNumber || '',
              actionType: data.actionType || 'autre',
              platform: data.platform || null,
              mediaType: data.mediaType || null,
              createdAt: data.createdAt ? 
                (data.createdAt instanceof Timestamp ? new Date(data.createdAt.toMillis()) : new Date(data.createdAt)) 
                : new Date(),
              updatedAt: data.updatedAt ? 
                (data.updatedAt instanceof Timestamp ? new Date(data.updatedAt.toMillis()) : new Date(data.updatedAt)) 
                : new Date(),
              createdBy: data.createdBy || '',
              mandatSigne: data.mandatSigne === true
            };
            
            console.log(`Tâche ${doc.id} récupérée avec mandatSigne =`, data.mandatSigne, 
              "→ normalisé à", data.mandatSigne === true);
            
            // Normaliser les détails de communication si présents
            if (data.communicationDetails && Array.isArray(data.communicationDetails)) {
              task.communicationDetails = data.communicationDetails.map((detail: any) => {
                return {
                  ...detail,
                  deadline: detail.deadline ? 
                    (detail.deadline instanceof Timestamp ? new Date(detail.deadline.toMillis()) : new Date(detail.deadline)) 
                    : null
                };
              });
            }
            
            return task;
          });
          
          console.log("Tâches récupérées:", taskData);
          setTasks(taskData);
          setLoading(false);
        }, (error) => {
          console.error("Erreur lors de l'écoute des tâches:", error);
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Erreur lors de la récupération des tâches:", error);
        setLoading(false);
        return () => {}; // Retourner une fonction vide en cas d'erreur
      }
    };

    const unsubscribePromise = fetchTasks();
    
    // Nettoyage lors du démontage du composant
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [assignedToFilter]);

  // Normaliser les statuts des tâches lors du chargement
  useEffect(() => {
    if (tasks.length > 0) {
      const normalizedTasks = tasks.map(task => ({
        ...task,
        status: normalizeStatus(task.status)
      }));
      
      if (JSON.stringify(normalizedTasks) !== JSON.stringify(tasks)) {
        setTasks(normalizedTasks);
      }
    }
  }, [tasks]);

  const handleCreateTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log("Création d'une nouvelle tâche:", task);
      console.log("Statut mandatSigne lors de la création:", task.mandatSigne, typeof task.mandatSigne);
      
      // S'assurer que mandatSigne est un booléen explicite, pas undefined
      const mandatSigne = task.mandatSigne === true;
      console.log("Statut mandatSigne normalisé:", mandatSigne);
      
      const taskData = {
        ...task,
        mandatSigne, // Utiliser la version normalisée
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: task.status || 'not_started',
        priority: task.priority || 'medium',
        tags: task.tags || [],
        assignedTo: task.assignedTo || '',
        actionType: task.actionType || 'autre',
        createdBy: 'utilisateur@example.com', // À remplacer par l'utilisateur connecté
      };
      
      const docRef = await addDoc(collection(db, "tasks"), taskData);
      console.log("Tâche créée avec succès avec l'ID:", docRef.id);
      
      // Note: Nous n'avons plus besoin de mettre à jour manuellement l'état tasks
      // car l'écouteur onSnapshot s'en chargera automatiquement
    } catch (error) {
      console.error("Erreur lors de la création de la tâche:", error);
      throw error;
    }
  };

  const handleUpdateTask = async (task: Partial<Task> & { id: string }) => {
    try {
      console.log("Mise à jour de tâche:", task);
      console.log("État mandatSigne dans la mise à jour:", task.mandatSigne, "type:", typeof task.mandatSigne);
      
      const { id, ...taskData } = task;
      
      // Créer un objet qui ne contiendra que les valeurs définies
      const normalizedTask: Record<string, any> = {};
      
      // Ajouter le timestamp de mise à jour
      normalizedTask.updatedAt = serverTimestamp();

      // Traitement explicite de mandatSigne
      if (taskData.mandatSigne !== undefined) {
        console.log("Normalisation de mandatSigne:", taskData.mandatSigne);
        normalizedTask.mandatSigne = taskData.mandatSigne === true;
        console.log("Valeur normalisée de mandatSigne:", normalizedTask.mandatSigne);
      }

      // Ne copier que les champs non-undefined
      Object.entries(taskData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'mandatSigne') { // Éviter la duplication de mandatSigne
          // Normaliser le statut si présent
          if (key === 'status') {
            normalizedTask[key] = normalizeStatus(value as string);
          } else {
            normalizedTask[key] = value;
          }
        }
      });

      // Traitement spécial pour les dates
      if (taskData.dueDate !== undefined) {
        console.log("Date d'échéance avant normalisation:", taskData.dueDate);
        // Si c'est une date JavaScript, la convertir en Timestamp Firebase
        normalizedTask.dueDate = taskData.dueDate 
          ? Timestamp.fromDate(new Date(taskData.dueDate as any)) 
          : null;
        console.log("Date d'échéance après normalisation:", normalizedTask.dueDate);
      }
      
      // Vérifier et normaliser la date de rappel
      if (taskData.reminder !== undefined) {
        normalizedTask.reminder = taskData.reminder 
          ? Timestamp.fromDate(new Date(taskData.reminder as any)) 
          : null;
      }

      // Vérifier et normaliser les dates dans communicationDetails
      if (taskData.communicationDetails) {
        // S'assurer que communicationDetails est un tableau valide
        if (Array.isArray(taskData.communicationDetails)) {
          console.log("Normalisation des détails de communication:", taskData.communicationDetails);
          
          normalizedTask.communicationDetails = taskData.communicationDetails.map((detail, index) => {
            console.log(`Détail ${index}:`, detail);
            
            // Créer une copie pour la normalisation
            const normalizedDetail = { ...detail };
            
            // Normaliser la date si présente
            if (detail.deadline !== undefined) {
              // Convertir la date en Timestamp Firebase, quelle que soit sa forme actuelle
              normalizedDetail.deadline = detail.deadline 
                ? (typeof detail.deadline === 'object' && detail.deadline !== null && 'toDate' in detail.deadline
                    ? Timestamp.fromDate((detail.deadline as any).toDate())
                    : Timestamp.fromDate(new Date(detail.deadline as any)))
                : null;
              
              console.log(`Date normalisée pour détail ${index}:`, normalizedDetail.deadline);
            }
            
            // S'assurer que tous les champs essentiels sont présents
            if (!normalizedDetail.type) {
              normalizedDetail.type = 'autre';
            }
            
            if (!normalizedDetail.status) {
              normalizedDetail.status = 'en cours';
            }
            
            if (!normalizedDetail.priority) {
              normalizedDetail.priority = 'moyenne';
            }
            
            // S'assurer que assignedTo est un tableau
            if (!normalizedDetail.assignedTo || !Array.isArray(normalizedDetail.assignedTo)) {
              normalizedDetail.assignedTo = [];
            }
            
            return normalizedDetail;
          });
          
          console.log("Détails de communication normalisés:", normalizedTask.communicationDetails);
        } else {
          console.error("communicationDetails n'est pas un tableau:", taskData.communicationDetails);
          // Définir une valeur par défaut pour éviter les erreurs
          normalizedTask.communicationDetails = [];
        }
      }

      console.log("Tâche normalisée avant envoi:", normalizedTask);

      // Vérification finale pour s'assurer qu'aucun champ undefined n'est envoyé
      Object.entries(normalizedTask).forEach(([key, value]) => {
        if (value === undefined) {
          delete normalizedTask[key];
          console.log(`Suppression du champ ${key} car sa valeur est undefined`);
        }
      });
      
      await updateDoc(doc(db, 'tasks', id), normalizedTask);
      console.log("Tâche mise à jour avec succès");
      
      // Mettre à jour l'état local pour refléter les changements immédiatement
      // Cela évite le problème de duplication des tâches dans le calendrier
      setTasks(prevTasks => {
        // Créer une copie profonde des tâches actuelles
        const updatedTasks = [...prevTasks];
        
        // Trouver l'index de la tâche à mettre à jour
        const taskIndex = updatedTasks.findIndex(t => t.id === id);
        
        // Si la tâche existe, mettre à jour ses propriétés
        if (taskIndex !== -1) {
          // Créer une copie de la tâche existante
          const updatedTask = { ...updatedTasks[taskIndex] };
          
          // Appliquer toutes les modifications
          Object.entries(taskData).forEach(([key, value]) => {
            if (value !== undefined) {
              // Pour les dates, s'assurer qu'elles sont bien de type Date
              if (key === 'dueDate' || key === 'reminder') {
                // @ts-ignore
                updatedTask[key] = value ? new Date(value) : null;
              } else {
                // @ts-ignore
                updatedTask[key] = value;
              }
            }
          });
          
          // Mettre à jour la tâche dans le tableau
          updatedTasks[taskIndex] = updatedTask;
        }
        
        return updatedTasks;
      });
      
      setIsTaskFormOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la tâche:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setSelectedTask(null);
    } catch (error) {
      console.error("Erreur lors de la suppression de la tâche:", error);
    }
  };

  const openEditTaskModal = (task: Task) => {
    setSelectedTask(task);
    setIsTaskFormOpen(true);
  };

  // Fonction pour récupérer l'email d'un consultant à partir de son nom
  const getConsultantEmail = (name: string | null): string | null => {
    if (!name) return null;
    const found = CONSULTANTS.find(c => c.name.toLowerCase() === name.toLowerCase());
    return found ? found.email : null;
  };

  // Filtrer les tâches en fonction des critères de recherche et des filtres
  const filteredTasks = tasks.filter(task => {
    // Filtrer par texte de recherche
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(normalizedQuery);
      const matchesDesc = task.description?.toLowerCase().includes(normalizedQuery) || false;
      const matchesAddress = task.propertyAddress?.toLowerCase().includes(normalizedQuery) || false;
      const matchesDossier = task.dossierNumber?.toLowerCase().includes(normalizedQuery) || false;
      
      if (!(matchesTitle || matchesDesc || matchesAddress || matchesDossier)) {
        return false;
      }
    }
    
    // Filtrer par type d'action
    if (actionTypeFilter && task.actionType !== actionTypeFilter) {
      return false;
    }
    
    // Filtrer par plateforme
    if (platformFilter && task.platform !== platformFilter) {
      return false;
    }
    
    // Filtrer par statut
    if (statusFilter && task.status !== statusFilter) {
      return false;
    }
    
    // Filtrer uniquement les tâches assignées si l'option est activée
    if (showAssignedTasksOnly && consultant) {
      const consultantEmail = getConsultantEmail(consultant);
      if (!consultantEmail) return false;
      
      // Vérifier si la tâche est assignée directement au consultant
      const isDirectlyAssigned = task.assignedTo.includes(consultantEmail);
      
      // Vérifier si une communication de la tâche est assignée au consultant
      const hasCommunicationAssigned = task.communicationDetails?.some(
        comm => comm.assignedTo?.includes(consultantEmail)
      ) || false;
      
      // Inclure la tâche si elle est assignée directement ou via une communication
      if (!(isDirectlyAssigned || hasCommunicationAssigned)) {
        return false;
      }
      
      // Si la tâche a une communication assignée, on l'ajoute à la liste des tâches à développer initialement
      if (hasCommunicationAssigned && !isDirectlyAssigned) {
        setInitialExpandedTasks(prev => ({...prev, [task.id]: true}));
      }
    }
    
    return true;
  });

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsTaskFormOpen(true);
  };

  // Mettre à jour l'URL lorsque le filtre de tâches assignées change
  useEffect(() => {
    // Mise à jour de l'URL avec le paramètre de filtre
    const searchParams = new URLSearchParams(window.location.search);
    
    if (showAssignedTasksOnly) {
      searchParams.set('assignedFilter', 'true');
    } else {
      searchParams.delete('assignedFilter');
    }
    
    // Construire la nouvelle URL sans recharger la page
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }, [showAssignedTasksOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header global */}
      <Header />
      
      {/* Contenu principal avec sidebar */}
      <div className="flex flex-1">
        {/* Barre latérale */}
        <aside className="hidden lg:block w-64 h-[calc(100vh-4rem)] bg-white border-r">
          <SidebarNav consultant={consultant} />
        </aside>
        
        {/* Contenu principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto py-4 px-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">
                  {activeView === 'calendar' 
                    ? "Calendrier" 
                    : activeView === 'board' 
                      ? "Tableau des tâches" 
                      : "Plan de communication"
                  }
                </h1>
                <div className="flex gap-2">
                  <Button variant="default" onClick={handleNewTask}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nouvelle tâche
                  </Button>
                </div>
              </div>

              <NotionTabs 
                activeView={activeView} 
                onViewChange={setActiveView} 
              />

              <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-0">
                  {activeView === 'table' && (
                    <NotionTable
                      tasks={filteredTasks}
                      onEditTask={openEditTaskModal}
                      onCreateTask={handleNewTask}
                      onUpdateTask={handleUpdateTask}
                      onDeleteTask={handleDeleteTask}
                      initialExpandedTasks={initialExpandedTasks}
                    />
                  )}
                  {activeView === 'board' && (
                    <TaskBoard
                      tasks={filteredTasks}
                      onEditTask={openEditTaskModal}
                      onUpdateTask={handleUpdateTask}
                      onDeleteTask={handleDeleteTask}
                    />
                  )}
                  {activeView === 'calendar' && (
                    <TaskCalendar
                      tasks={filteredTasks}
                      onEditTask={openEditTaskModal}
                      onUpdateTask={handleUpdateTask}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton d'ajout fixe en bas de page */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button 
          onClick={handleNewTask}
          className="rounded-full w-16 h-16 shadow-lg bg-[#DC0032] hover:bg-[#a60026] transition-colors"
        >
          <PlusIcon className="h-8 w-8 text-white" />
        </Button>
      </div>

      {/* Drawer pour la barre latérale mobile */}
      <Drawer open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
        <DrawerContent className="h-screen max-h-screen rounded-none">
          <SidebarNav onCloseSidebar={() => setIsSidebarOpen(false)} consultant={consultant} />
        </DrawerContent>
      </Drawer>

      {/* Modal de formulaire de tâche */}
      <TaskFormModal
        open={isTaskFormOpen}
        onOpenChange={(open) => {
          setIsTaskFormOpen(open);
          if (!open) setSelectedTask(null);
        }}
        task={selectedTask}
        teamMembers={teamMembers}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
} 