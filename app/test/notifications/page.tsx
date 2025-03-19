"use client";

import React from "react";
import TestNotifications from "../../test-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NOTIFICATION_CONFIG } from "../../api/notifications/config";

export default function NotificationsTestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Test des Notifications</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <TestNotifications />
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mode actuel</CardTitle>
              <CardDescription>Configuration du système de notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>Mode FCM</AlertTitle>
                <AlertDescription>
                  {NOTIFICATION_CONFIG.USE_FCM 
                    ? "Les notifications utilisent Firebase Cloud Messaging" 
                    : "Les notifications utilisent le mode local (sans FCM)"}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">API Key requise</span>
                  <span>{NOTIFICATION_CONFIG.USE_API_KEY ? "Oui" : "Non"}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Stockage Firestore</span>
                  <span>{NOTIFICATION_CONFIG.STORE_NOTIFICATIONS ? "Actif" : "Inactif"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Guide de dépannage</CardTitle>
              <CardDescription>Résoudre les problèmes courants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Erreur d'authentification (401)</h3>
                  <p className="text-sm text-gray-600">
                    Si vous rencontrez une erreur 401 avec FCM, vérifiez la VAPID key dans le fichier .env.local et assurez-vous que le domaine est autorisé dans Firebase.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Service Worker non chargé</h3>
                  <p className="text-sm text-gray-600">
                    Vérifiez que le fichier firebase-messaging-sw.js est correctement chargé dans le navigateur et qu'il est à la racine du site.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Mode local</h3>
                  <p className="text-sm text-gray-600">
                    Le mode local utilise les Notifications API du navigateur et fonctionne même sans FCM. Utile pour le développement et les tests.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Comment basculer entre les modes</h3>
                  <p className="text-sm text-gray-600">
                    Modifiez la valeur USE_FCM dans le fichier app/api/notifications/config.ts pour basculer entre FCM et le mode local.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 