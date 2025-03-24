'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface NotificationPreference {
  userId: string;
  task_assigned: boolean;
  communication_assigned: boolean;
  comment_added: boolean;
  system: boolean;
  reminder: boolean;
}

const defaultPreferences: Omit<NotificationPreference, 'userId'> = {
  task_assigned: true,
  communication_assigned: true,
  comment_added: true,
  system: true,
  reminder: true,
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokensCount, setTokensCount] = useState(0);

  // Récupérer les préférences de l'utilisateur
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.email) return;

      try {
        setLoading(true);
        const db = getFirestore();
        
        // Construire l'ID utilisateur
        const userId = consultant && consultant !== 'null' 
          ? `${user.email}_${consultant}` 
          : user.email;
        
        // Récupérer les préférences
        const preferencesRef = doc(db, 'notificationPreferences', userId);
        const preferencesSnapshot = await getDoc(preferencesRef);
        
        if (preferencesSnapshot.exists()) {
          setPreferences({
            userId,
            ...preferencesSnapshot.data() as Omit<NotificationPreference, 'userId'>
          });
        } else {
          // Créer des préférences par défaut
          setPreferences({
            userId,
            ...defaultPreferences
          });
        }
        
        // Compter les tokens
        const tokensRef = collection(db, 'notificationTokens');
        const tokensQuery = query(tokensRef, where('userId', '==', userId));
        const tokensSnapshot = await getDocs(tokensQuery);
        setTokensCount(tokensSnapshot.size);
        
      } catch (error) {
        console.error('Erreur lors de la récupération des préférences:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger vos préférences de notification',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.email, consultant, toast]);

  // Sauvegarder les préférences
  const savePreferences = async () => {
    if (!user?.email || !preferences) return;

    try {
      setSaving(true);
      const db = getFirestore();
      const preferencesRef = doc(db, 'notificationPreferences', preferences.userId);
      
      // Sauvegarder les préférences
      await setDoc(preferencesRef, {
        task_assigned: preferences.task_assigned,
        communication_assigned: preferences.communication_assigned,
        comment_added: preferences.comment_added,
        system: preferences.system,
        reminder: preferences.reminder,
      });
      
      toast({
        title: 'Préférences sauvegardées',
        description: 'Vos préférences de notification ont été mises à jour',
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos préférences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Supprimer tous les tokens
  const removeAllTokens = async () => {
    if (!user?.email || !preferences) return;

    try {
      setSaving(true);
      const db = getFirestore();
      
      // Récupérer tous les tokens
      const tokensRef = collection(db, 'notificationTokens');
      const tokensQuery = query(tokensRef, where('userId', '==', preferences.userId));
      const tokensSnapshot = await getDocs(tokensQuery);
      
      // Supprimer chaque token
      const deletionPromises = tokensSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletionPromises);
      
      setTokensCount(0);
      
      toast({
        title: 'Tokens supprimés',
        description: `Tous les tokens de notification (${tokensSnapshot.size}) ont été supprimés`,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression des tokens:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer tous les tokens',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Restaurer les valeurs par défaut
  const restoreDefaults = () => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      ...defaultPreferences
    });
  };

  // Changer une préférence spécifique
  const togglePreference = (key: keyof Omit<NotificationPreference, 'userId'>) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      [key]: !preferences[key]
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Connectez-vous pour gérer vos préférences de notification
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences de notification</CardTitle>
        <CardDescription>
          Personnalisez quels types de notifications vous souhaitez recevoir
          {consultant && consultant !== 'null' ? ` pour le consultant ${consultant}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="task_assigned">Tâches assignées</Label>
              <p className="text-sm text-muted-foreground">
                Soyez notifié lorsqu'une nouvelle tâche vous est assignée
              </p>
            </div>
            <Switch
              id="task_assigned"
              checked={preferences.task_assigned}
              onCheckedChange={() => togglePreference('task_assigned')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="communication_assigned">Communications assignées</Label>
              <p className="text-sm text-muted-foreground">
                Soyez notifié lorsqu'une nouvelle communication vous est assignée
              </p>
            </div>
            <Switch
              id="communication_assigned"
              checked={preferences.communication_assigned}
              onCheckedChange={() => togglePreference('communication_assigned')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="comment_added">Nouveaux commentaires</Label>
              <p className="text-sm text-muted-foreground">
                Soyez notifié lorsqu'un commentaire est ajouté à une tâche
              </p>
            </div>
            <Switch
              id="comment_added"
              checked={preferences.comment_added}
              onCheckedChange={() => togglePreference('comment_added')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminder">Rappels</Label>
              <p className="text-sm text-muted-foreground">
                Rappels quotidiens pour les tâches en attente ou en retard
              </p>
            </div>
            <Switch
              id="reminder"
              checked={preferences.reminder}
              onCheckedChange={() => togglePreference('reminder')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system">Notifications système</Label>
              <p className="text-sm text-muted-foreground">
                Notifications de système et de maintenance
              </p>
            </div>
            <Switch
              id="system"
              checked={preferences.system}
              onCheckedChange={() => togglePreference('system')}
            />
          </div>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <h4 className="text-sm font-medium mb-2">Appareils enregistrés</h4>
          <p className="text-sm text-muted-foreground">
            {tokensCount === 0 ? (
              "Aucun appareil n'est enregistré pour recevoir des notifications"
            ) : (
              `${tokensCount} appareil(s) enregistré(s) pour recevoir des notifications`
            )}
          </p>
          
          {tokensCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={removeAllTokens}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer tous les appareils'
              )}
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={restoreDefaults}
          disabled={saving}
        >
          Rétablir les valeurs par défaut
        </Button>
        <Button
          onClick={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer les préférences'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 