'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from './hooks/useAuth';
import { requestNotificationPermission } from './services/notificationService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NOTIFICATION_CONFIG } from './api/notifications/config';

export default function TestNotifications() {
  const { user } = useAuth();
  const [consultantName, setConsultantName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useLocalMode, setUseLocalMode] = useState<boolean>(NOTIFICATION_CONFIG.USE_FCM === false);

  const handleRequestPermission = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      if (!user) {
        throw new Error("Vous devez être connecté pour tester les notifications");
      }
      
      if (!consultantName) {
        throw new Error("Veuillez entrer le nom du consultant");
      }
      
      // Demander la permission pour les notifications
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(`Permission refusée: ${permission}`);
      }
      
      console.log("Permission des notifications accordée!");
      setResult("Permission des notifications accordée, envoi de la notification de test...");
      
      // Envoyer une notification de test
      await testSendNotification();
    } catch (err) {
      console.error("Erreur lors de la demande de permission:", err);
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };
  
  const testSendNotification = async () => {
    try {
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }
      
      // Créer l'ID de l'utilisateur au format "email_consultant"
      const userId = `${user.email}_${consultantName}`;
      
      if (useLocalMode) {
        // Mode notification locale
        const { sendLocalNotification, createNotification } = await import('./services/notificationService');
      
        // Enregistrer la notification dans Firestore
        await createNotification({
          userId,
          title: "🧪 Test de Notification",
          body: `Ceci est un test de notification locale pour ${consultantName}`,
          type: "system",
          read: false
        });
        
        // Envoyer une notification locale
        await sendLocalNotification({
          title: "🧪 Test de Notification",
          body: `Ceci est un test de notification locale pour ${consultantName}`,
          data: { type: "system" }
        });
        
        setResult(`Notification locale envoyée à ${userId} avec succès!`);
      } else {
        // Mode API
        const response = await fetch('/api/notifications/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}`);
        }
        
        console.log("Résultat du test de notification:", data);
        setResult(`Notification envoyée à ${userId} avec succès! ${data.message || ''}`);
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi de la notification de test:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Test des Notifications</CardTitle>
        <CardDescription>
          Testez l'envoi de notifications pour un consultant spécifique
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="consultant" className="text-sm font-medium">
              Nom du Consultant
            </label>
            <Input
              id="consultant"
              placeholder="Ex: durand"
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Entrez seulement le nom (sans @example.com)
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="localMode"
              checked={useLocalMode}
              onChange={(e) => setUseLocalMode(e.target.checked)}
            />
            <label htmlFor="localMode" className="text-sm">
              Utiliser le mode local (sans FCM)
            </label>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <Alert>
              <AlertTitle>Résultat</AlertTitle>
              <AlertDescription>{result}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleRequestPermission} 
          disabled={loading || !consultantName}
          className="w-full"
        >
          {loading && <span className="mr-2 inline-block animate-spin">⟳</span>}
          Tester les Notifications
        </Button>
      </CardFooter>
    </Card>
  );
} 