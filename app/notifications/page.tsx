'use client';

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { NotificationSettings } from '../components/notifications/NotificationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  initializeNotificationPreferences, 
  initializeTeamMembersCollection, 
  syncNotificationPreferencesWithTeamMembers,
  requestNotificationPermission,
  areNotificationsSupported,
  associatePersonalEmailWithConsultant
} from '../services/notificationService';
import { Header } from '../components/header';
import { Suspense } from 'react';
import { Button } from '../components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Type pour un consultant
interface Consultant {
  id: string;
  name: string;
  email: string;
}

// Composant pour associer un email personnel
const EmailAssociationForm = () => {
  const [personalEmail, setPersonalEmail] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger la liste des consultants
  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const db = getFirestore();
        const teamMembersRef = collection(db, 'teamMembers');
        const snapshot = await getDocs(teamMembersRef);
        
        const consultantList: Consultant[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Consultant;
          consultantList.push({
            id: data.id || doc.id,
            name: data.name || 'Sans nom',
            email: data.email || ''
          });
        });
        
        setConsultants(consultantList);
      } catch (error) {
        console.error('Erreur lors du chargement des consultants:', error);
      }
    };
    
    fetchConsultants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!personalEmail || !selectedConsultant) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Trouver le consultant sélectionné
      const consultant = consultants.find(c => c.id === selectedConsultant);
      
      if (!consultant) {
        toast({
          title: "Erreur",
          description: "Consultant non trouvé",
          variant: "destructive"
        });
        return;
      }
      
      // Associer l'email personnel
      const success = await associatePersonalEmailWithConsultant(
        personalEmail,
        consultant.email,
        consultant.name
      );
      
      if (success) {
        toast({
          title: "Association réussie",
          description: `Vous recevrez désormais les notifications destinées à ${consultant.name}`,
          variant: "default"
        });
        
        // Réinitialiser le formulaire
        setPersonalEmail('');
        setSelectedConsultant('');
      } else {
        toast({
          title: "Erreur",
          description: "L'association a échoué",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'association:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'association",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Associer votre email personnel</CardTitle>
        <CardDescription>
          Recevez les notifications destinées à un consultant sur votre appareil personnel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personalEmail">Votre email personnel</Label>
            <Input
              id="personalEmail"
              type="email"
              placeholder="votreemail@exemple.com"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="consultant">Consultant à associer</Label>
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un consultant" />
              </SelectTrigger>
              <SelectContent>
                {consultants.map((consultant) => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {consultant.name} ({consultant.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Association en cours..." : "Associer l'email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function NotificationsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);

  // Vérifier si les notifications sont supportées
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await areNotificationsSupported();
      setNotificationSupported(supported);
    };
    
    checkSupport();
  }, []);

  // Fonction pour demander les permissions et initialiser les notifications
  const handleEnableNotifications = async () => {
    try {
      const result = await requestNotificationPermission();
      
      if (result.status === 'granted') {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais des notifications pour les nouvelles tâches assignées.",
          variant: "default"
        });
      } else {
        toast({
          title: "Notifications refusées",
          description: "Vous ne recevrez pas de notifications. Vous pouvez changer ce paramètre dans les préférences de votre navigateur.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'activation des notifications.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const email = user?.email || null;
      setUserEmail(email);
      
      // Si l'utilisateur est connecté, initialiser ses préférences
      if (email && !isInitialized) {
        try {
          // S'assurer que la collection teamMembers existe
          await initializeTeamMembersCollection();
          
          // Initialiser et synchroniser les préférences de notification
          await initializeNotificationPreferences(email);
          
          // Synchroniser les préférences avec les consultants existants
          await syncNotificationPreferencesWithTeamMembers(email);
          
          setIsInitialized(true);
        } catch (error) {
          console.error('Erreur lors de l\'initialisation des préférences:', error);
        }
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isInitialized]);

  if (isLoading) {
    return (
      <div>
        <Suspense fallback={<div>Chargement de l'en-tête...</div>}>
          <Header />
        </Suspense>
        <div className="container max-w-4xl mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des notifications</CardTitle>
              <CardDescription>Chargement...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div>
        <Suspense fallback={<div>Chargement de l'en-tête...</div>}>
          <Header />
        </Suspense>
        <div className="container max-w-4xl mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des notifications</CardTitle>
              <CardDescription>Vous devez être connecté pour accéder à cette page.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Suspense fallback={<div>Chargement de l'en-tête...</div>}>
        <Header />
      </Suspense>
      <div className="container max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Gestion des notifications</h1>
        
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>À propos des notifications</CardTitle>
              <CardDescription>Comment fonctionnent les notifications ?</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-2">
                Les notifications vous permettent d'être informé des nouvelles tâches et des rappels pour vos activités.
              </p>
              <ul className="list-disc pl-5 space-y-1 mb-4">
                <li>Vous pouvez recevoir des notifications pour les nouvelles tâches assignées à des consultants spécifiques</li>
                <li>Les rappels vous aident à ne pas manquer les échéances importantes</li>
                <li>Les notifications sont activées séparément pour chaque appareil que vous utilisez</li>
                <li>Pour recevoir des notifications sur votre téléphone, ajoutez le site à votre écran d'accueil</li>
              </ul>
              
              {notificationSupported && (
                <Button onClick={handleEnableNotifications} className="mt-2">
                  Activer les notifications sur cet appareil
                </Button>
              )}
              {!notificationSupported && (
                <p className="text-yellow-600 dark:text-yellow-400">
                  Votre navigateur ne semble pas prendre en charge les notifications.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ajout du formulaire d'association d'email */}
        <EmailAssociationForm />

        <NotificationSettings userEmail={userEmail} />
      </div>
    </div>
  );
} 