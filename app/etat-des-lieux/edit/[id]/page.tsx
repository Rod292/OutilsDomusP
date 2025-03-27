"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Header } from '../../../components/header';
import { EtatDesLieuxForm } from '@/app/components/etat-des-lieux-form';
import { useAuth } from '@/app/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export default function EditEtatDesLieux() {
  const { setTheme } = useTheme();
  const { user, loading: userLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [edlData, setEdlData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Définir le thème clair pour cette page
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  
  // Rediriger si non connecté
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/login?redirect=/etat-des-lieux/edit/${id}`);
    }
  }, [user, userLoading, router, id]);
  
  // Récupérer les données de l'état des lieux
  useEffect(() => {
    const fetchEdlData = async () => {
      if (!user || !id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const edlRef = doc(db, "reports", id);
        const edlSnap = await getDoc(edlRef);
        
        if (edlSnap.exists()) {
          const data = edlSnap.data();
          
          // Vérifier que l'utilisateur est bien le propriétaire
          if (data.userId === user.uid) {
            setEdlData(data);
          } else {
            setError("Vous n'avez pas accès à cet état des lieux.");
            toast({
              title: "Accès refusé",
              description: "Vous n'avez pas la permission d'accéder à cet état des lieux.",
              variant: "destructive",
            });
          }
        } else {
          setError("Cet état des lieux n'existe pas.");
          toast({
            title: "Non trouvé",
            description: "L'état des lieux demandé n'a pas été trouvé.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération de l'état des lieux:", err);
        setError("Une erreur s'est produite lors de la récupération de l'état des lieux.");
        toast({
          title: "Erreur",
          description: "Impossible de charger l'état des lieux demandé.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEdlData();
  }, [user, id]);
  
  const handleRapportGenerated = (rapport: any, formData: any) => {
    // Gérer la génération du rapport PDF
    console.log("Rapport généré avec succès");
  };

  // Fonction pour extraire les données correctes du document Firestore
  const processEdlData = (data: any) => {
    // Vérifier si les données sont dans un sous-objet 'data'
    if (data.data && typeof data.data === 'object') {
      console.log("Le rapport utilise la structure avec un sous-objet 'data'");
      return {
        ...data.data,
        // Conserver les métadonnées importantes au niveau racine
        _id: id,  // Ajouter l'ID pour permettre la mise à jour
        _createdAt: data.createdAt || data.date,
        _consultant: data.consultant || "Consultant",
        _title: data.title || ""
      };
    } else {
      // Structure à plat, sans sous-objet data
      console.log("Le rapport utilise une structure plate");
      return {
        ...data,
        // Ajouter les métadonnées
        _id: id,
        _createdAt: data.createdAt || data.date,
        _consultant: data.consultant || "Consultant"
      };
    }
  };
  
  if (userLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <h2 className="text-lg font-medium">Chargement de l'état des lieux...</h2>
          </div>
        </main>
      </div>
    );
  }
  
  if (!user) {
    return null; // Redirection en cours
  }
  
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-center">
                <h2 className="text-xl font-bold mb-2">Erreur</h2>
                <p>{error}</p>
              </div>
              <Button 
                onClick={() => router.push('/etat-des-lieux')}
                className="mt-4"
              >
                Retour aux états des lieux
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Modifier l'état des lieux</h1>
            <button
              onClick={() => router.push('/etat-des-lieux')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 flex items-center text-sm"
            >
              Retour
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700 text-sm">
              <strong>Important :</strong> Votre travail est automatiquement sauvegardé à chaque modification.
              Vous pouvez quitter cette page et y revenir plus tard, votre état des lieux sera accessible depuis la page d'accueil.
            </p>
          </div>
          
          {edlData && (
            <EtatDesLieuxForm
              initialData={processEdlData(edlData)}
              onRapportGenerated={handleRapportGenerated}
              onProgressUpdate={(data) => console.log("Progression mise à jour")}
              consultantName={user?.displayName || user?.email || "Consultant"}
              editMode={true}
            />
          )}
        </div>
      </main>
    </div>
  );
} 