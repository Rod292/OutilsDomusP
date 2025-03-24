'use client';

import React, { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Bell, Check, AlertCircle } from "lucide-react";

export function SpecialNotificationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<{send: boolean; registerToken: boolean} | null>(null);
  
  // Fonction pour tester si les routes API existent
  const testApiRoutes = async () => {
    setIsLoading(true);
    try {
      const results = {
        send: false,
        registerToken: false
      };
      
      // Tester la route /api/notifications/send
      try {
        const sendResponse = await fetch('/api/notifications/send', { 
          method: 'HEAD',
          // Timeout court pour ne pas bloquer longtemps
          signal: AbortSignal.timeout(1000) 
        }).catch(() => null);
        
        results.send = !!sendResponse;
      } catch (error) {
        console.error("Erreur lors du test de la route send:", error);
      }
      
      // Tester la route /api/notifications/register-test-token-direct
      try {
        const registerResponse = await fetch('/api/notifications/register-test-token-direct', { 
          method: 'HEAD',
          // Timeout court pour ne pas bloquer longtemps
          signal: AbortSignal.timeout(1000) 
        }).catch(() => null);
        
        results.registerToken = !!registerResponse;
      } catch (error) {
        console.error("Erreur lors du test de la route register-token:", error);
      }
      
      setApiStatus(results);
      
      // Afficher le résultat
      toast({
        title: "Test des routes API",
        description: `Route /send: ${results.send ? '✅' : '❌'}, Route /register-token: ${results.registerToken ? '✅' : '❌'}`,
        variant: results.send && results.registerToken ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error("Erreur lors du test des routes API:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du test des routes API.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegisterToken = async () => {
    setIsLoading(true);
    try {
      // Vérifier si les notifications sont supportées
      if (typeof window === 'undefined' || !('Notification' in window)) {
        toast({
          title: "Erreur",
          description: "Les notifications ne sont pas supportées par ce navigateur.",
          variant: "destructive"
        });
        return;
      }
      
      // Demander la permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: "Permission refusée",
          description: "Vous devez autoriser les notifications pour recevoir des alertes.",
          variant: "destructive"
        });
        return;
      }
      
      // Utiliser la méthode directe via le serveur
      const response = await fetch('/api/notifications/register-test-token-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'photos.pers@gmail.com',
          consultant: 'npers',
          userAgent: navigator.userAgent,
          platform: navigator.platform
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Succès",
          description: `Les notifications pour npers@arthurloydbretagne.fr ont été activées sur cet appareil (${result.tokens} tokens créés).`,
          variant: "default"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.error || "Une erreur est survenue lors de l'enregistrement du token.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du token:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement du token.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour envoyer une notification de test simple
  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'photos.pers@gmail.com',
          title: 'Test de notification',
          body: 'Ceci est un test de notification depuis la page d\'accueil',
          type: 'test',
          taskId: 'test-task-id',
          communicationIndex: '0'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Succès",
          description: `Notification de test envoyée avec succès (${result.sent} appareils).`,
          variant: "default"
        });
      } else {
        const errorText = await response.text();
        let errorMessage = "Erreur lors de l'envoi de la notification";
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        toast({
          title: "Échec",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification de test:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi de la notification de test.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-medium">Outils de notification</h3>
      
      <div className="w-full space-y-2">
        {apiStatus && (
          <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1 mb-2">
            <div className="flex items-center gap-1">
              {apiStatus.send ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Route API /send: {apiStatus.send ? 'Accessible' : 'Non accessible'}</span>
            </div>
            <div className="flex items-center gap-1">
              {apiStatus.registerToken ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Route API /register-token: {apiStatus.registerToken ? 'Accessible' : 'Non accessible'}</span>
            </div>
          </div>
        )}
        
        <Button 
          variant="outline" 
          onClick={testApiRoutes} 
          disabled={isLoading}
          className="w-full"
        >
          <Bell className="mr-2 h-4 w-4" />
          Vérifier les routes API
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleRegisterToken} 
          disabled={isLoading}
          className="w-full"
        >
          <Bell className="mr-2 h-4 w-4" />
          {isLoading ? "Activation en cours..." : "Activer les notifications"}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={sendTestNotification}
          disabled={isLoading}
          className="w-full"
        >
          <Bell className="mr-2 h-4 w-4" />
          Envoyer une notification de test
        </Button>
      </div>
    </div>
  );
} 