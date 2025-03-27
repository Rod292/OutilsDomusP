"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/header';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, ClipboardList, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Type pour un état des lieux récent
interface RecentEtatDesLieux {
  id: string;
  adresseBien: string;
  typeEtatDesLieux: string;
  lastUpdated: string;
  createdAt: string;
  bailleur: {
    nom: string;
    prenom: string;
  };
  locataire: {
    nom: string;
    prenom: string;
  };
}

export default function MainLayout() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [recentEDLs, setRecentEDLs] = useState<RecentEtatDesLieux[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Référence pour le timer de rafraîchissement automatique
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Récupérer les états des lieux récents
  const fetchRecentEDLs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const edlRef = collection(db, "reports");
      const q = query(
        edlRef,
        where("userId", "==", user.uid),
        orderBy("lastUpdated", "desc"),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const edls: RecentEtatDesLieux[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Document récupéré:", doc.id, "- Structure:", Object.keys(data));
        console.log("Consultant trouvé:", data.consultant || "Non spécifié");
        
        // Vérifier différentes structures possibles de données
        let adresseBien = "Adresse non spécifiée";
        let typeEtatDesLieux = "non spécifié";
        let lastUpdated = data.lastUpdated || data.createdAt || new Date().toISOString();
        let createdAt = data.createdAt || lastUpdated;
        let bailleur = { nom: "", prenom: "" };
        let locataire = { nom: "", prenom: "" };
        
        // Si les données sont dans data.data (structure imbriquée)
        if (data.data && typeof data.data === 'object') {
          console.log("Structure imbriquée détectée (data.data)");
          adresseBien = data.data.adresseBien || data.title || adresseBien;
          typeEtatDesLieux = data.data.typeEtatDesLieux || typeEtatDesLieux;
          
          if (data.data.bailleur) {
            bailleur = {
              nom: data.data.bailleur.nom || "",
              prenom: data.data.bailleur.prenom || ""
            };
          }
          
          if (data.data.locataire) {
            locataire = {
              nom: data.data.locataire.nom || "",
              prenom: data.data.locataire.prenom || ""
            };
          }
        } else {
          // Structure directe
          console.log("Structure directe détectée");
          adresseBien = data.adresseBien || data.title || adresseBien;
          typeEtatDesLieux = data.typeEtatDesLieux || typeEtatDesLieux;
          
          if (data.bailleur) {
            bailleur = {
              nom: data.bailleur.nom || "",
              prenom: data.bailleur.prenom || ""
            };
          }
          
          if (data.locataire) {
            locataire = {
              nom: data.locataire.nom || "",
              prenom: data.locataire.prenom || ""
            };
          }
        }
        
        // Si le titre est disponible, l'utiliser comme adresse
        if (data.title && (!adresseBien || adresseBien === "Adresse non spécifiée")) {
          adresseBien = data.title;
        }
        
        edls.push({
          id: doc.id,
          adresseBien,
          typeEtatDesLieux,
          lastUpdated,
          createdAt,
          bailleur,
          locataire
        });
      });
      
      console.log(`Récupération de ${edls.length} états des lieux terminée`);
      setRecentEDLs(edls);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des états des lieux récents:", error);
      setLoading(false);
    }
  };
  
  // Configurer le rafraîchissement périodique des états des lieux
  useEffect(() => {
    // Ne charger les données que côté client, pas pendant le rendu statique
    if (typeof window !== 'undefined') {
      // Charger les EDLs au chargement initial
      fetchRecentEDLs();
      
      // Configurer un timer pour rafraîchir les EDLs toutes les 15 secondes
      refreshTimerRef.current = setInterval(() => {
        console.log("Rafraîchissement automatique des états des lieux récents...");
        fetchRecentEDLs();
      }, 15000); // 15 secondes
    } else {
      setLoading(false);
    }
    
    // Nettoyer le timer lors du démontage du composant
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [user]);
  
  // Fonction pour créer un nouvel état des lieux
  const handleCreateNewEDL = () => {
    // Rediriger vers la page de création d'état des lieux
    router.push('/etat-des-lieux/nouveau');
  };
  
  // Formatter les dates
  const formatDate = (dateString: string) => {
    if (!dateString) return "Date inconnue";
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return "Date invalide";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">États des Lieux</h1>
            <Button 
              onClick={handleCreateNewEDL}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau
            </Button>
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">États des lieux récents</h2>
            
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-blue-500">Chargement des états des lieux...</span>
              </div>
            ) : recentEDLs.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">Aucun état des lieux récent à afficher.</p>
                <p className="text-gray-500 text-sm mt-2">Créez votre premier état des lieux en cliquant sur le bouton "Nouveau".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentEDLs.map((edl) => (
                  <Link href={`/etat-des-lieux/edit/${edl.id}`} key={edl.id}>
                    <Card className="cursor-pointer hover:border-blue-300 transition-all">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{edl.adresseBien}</CardTitle>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            edl.typeEtatDesLieux === 'entree' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {edl.typeEtatDesLieux === 'entree' ? "Entrée" : "Sortie"}
                          </span>
                        </div>
                        <CardDescription>
                          {edl.bailleur.nom ? `Bailleur: ${edl.bailleur.prenom} ${edl.bailleur.nom}` : "Bailleur non spécifié"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-gray-600">
                          {edl.locataire.nom ? `Locataire: ${edl.locataire.prenom} ${edl.locataire.nom}` : "Locataire non spécifié"}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center pt-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Modifié le {formatDate(edl.lastUpdated)}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-blue-500" />
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t pt-4">
            <h2 className="text-xl font-semibold mb-4">Options avancées</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Exportation</CardTitle>
                  <CardDescription>Exportez vos états des lieux au format PDF</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Gérer les exportations
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres</CardTitle>
                  <CardDescription>Personnalisez vos modèles d'états des lieux</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Configurer
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 