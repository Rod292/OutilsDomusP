'use client';

import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '../ui/loading';

interface NotificationSettingsProps {
  userEmail: string | null;
}

export default function NotificationSettings({ userEmail }: NotificationSettingsProps) {
  // États
  const [preferences, setPreferences] = useState({
    general: {
      enabled: true,
      newTasks: true,
      taskUpdates: true,
      mentions: true,
    },
    byConsultant: {} as Record<string, boolean>,
  });
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Charger les préférences utilisateur et les membres de l'équipe
  useEffect(() => {
    if (userEmail) {
      const loadData = async () => {
        try {
          await loadPreferences(userEmail);
          await loadTeamMembers();
        } catch (error) {
          console.error('Erreur lors du chargement des données:', error);
        }
      };
      
      loadData();
    } else {
      setLoading(false);
    }
  }, [userEmail]);
  
  // Charger les membres de l'équipe
  const loadTeamMembers = async () => {
    try {
      const teamMembersRef = collection(db, 'teamMembers');
      const snapshot = await getDocs(teamMembersRef);
      
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTeamMembers(members);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les membres de l'équipe",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  
  // Charger les préférences depuis Firestore
  const loadPreferences = async (email: string) => {
    try {
      const prefsRef = doc(db, 'notificationPreferences', email);
      const prefsDoc = await getDoc(prefsRef);
      
      if (prefsDoc.exists()) {
        const data = prefsDoc.data();
        setPreferences({
          general: {
            enabled: data.enabled ?? true,
            newTasks: data.newTasks ?? true,
            taskUpdates: data.taskUpdates ?? true,
            mentions: data.mentions ?? true,
          },
          byConsultant: data.byConsultant || {},
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos préférences de notification",
        variant: "destructive"
      });
    }
  };
  
  // Gérer le changement d'une préférence générale
  const handleGeneralToggle = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      general: {
        ...prev.general,
        [key]: key === 'enabled' 
          ? !prev.general.enabled
          : prev.general.enabled ? !prev.general[key as keyof typeof prev.general] : false
      }
    }));
  };
  
  // Gérer le changement d'une préférence par consultant
  const handleConsultantToggle = (consultantId: string) => {
    setPreferences(prev => ({
      ...prev,
      byConsultant: {
        ...prev.byConsultant,
        [consultantId]: !prev.byConsultant[consultantId],
      }
    }));
  };
  
  // Sauvegarder les préférences
  const savePreferences = async () => {
    if (!userEmail) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour sauvegarder vos préférences",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    
    try {
      const prefsRef = doc(db, 'notificationPreferences', userEmail);
      await setDoc(prefsRef, {
        ...preferences.general,
        byConsultant: preferences.byConsultant,
        updatedAt: new Date(),
      }, { merge: true });
      
      toast({
        title: "Succès",
        description: "Préférences sauvegardées avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder vos préférences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!userEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Préférences de notification</CardTitle>
          <p className="text-sm text-gray-500">Connectez-vous pour gérer vos préférences</p>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Préférences de notification</CardTitle>
        <p className="text-sm text-gray-500">Gérez vos notifications pour les tâches et les consultants</p>
      </CardHeader>
      
      <CardContent>
        <div className="flex border-b mb-4">
          <button 
            className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-primary font-medium' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            Général
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'consultants' ? 'border-b-2 border-primary font-medium' : ''}`}
            onClick={() => setActiveTab('consultants')}
          >
            Consultants
          </button>
        </div>
        
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications-enabled" className="text-base font-medium">
                  Activer les notifications
                </Label>
                <p className="text-sm text-gray-500">Recevoir des notifications pour cette application</p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={preferences.general.enabled}
                onCheckedChange={() => handleGeneralToggle('enabled')}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Types de notifications</h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="new-tasks" className="flex-1">Nouvelles tâches</Label>
                <Switch
                  id="new-tasks"
                  disabled={!preferences.general.enabled}
                  checked={preferences.general.enabled && preferences.general.newTasks}
                  onCheckedChange={() => handleGeneralToggle('newTasks')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="task-updates" className="flex-1">Mises à jour de tâches</Label>
                <Switch
                  id="task-updates"
                  disabled={!preferences.general.enabled}
                  checked={preferences.general.enabled && preferences.general.taskUpdates}
                  onCheckedChange={() => handleGeneralToggle('taskUpdates')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="mentions" className="flex-1">Mentions</Label>
                <Switch
                  id="mentions"
                  disabled={!preferences.general.enabled}
                  checked={preferences.general.enabled && preferences.general.mentions}
                  onCheckedChange={() => handleGeneralToggle('mentions')}
                />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'consultants' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Sélectionnez les consultants pour lesquels vous souhaitez recevoir des notifications</p>
            
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {member.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
                <Switch
                  id={`consultant-${member.id}`}
                  disabled={!preferences.general.enabled}
                  checked={preferences.general.enabled && (preferences.byConsultant[member.id] !== false)}
                  onCheckedChange={() => handleConsultantToggle(member.id)}
                />
              </div>
            ))}
            
            {teamMembers.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                Aucun consultant trouvé
              </div>
            )}
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" /> 
                Enregistrement...
              </>
            ) : (
              'Enregistrer les préférences'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 