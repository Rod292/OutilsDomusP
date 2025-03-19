"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc, serverTimestamp, orderBy, Firestore, Timestamp, getDoc } from 'firebase/firestore';
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
import { Task, TeamMember, CommunicationDetail } from '../types';
import GlobalNotificationButton from '@/app/components/notifications/GlobalNotificationButton';

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

// Fonction pour envoyer une notification de tâche assignée
const sendTaskAssignedNotification = async (task: any, assignee: string, currentUserEmail: string) => {
  try {
    // Extraire le nom du consultant à partir de l'email
    const consultantName = assignee.split('@')[0] || assignee;
    
    // Construire l'ID de notification (email_consultant)
    // C'est l'utilisateur connecté qui doit recevoir la notification concernant le consultant
    const notificationId = `${currentUserEmail}_${consultantName}`;
    
    // Préparer les données de la notification avec un message qui indique clairement qu'il s'agit d'une notification 
    // pour le consultant suivi par l'utilisateur connecté
    const notificationData = {
      userId: notificationId,
      title: "📋 Nouvelle tâche assignée",
      body: `${consultantName}, une nouvelle tâche "${task.title}" vous a été assignée.`,
      type: "task_assigned" as "task_assigned" | "task_reminder" | "system",
      taskId: task.id
    };

    console.log(`Envoi d'une notification à ${notificationId} pour la tâche assignée à ${consultantName}.`);
    
    try {
      // Essayer d'envoyer la notification via l'API
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      // Si l'API échoue, essayer d'envoyer en mode local
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Résultat de l\'envoi de notification:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
    } catch (apiError) {
      console.error('Erreur lors de l\'envoi via API, tentative d\'envoi local:', apiError);
      
      // Fallback: utiliser les notifications locales
      const { sendLocalNotification, createNotification } = await import('../../services/notificationService');
      
      // Enregistrer la notification dans Firestore
      await createNotification({
        userId: notificationId,
        title: notificationData.title,
        body: notificationData.body,
        type: notificationData.type,
        taskId: notificationData.taskId,
        read: false
      });
      
      // Envoyer une notification locale
      await sendLocalNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: { taskId: notificationData.taskId, type: notificationData.type }
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
  }
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
      
      // Retourner la tâche créée avec son ID
      return {
        id: docRef.id,
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Task;
      
      // Note: Nous n'avons plus besoin de mettre à jour manuellement l'état tasks
      // car l'écouteur onSnapshot s'en chargera automatiquement
    } catch (error) {
      console.error("Erreur lors de la création de la tâche:", error);
      throw error;
    }
  };

  const handleUpdateTask = async (task: Partial<Task> & { id: string }) => {
    try {
      console.log("GESTIONNAIRE DE MISE À JOUR: Début de mise à jour de tâche avec ID:", task.id);
      
      // Créer un identifiant unique pour cette opération de mise à jour
      const updateId = `update-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Démarrage de l'opération...`);
      
      // IMPORTANT: Vérifier si c'est une mise à jour de communication
      if (task.communicationDetails) {
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Traitement spécial pour mise à jour de communications`);
        
        // Récupérer les données actuelles directement depuis Firestore
        const taskRef = doc(db, 'tasks', task.id);
        const taskSnapshot = await getDoc(taskRef);
        
        if (!taskSnapshot.exists()) {
          throw new Error(`Tâche avec ID ${task.id} introuvable dans Firestore`);
        }
        
        // Récupérer la version la plus récente des données
        const currentTaskData = taskSnapshot.data() as any;
        const currentComms = currentTaskData.communicationDetails || [];
        
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Données actuelles récupérées de Firestore:`, 
          currentComms.map((c: any, i: number) => 
            `${i}: ${c.type} - ${c.deadline ? new Date((c.deadline as any).toDate()).toLocaleDateString() : 'non définie'}`
          )
        );
        
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Nouvelles données à appliquer:`, 
          task.communicationDetails.map((c, i) => 
            `${i}: ${c.type} - ${c.deadline ? new Date(c.deadline).toLocaleDateString() : 'non définie'}`
          )
        );
        
        // AMÉLIORATION MAJEURE: Faire une mise à jour intelligente qui préserve les modifications précédentes
        // Nous allons comparer communication par communication pour ne mettre à jour que celles qui ont changé
        
        // 1. Transformer les dates Firestore en dates JS pour la comparaison
        const normalizedCurrentComms = currentComms.map((comm: any) => ({
          ...comm,
          deadline: comm.deadline ? new Date((comm.deadline as any).toDate()) : null
        }));
        
        // 2. Créer une carte d'index pour suivre quelle communication a été modifiée
        // Stocker les communications à leur position originale
        const commIndexMap = new Map();
        normalizedCurrentComms.forEach((comm: any, idx: number) => {
          // Créer une clé unique pour cette communication basée sur son type et son index original
          const commKey = `${comm.type}-${comm.originalIndex !== undefined ? comm.originalIndex : idx}`;
          commIndexMap.set(commKey, idx);
        });
        
        // 3. Pour chaque nouvelle communication dans la mise à jour
        let updatedComms = [...normalizedCurrentComms]; // Copie de travail
        
        // Vérifier si nous avons de nouvelles communications à ajouter
        const hasNewCommunications = task.communicationDetails.length > normalizedCurrentComms.length;
        
        task.communicationDetails.forEach((updatedComm, updatedIdx) => {
          // Si cette communication a un index original, l'utiliser pour la localiser
          if (updatedComm.originalIndex !== undefined) {
            const originalIdx = updatedComm.originalIndex;
            
            // Si l'index est valide
            if (originalIdx >= 0 && originalIdx < normalizedCurrentComms.length) {
              console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Mise à jour de la communication à l'index original ${originalIdx}`);
              
              // Mettre à jour cette communication spécifique
              updatedComms[originalIdx] = {
                ...normalizedCurrentComms[originalIdx],
                ...updatedComm,
                // Conserver l'index original
                originalIndex: originalIdx
              };
            } else {
              console.warn(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Index original ${originalIdx} invalide`);
            }
          } else {
            // Cas où nous ajoutons une nouvelle communication (sans index original)
            if (updatedIdx >= normalizedCurrentComms.length) {
              console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Ajout d'une nouvelle communication à la position ${updatedIdx}`);
              
              // Ajouter la nouvelle communication à la fin du tableau
              updatedComms.push({
                ...updatedComm,
                // Ajouter l'index original pour les futures mises à jour
                originalIndex: updatedComms.length
              });
            } else {
              console.warn(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Communication sans index original à la position ${updatedIdx}`);
              // Cas particulier où l'index original n'est pas disponible
              // Dans ce cas, on essaie de trouver la communication par son type
              const commType = updatedComm.type;
              
              // Trouver toutes les communications du même type
              const matchingComms = normalizedCurrentComms
                .map((comm: any, idx: number) => ({ comm, idx }))
                .filter(item => item.comm.type === commType);
              
              if (matchingComms.length === 1) {
                // S'il n'y a qu'une seule communication de ce type, on peut la mettre à jour sans ambiguïté
                const matchIdx = matchingComms[0].idx;
                console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Communication trouvée par type à l'index ${matchIdx}`);
                
                updatedComms[matchIdx] = {
                  ...normalizedCurrentComms[matchIdx],
                  ...updatedComm,
                  // Ajouter l'index original pour les futures mises à jour
                  originalIndex: matchIdx
                };
              } else if (updatedIdx < updatedComms.length) {
                // En dernier recours, utiliser l'index dans le tableau de mise à jour
                console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Utilisation de l'index du tableau (${updatedIdx}) comme dernier recours`);
                
                updatedComms[updatedIdx] = {
                  ...normalizedCurrentComms[updatedIdx],
                  ...updatedComm,
                  // Ajouter l'index original pour les futures mises à jour
                  originalIndex: updatedIdx
                };
              } else {
                console.error(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Impossible de trouver où appliquer la mise à jour pour la communication ${updatedIdx}`);
              }
            }
          }
        });
        
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Tableau final des communications après fusion:`, 
          updatedComms.map((c: any, i: number) => 
            `${i}: ${c.type} - ${c.deadline ? new Date(c.deadline).toLocaleDateString() : 'non définie'}`
          )
        );
        
        // 4. Normaliser toutes les dates pour Firestore
        const normalizedUpdatedComms = updatedComms.map((comm: any) => ({
          ...comm,
          deadline: comm.deadline ? Timestamp.fromDate(new Date(comm.deadline)) : null
        }));
        
        // 5. Mise à jour atomique avec le tableau de communications fusionné
        await updateDoc(taskRef, {
          communicationDetails: normalizedUpdatedComms,
          updatedAt: serverTimestamp()
        });
        
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Mise à jour effectuée avec succès`);
        
        // 6. Mettre à jour l'état local avec le résultat fusionné
        setTasks(prevTasks => {
          // Créer une copie profonde des tâches actuelles
          const updatedTasks = [...prevTasks];
          
          // Trouver l'index de la tâche à mettre à jour
          const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
          
          // Si la tâche existe, mettre à jour ses propriétés
          if (taskIndex !== -1) {
            // Créer une copie de la tâche existante
            const updatedTask = { ...updatedTasks[taskIndex] };
            
            // Mettre à jour les communications avec le résultat fusionné
            updatedTask.communicationDetails = updatedComms.map(comm => ({
              ...comm,
              // S'assurer que les dates sont des objets Date dans l'état local
              deadline: comm.deadline ? new Date(comm.deadline) : null
            }));
            
            // Mettre à jour la tâche dans le tableau
            updatedTasks[taskIndex] = updatedTask;
            console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: État local mis à jour avec succès pour la tâche:`, task.id);
          } else {
            console.warn(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Tâche non trouvée dans l'état local:`, task.id);
          }
          
          return updatedTasks;
        });
        
        // Mettre à jour la tâche dans Firestore
        await updateDoc(taskRef, {
          communicationDetails: normalizedUpdatedComms,
          updatedAt: serverTimestamp()
        });
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Mise à jour réussie dans Firestore`);
        
        // Retourner la tâche mise à jour
        return {
          id: task.id,
          ...task
        };
      }
      
      // Pour les autres types de mises à jour (non-communications), utiliser le processus normal
      const { id, ...taskData } = task;
      
      // Créer un objet qui ne contiendra que les valeurs définies
      const normalizedTask: Record<string, any> = {};
      
      // Ajouter le timestamp de mise à jour
      normalizedTask.updatedAt = serverTimestamp();

      // Traitement explicite de mandatSigne
      if (taskData.mandatSigne !== undefined) {
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Normalisation de mandatSigne:`, taskData.mandatSigne);
        normalizedTask.mandatSigne = taskData.mandatSigne === true;
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Valeur normalisée de mandatSigne:`, normalizedTask.mandatSigne);
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
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Date d'échéance avant normalisation:`, taskData.dueDate);
        // Si c'est une date JavaScript, la convertir en Timestamp Firebase
        normalizedTask.dueDate = taskData.dueDate 
          ? Timestamp.fromDate(new Date(taskData.dueDate as any)) 
          : null;
        console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Date d'échéance après normalisation:`, normalizedTask.dueDate);
      }
      
      // Vérifier et normaliser la date de rappel
      if (taskData.reminder !== undefined) {
        normalizedTask.reminder = taskData.reminder 
          ? Timestamp.fromDate(new Date(taskData.reminder as any)) 
          : null;
      }

      console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Tâche normalisée avant envoi:`, 
        Object.keys(normalizedTask).map(key => `${key}: ${typeof normalizedTask[key]}`));

      // Vérification finale pour s'assurer qu'aucun champ undefined n'est envoyé
      Object.entries(normalizedTask).forEach(([key, value]) => {
        if (value === undefined) {
          delete normalizedTask[key];
          console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Suppression du champ ${key} car sa valeur est undefined`);
        }
      });
      
      // AMÉLIORATION: Utiliser un système de verrouillage et tentatives
      let attempts = 0;
      const maxAttempts = 3;
      let updateSuccess = false;
      
      while (!updateSuccess && attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Tentative ${attempts}/${maxAttempts} d'envoi à Firebase...`);
          
          // Exécuter la mise à jour dans Firebase
          const taskRef = doc(db, 'tasks', id);
          await updateDoc(taskRef, normalizedTask);
          
          console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Mise à jour réussie à la tentative ${attempts}`);
          updateSuccess = true;
        } catch (updateError) {
          console.error(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Erreur à la tentative ${attempts}:`, updateError);
          
          if (attempts < maxAttempts) {
            // Attendre un peu avant de réessayer
            const delay = Math.pow(2, attempts) * 100; // Backoff exponentiel: 200ms, 400ms, 800ms...
            console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Attente de ${delay}ms avant nouvelle tentative...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw updateError; // Remonter l'erreur après la dernière tentative
          }
        }
      }
      
      // APRÈS MISE À JOUR FIREBASE: Mise à jour de l'état local
      console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Mise à jour de l'état local...`);
      
      // Mettre à jour l'état local pour refléter les changements immédiatement
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
              } 
              else {
                // @ts-ignore
                updatedTask[key] = value;
              }
            }
          });
          
          // Mettre à jour la tâche dans le tableau
          updatedTasks[taskIndex] = updatedTask;
          console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: État local mis à jour avec succès pour la tâche:`, id);
        } else {
          console.warn(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Tâche non trouvée dans l'état local:`, id);
        }
        
        return updatedTasks;
      });
      
      console.log(`GESTIONNAIRE DE MISE À JOUR [${updateId}]: Opération terminée avec succès`);
      
      setIsTaskFormOpen(false);
      setSelectedTask(null);

      // Vérifier s'il y a de nouveaux assignés pour envoyer des notifications
      if (taskData.assignedTo && Array.isArray(taskData.assignedTo) && user?.email) {
        const existingTask = tasks.find(t => t.id === id);
        if (existingTask) {
          const existingAssignees = existingTask.assignedTo || [];
          const newAssignees = taskData.assignedTo.filter(
            assignee => !existingAssignees.includes(assignee)
          );
          
          // Envoyer des notifications aux nouveaux assignés
          for (const newAssignee of newAssignees) {
            await sendTaskAssignedNotification(
              { ...existingTask, ...taskData, id }, 
              newAssignee,
              user.email
            );
          }
        }
      }
    } catch (error) {
      console.error("ERREUR GLOBALE lors de la mise à jour de la tâche:", error);
      throw error; // Remonter l'erreur pour permettre la gestion des erreurs en amont
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
                  <GlobalNotificationButton 
                    consultantName={consultant || ''} 
                    size="default"
                    className="mr-1"
                  />
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