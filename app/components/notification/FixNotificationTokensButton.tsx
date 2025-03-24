'use client';

import React, { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getApp } from 'firebase/app';

// Configuration pour les notifications
const NOTIFICATION_CONFIG = {
  ENABLED: true,
  VAPID_KEY: 'BGzPLt8Qmv6lFQDwKZLJzcIqH4cwWJN2P_aPCp8HYXJn7LIXHA5RL9rUd2uxSCnD2XHJZFGVtV11i3n2Ux9JYXM',
  USE_FCM: true,
};

// Méthode qui utilise le serveur pour enregistrer directement un token
export const registerTokenForConsultantDirect = async (
  email: string,
  consultant?: string
): Promise<boolean> => {
  try {
    console.log(`Tentative d'enregistrement direct pour ${email}${consultant ? ` (${consultant})` : ''}`);
    
    // Vérifier si les notifications sont supportées
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.error("Les notifications ne sont pas supportées sur ce navigateur");
      return false;
    }
    
    // Demander la permission si nécessaire
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error("Permission de notification refusée:", permission);
      return false;
    }

    // Utiliser la route d'enregistrement spécial
    const response = await fetch('/api/notifications/register-test-token-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        consultant,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erreur lors de l'enregistrement direct:", errorData);
      return false;
    }

    const result = await response.json();
    console.log("Résultat de l'enregistrement direct:", result);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement direct:', error);
    return false;
  }
};

// Composant pour forcer l'enregistrement des tokens
export const FixNotificationTokensButton = ({ 
  email, 
  consultant 
}: { 
  email: string | null | undefined;
  consultant: string | null | undefined;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFixTokens = async () => {
    if (!email) {
      console.error("Email manquant pour la réparation des tokens");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Afficher un toast pour indiquer le début de l'opération
      toast({
        title: "Réparation des tokens",
        description: "Tentative d'enregistrement d'un nouveau token...",
        variant: "default"
      });
      
      // Utiliser la méthode directe via le serveur
      const success = await registerTokenForConsultantDirect(email, consultant || undefined);
      
      if (success) {
        toast({
          title: "Succès",
          description: "Le token a été enregistré avec succès",
          variant: "default"
        });
      } else {
        toast({
          title: "Échec",
          description: "Impossible d'enregistrer un nouveau token. Voir les logs pour plus de détails.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur lors de la réparation des tokens:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la réparation des tokens",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleFixTokens}
      className="flex items-center gap-2 text-sm text-white hover:bg-white/20 transition-colors duration-200 p-1.5 sm:p-2 rounded-md"
      type="button"
    >
      <Bell className="h-5 w-5" />
      <span className="hidden md:inline">Notifications</span>
    </button>
  );
}; 