"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/app/components/ui/separator";
import { LoadingSpinner } from "@/app/components/ui/loading";
import { Header } from "@/app/components/header";
import { useSearchParams } from "next/navigation";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface NotificationPreference {
  id: string;
  userId: string;
  consultantEmail: string;
  consultantName: string;
  taskAssigned: boolean;
  communicationAssigned: boolean;
  taskReminders: boolean;
  createdAt: Date;
}

// Composant principal enveloppé dans un Suspense
const NotificationsPreferencesWrapper = () => {
  return (
    <Suspense fallback={
      <>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      </>
    }>
      <NotificationPreferencesPage />
    </Suspense>
  );
};

// Page principale de préférences de notifications
const NotificationPreferencesPage = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const highlightConsultant = searchParams.get('highlight');

  // Charger les membres de l'équipe et les préférences actuelles
  useEffect(() => {
    if (!user?.email) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        
        // Charger les membres de l'équipe
        const teamSnapshot = await getDocs(collection(db, "teamMembers"));
        const members: TeamMember[] = [];
        
        teamSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.email) {
            members.push({
              id: doc.id,
              name: data.name || data.email.split('@')[0],
              email: data.email,
              role: data.role
            });
          }
        });
        
        // Trier par nom
        members.sort((a, b) => a.name.localeCompare(b.name));
        setTeamMembers(members);
        
        // Charger les préférences de l'utilisateur
        const prefsQuery = query(
          collection(db, "notificationPreferences"),
          where("userId", "==", user.email)
        );
        
        const prefsSnapshot = await getDocs(prefsQuery);
        const userPrefs: Record<string, NotificationPreference> = {};
        
        prefsSnapshot.forEach((doc) => {
          const data = doc.data();
          userPrefs[data.consultantEmail] = {
            id: doc.id,
            userId: data.userId,
            consultantEmail: data.consultantEmail,
            consultantName: data.consultantName,
            taskAssigned: data.taskAssigned ?? true,
            communicationAssigned: data.communicationAssigned ?? true,
            taskReminders: data.taskReminders ?? true,
            createdAt: data.createdAt?.toDate() || new Date()
          };
        });
        
        setPreferences(userPrefs);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement des préférences");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Mettre à jour une préférence
  const updatePreference = async (consultantEmail: string, type: keyof NotificationPreference, value: boolean) => {
    if (!user?.email) return;
    
    try {
      const db = getFirestore();
      const consultantName = teamMembers.find(m => m.email === consultantEmail)?.name || consultantEmail.split('@')[0];
      
      // Mettre à jour l'état local
      setPreferences(prev => {
        const newPrefs = { ...prev };
        
        if (newPrefs[consultantEmail]) {
          // Préférence existante
          newPrefs[consultantEmail] = {
            ...newPrefs[consultantEmail],
            [type]: value
          };
        } else {
          // Nouvelle préférence
          newPrefs[consultantEmail] = {
            id: `pref_${Date.now()}`,
            userId: user.email as string,
            consultantEmail,
            consultantName,
            taskAssigned: type === 'taskAssigned' ? value : true,
            communicationAssigned: type === 'communicationAssigned' ? value : true,
            taskReminders: type === 'taskReminders' ? value : true,
            createdAt: new Date()
          };
        }
        
        return newPrefs;
      });
      
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      toast.error("Erreur lors de la mise à jour des préférences");
    }
  };

  // Sauvegarder toutes les préférences
  const saveAllPreferences = async () => {
    if (!user?.email) return;
    
    setSaving(true);
    try {
      const db = getFirestore();
      const batch = writeBatch(db);
      
      // D'abord, supprimer toutes les préférences existantes
      const prefsQuery = query(
        collection(db, "notificationPreferences"),
        where("userId", "==", user.email)
      );
      
      const prefsSnapshot = await getDocs(prefsQuery);
      prefsSnapshot.forEach((document) => {
        batch.delete(document.ref);
      });
      
      // Ensuite, ajouter les nouvelles préférences
      Object.values(preferences).forEach((pref) => {
        const prefDoc = doc(collection(db, "notificationPreferences"));
        batch.set(prefDoc, {
          userId: user.email,
          consultantEmail: pref.consultantEmail,
          consultantName: pref.consultantName,
          taskAssigned: pref.taskAssigned,
          communicationAssigned: pref.communicationAssigned,
          taskReminders: pref.taskReminders,
          createdAt: new Date()
        });
      });
      
      await batch.commit();
      toast.success("Préférences enregistrées avec succès");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des préférences:", error);
      toast.error("Erreur lors de l'enregistrement des préférences");
    } finally {
      setSaving(false);
    }
  };

  // Activer/désactiver toutes les notifications pour un consultant
  const toggleAllForConsultant = (consultantEmail: string, enabled: boolean) => {
    if (!user?.email) return;
    
    setPreferences(prev => {
      const newPrefs = { ...prev };
      const consultantName = teamMembers.find(m => m.email === consultantEmail)?.name || consultantEmail.split('@')[0];
      
      newPrefs[consultantEmail] = {
        id: newPrefs[consultantEmail]?.id || `pref_${Date.now()}`,
        userId: user.email as string,
        consultantEmail,
        consultantName,
        taskAssigned: enabled,
        communicationAssigned: enabled,
        taskReminders: enabled,
        createdAt: newPrefs[consultantEmail]?.createdAt || new Date()
      };
      
      return newPrefs;
    });
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500">Chargement des préférences de notifications...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Préférences de notifications</h1>
        <p className="text-gray-500 mb-8">
          Configurez pour quels consultants vous souhaitez recevoir des notifications et quels types de notifications.
        </p>

        <div className="flex justify-end mb-6">
          <Button 
            onClick={saveAllPreferences} 
            disabled={saving || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer les préférences"
            )}
          </Button>
        </div>

        {teamMembers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Aucun consultant trouvé dans l'équipe.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => {
              const pref = preferences[member.email] || {
                taskAssigned: true,
                communicationAssigned: true,
                taskReminders: true
              };
              
              const isAnyEnabled = pref.taskAssigned || pref.communicationAssigned || pref.taskReminders;
              const isHighlighted = highlightConsultant === member.email;
              
              return (
                <Card 
                  key={member.id} 
                  className={`overflow-hidden transition-all duration-200 ${isAnyEnabled ? 'border-blue-300 shadow-md' : 'border-gray-200'} ${isHighlighted ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                >
                  <CardHeader className={`pb-3 ${isHighlighted ? 'bg-blue-50' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl">{member.name}</CardTitle>
                        <CardDescription className="text-sm">{member.email}</CardDescription>
                        {isHighlighted && <p className="text-xs text-blue-600 mt-1">Consultant mis en évidence</p>}
                      </div>
                      <Switch 
                        checked={isAnyEnabled}
                        onCheckedChange={(checked: boolean) => toggleAllForConsultant(member.email, checked)}
                      />
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`task-${member.id}`} className="flex-1">
                          Tâches assignées
                        </Label>
                        <Switch 
                          id={`task-${member.id}`}
                          checked={pref.taskAssigned}
                          onCheckedChange={(checked: boolean) => updatePreference(member.email, 'taskAssigned', checked)}
                          disabled={!isAnyEnabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`comm-${member.id}`} className="flex-1">
                          Communications assignées
                        </Label>
                        <Switch 
                          id={`comm-${member.id}`}
                          checked={pref.communicationAssigned}
                          onCheckedChange={(checked: boolean) => updatePreference(member.email, 'communicationAssigned', checked)}
                          disabled={!isAnyEnabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`remind-${member.id}`} className="flex-1">
                          Rappels de tâches
                        </Label>
                        <Switch 
                          id={`remind-${member.id}`}
                          checked={pref.taskReminders}
                          onCheckedChange={(checked: boolean) => updatePreference(member.email, 'taskReminders', checked)}
                          disabled={!isAnyEnabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

// Exporter le wrapper avec Suspense comme composant principal
export default NotificationsPreferencesWrapper; 