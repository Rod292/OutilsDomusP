"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { subscribeToActiveUsers, updateUserActivity, removeUserActivity, ActiveUser } from '../../services/activeUsersService';

// Liste des consultants
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

interface ActiveUserBadgeProps {
  consultant?: string | null;
}

export default function ActiveUserBadge({ consultant }: ActiveUserBadgeProps) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  
  // Obtenir le nom du consultant connecté
  const getConsultantNameFromEmail = (email?: string | null): string | null => {
    if (!email) return null;
    const foundConsultant = CONSULTANTS.find(c => c.email === email);
    return foundConsultant ? foundConsultant.name : email.split('@')[0];
  };
  
  // Obtenir le nom du consultant en cours
  const getCurrentConsultant = (): string | null => {
    // Si un consultant est spécifié dans l'URL (paramètre consultant)
    if (consultant) {
      // Trouver le consultant complet par son nom
      const foundConsultant = CONSULTANTS.find(c => 
        c.name.toLowerCase() === consultant.toLowerCase()
      );
      
      if (foundConsultant) {
        // Si trouvé, enregistrer son activité
        return foundConsultant.name;
      }
      
      // Sinon retourner le nom tel quel
      return consultant;
    }
    
    // Si pas de consultant dans l'URL mais utilisateur connecté
    if (user && user.email) {
      return getConsultantNameFromEmail(user.email);
    }
    
    return null;
  };
  
  // Mettre à jour le statut d'activité de l'utilisateur actuel
  useEffect(() => {
    const currentConsultant = getCurrentConsultant();
    console.log(`Utilisateur actif identifié: ${currentConsultant}`);
    
    if (currentConsultant) {
      // Trouver l'email à partir du nom du consultant
      const consultantRecord = CONSULTANTS.find(c => 
        c.name.toLowerCase() === currentConsultant.toLowerCase()
      );
      
      if (consultantRecord) {
        console.log(`Enregistrement de l'activité pour ${currentConsultant} (${consultantRecord.email})`);
        
        // Mettre à jour le statut d'activité
        updateUserActivity(consultantRecord.email, currentConsultant);
        
        // Configurer un intervalle pour mettre à jour le statut régulièrement
        const interval = setInterval(() => {
          updateUserActivity(consultantRecord.email, currentConsultant);
        }, 60000); // Mettre à jour toutes les minutes
        
        // Ajouter un gestionnaire d'événement pour supprimer l'utilisateur quand il quitte la page
        const handleBeforeUnload = () => {
          console.log(`Suppression de l'activité pour ${currentConsultant} (départ page)`);
          
          if (navigator.sendBeacon) {
            const formData = new FormData();
            formData.append('email', consultantRecord.email);
            navigator.sendBeacon('/api/user/remove-activity', formData);
          } else {
            removeUserActivity(consultantRecord.email);
          }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
          clearInterval(interval);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          console.log(`Suppression de l'activité pour ${currentConsultant} (démontage composant)`);
          removeUserActivity(consultantRecord.email);
        };
      }
    }
  }, [user, consultant]);
  
  // S'abonner aux mises à jour des utilisateurs actifs
  useEffect(() => {
    console.log("Mise en place de l'abonnement aux utilisateurs actifs");
    const unsubscribe = subscribeToActiveUsers((users) => {
      console.log("Utilisateurs actifs reçus:", users);
      setActiveUsers(users);
    });
    
    return () => {
      console.log("Désabonnement des utilisateurs actifs");
      unsubscribe();
    };
  }, []);
  
  // Identifier l'utilisateur actuel pour le mettre en évidence
  const currentUserEmail = user?.email;
  const currentConsultantName = getCurrentConsultant();
  
  // Trouver l'email du consultant actuel d'après le paramètre URL
  const currentConsultantEmail = consultant ? 
    CONSULTANTS.find(c => c.name.toLowerCase() === consultant.toLowerCase())?.email : 
    null;
  
  // Si aucun utilisateur actif, ne rien afficher
  if (!activeUsers.length) {
    return null;
  }
  
  return (
    <div className="flex items-center mb-4">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 text-green-800 rounded-lg">
        <Users className="h-4 w-4" />
        <span className="font-medium">Utilisateurs actifs:</span>
        <div className="flex items-center gap-1 ml-1">
          {activeUsers.map((activeUser) => {
            // Déterminer si c'est l'utilisateur actuel de cette session
            const isCurrentUser = 
              activeUser.email === currentUserEmail || 
              activeUser.email === currentConsultantEmail;
              
            return (
              <TooltipProvider key={activeUser.email}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`flex items-center gap-1 bg-white ${isCurrentUser ? 'border-green-300' : 'border-gray-200'}`}
                    >
                      <span className={`w-2 h-2 ${isCurrentUser ? 'bg-green-500' : 'bg-gray-300'} rounded-full`}></span>
                      <span>{activeUser.name}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isCurrentUser ? 'Vous êtes connecté' : 'Utilisateur actif'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    </div>
  );
} 