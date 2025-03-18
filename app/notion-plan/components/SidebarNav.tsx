"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { HomeIcon, LayoutDashboardIcon, CalendarIcon, ClipboardListIcon, TagIcon, UsersIcon, LogOutIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Task } from '../types';
import { useAssignedToFilter } from '../hooks/useAssignedToFilter';

interface SidebarNavProps {
  onCloseSidebar?: () => void;
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

export default function SidebarNav({ onCloseSidebar, consultant }: SidebarNavProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { assignedToFilter, setAssignedToFilter } = useAssignedToFilter();
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [isAssignedFilterActive, setIsAssignedFilterActive] = useState(false);
  
  // Récupérer et observer les paramètres de recherche de l'URL
  const searchParams = useSearchParams();
  
  // Mettre à jour l'état du filtre en fonction de l'URL
  useEffect(() => {
    const assignedFilter = searchParams.get('assignedFilter');
    setIsAssignedFilterActive(assignedFilter === 'true');
  }, [searchParams]);

  // Fonction pour charger le nombre de tâches assignées au consultant
  useEffect(() => {
    if (!consultant) return;
    
    // Rechercher l'email du consultant basé sur son nom
    const consultantEmail = getConsultantEmail(consultant);
    
    if (!consultantEmail) return;
    
    let unsubscribeDirectTasks: (() => void) | undefined;
    let unsubscribeAllTasks: (() => void) | undefined;
    
    try {
      // 1. Récupérer les tâches directement assignées au consultant
      const taskRef = collection(db, 'tasks');
      const q = query(
        taskRef, 
        where('assignedTo', 'array-contains', consultantEmail)
      );
      
      // Créer un set pour stocker les IDs des tâches déjà comptées
      const countedTaskIds = new Set<string>();
      let directTasksCount = 0;
      let indirectTasksCount = 0;
      
      // Écouter les tâches directement assignées
      unsubscribeDirectTasks = onSnapshot(q, (querySnapshot) => {
        // Réinitialiser le compteur et les IDs pour les tâches directes
        directTasksCount = 0;
        countedTaskIds.clear();
        
        for (const doc of querySnapshot.docs) {
          const task = doc.data() as Task;
          countedTaskIds.add(doc.id);
          
          // Filtre côté client pour les tâches non terminées
          if (task.status !== 'terminée') {
            directTasksCount++;
          }
          
          // Compter aussi les communications assignées à ce consultant
          if (task.communicationDetails && task.communicationDetails.length > 0) {
            task.communicationDetails.forEach(comm => {
              if (comm.assignedTo && 
                  comm.assignedTo.includes(consultantEmail) && 
                  comm.status !== 'terminée' && 
                  comm.status !== 'publié') {
                directTasksCount++;
              }
            });
          }
        }
        
        // Mettre à jour le compteur avec la somme des deux compteurs
        setPendingTasksCount(directTasksCount + indirectTasksCount);
      });
      
      // 2. Récupérer toutes les tâches pour trouver celles avec des communications assignées au consultant
      const allTasksQuery = query(collection(db, 'tasks'));
      
      // Écouter toutes les tâches
      unsubscribeAllTasks = onSnapshot(allTasksQuery, (allTasksSnapshot) => {
        // Réinitialiser le compteur des tâches indirectes
        indirectTasksCount = 0;
        
        for (const taskDoc of allTasksSnapshot.docs) {
          // Ignorer les tâches déjà comptées
          if (countedTaskIds.has(taskDoc.id)) continue;
          
          const data = taskDoc.data();
          
          // Vérifier si cette tâche a des communications assignées au consultant
          if (data.communicationDetails && data.communicationDetails.length > 0) {
            data.communicationDetails.forEach((comm: any) => {
              if (comm.assignedTo && 
                  comm.assignedTo.includes(consultantEmail) && 
                  comm.status !== 'terminée' && 
                  comm.status !== 'publié') {
                indirectTasksCount++;
              }
            });
          }
        }
        
        // Mettre à jour le compteur avec la somme des deux compteurs
        setPendingTasksCount(directTasksCount + indirectTasksCount);
      });
      
    } catch (error) {
      console.error('Erreur lors du chargement des tâches assignées:', error);
    }
    
    // Nettoyage lors du démontage du composant
    return () => {
      if (unsubscribeDirectTasks) unsubscribeDirectTasks();
      if (unsubscribeAllTasks) unsubscribeAllTasks();
    };
  }, [consultant]);

  // Fonction pour obtenir l'email d'un consultant à partir de son nom
  const getConsultantEmail = (consultantName: string | null | undefined): string | undefined => {
    if (!consultantName) return undefined;
    
    const consultant = CONSULTANTS.find(
      c => c.name.toLowerCase() === consultantName.toLowerCase()
    );
    
    return consultant?.email;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-in');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Fonction pour gérer le clic sur "Tâches assignées"
  const handleAssignedTasksClick = () => {
    // Extraire l'email du consultant actuel à partir de son nom
    const consultantEmail = getConsultantEmail(consultant);
    
    // Si le filtre est déjà actif, le désactiver
    if (isAssignedFilterActive) {
      // Désactiver le filtre
      setAssignedToFilter([]);
      // Rediriger vers la page sans le filtre d'assignation
      router.push(`/notion-plan?consultant=${consultant || ''}`);
      return;
    }
    
    // Si nous avons trouvé l'email du consultant, le définir comme filtre
    if (consultantEmail) {
      setAssignedToFilter([consultantEmail]);
    }
    
    // Rediriger vers la page avec le filtre d'assignation
    router.push(`/notion-plan?consultant=${consultant || ''}&assignedFilter=true`);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <LayoutDashboardIcon className="h-6 w-6 text-[#DC0032]" />
          <h2 className="text-xl font-bold text-gray-900">Notion Plan</h2>
        </div>
        {onCloseSidebar && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden" 
            onClick={onCloseSidebar}
          >
            <XIcon className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="mb-2 px-2">
        <p className="text-xs font-medium text-gray-500 uppercase">ESPACE DE TRAVAIL</p>
      </div>

      <nav className="space-y-1 mb-6">
        <Button 
          variant="ghost" 
          className="w-full justify-start bg-gray-100 text-[#DC0032]"
          onClick={() => router.push(`/notion-plan?consultant=${consultant}`)}
        >
          <ClipboardListIcon className="h-4 w-4 mr-3" />
          Plan de Communication
        </Button>
      </nav>

      <div className="mb-2 px-2">
        <p className="text-xs font-medium text-gray-500 uppercase">RACCOURCIS</p>
      </div>

      <nav className="space-y-1 mb-6">
        <Button 
          variant={isAssignedFilterActive ? "default" : "ghost"}
          className={`w-full justify-start relative ${
            isAssignedFilterActive 
              ? "bg-[#DC0032] text-white hover:bg-[#DC0032]/90" 
              : "text-gray-700 hover:text-[#DC0032] hover:bg-gray-100"
          }`}
          onClick={handleAssignedTasksClick}
        >
          <TagIcon className="h-4 w-4 mr-3" />
          Tâches assignées
          {pendingTasksCount > 0 && (
            <span className={`absolute top-1 right-2 text-xs font-bold rounded-full flex items-center justify-center w-5 h-5 ${
              isAssignedFilterActive 
                ? "bg-white text-[#DC0032]" 
                : "bg-[#DC0032] text-white"
            }`}>
              {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
            </span>
          )}
        </Button>

        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-700 hover:text-[#DC0032] hover:bg-gray-100"
          onClick={() => router.push(`/notion-plan?consultant=${consultant}&activeView=calendar`)}
        >
          <CalendarIcon className="h-4 w-4 mr-3" />
          Calendrier
        </Button>
      </nav>

      <Separator className="my-4" />

      <div className="mt-auto">
        {/* Bloc d'information utilisateur supprimé */}
      </div>
    </div>
  );
} 