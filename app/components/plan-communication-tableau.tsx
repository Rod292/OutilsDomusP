"use client";

import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc, serverTimestamp, orderBy, Firestore } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Edit, Trash2, Download, Filter, Search, Calendar, Linkedin, Instagram, Facebook, Twitter, Globe, Mail } from 'lucide-react';

// Types
interface CommunicationPost {
  id: string;
  title: string;
  content: string;
  ville: string;
  typeActivite: string;
  typeClient: string;
  thematiques: string[];
  plateforme: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  scheduledDate?: Date;
}

interface Consultant {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: {
    villes: string[];
    activites: string[];
  };
}

interface PlanCommunicationTableauProps {
  consultant?: string | null;
}

// Options de filtrage
const VILLES = ["Brest", "Quimper", "Morlaix", "Lorient", "Vannes", "Rennes"];
const TYPES_ACTIVITE = ["Bureaux", "Commerces", "Locaux d'activité", "Entrepôts", "Terrains"];
const TYPES_CLIENT = ["Nouvelle installation", "Client établi"];
const PLATEFORMES = ["Instagram", "LinkedIn", "Site web"];
const THEMATIQUES = [
  "Veille juridique", 
  "Actualités locales", 
  "Tendances immobilières", 
  "Conseils pratiques", 
  "Succès clients", 
  "Nouveaux biens", 
  "Événements", 
  "Développement durable",
  "Aménagement d'espaces"
];

// Mappages des villes aux régions
const VILLE_TO_REGION: {[key: string]: string} = {
  "Brest": "Finistère",
  "Quimper": "Finistère",
  "Morlaix": "Finistère",
  "Lorient": "Morbihan",
  "Vannes": "Morbihan",
  "Rennes": "Côtes d'Armor"
};

// Mappages des types d'activité aux catégories
const ACTIVITE_TO_CATEGORY: {[key: string]: string} = {
  "Bureaux": "Bureaux",
  "Commerces": "Commerces", 
  "Locaux d'activité": "Locaux",
  "Entrepôts": "Locaux",
  "Terrains": "Terrains"
};

// Couleurs par thématique (régions, types de biens, et autres thématiques)
const THEME_COLORS: {[key: string]: string} = {
  // Régions
  "Finistère": "bg-blue-100 text-blue-800 border-blue-200",
  "Morbihan": "bg-green-100 text-green-800 border-green-200",
  "Côtes d'Armor": "bg-yellow-100 text-yellow-800 border-yellow-200",
  // Types de biens
  "Bureaux": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Commerces": "bg-red-100 text-red-800 border-red-200",
  "Locaux": "bg-orange-100 text-orange-800 border-orange-200",
  "Terrains": "bg-emerald-100 text-emerald-800 border-emerald-200",
  // Autres thématiques
  "Veille juridique": "bg-purple-100 text-purple-800 border-purple-200",
  "Actualités locales": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Autre-region": "bg-gray-100 text-gray-800 border-gray-200",
  "Autre-categorie": "bg-gray-100 text-gray-800 border-gray-200"
};

// Ajout des constantes pour le calendrier
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// Typage correct pour les plateformes
const PLATFORMS = PLATEFORMES as ReadonlyArray<string>;

// Constantes pour les couleurs par plateforme avec type indexable
const PLATFORM_COLORS: {[key: string]: { bg: string; text: string; badge: string; hover: string }} = {
  "Instagram": { bg: "bg-pink-50", text: "text-pink-700", badge: "bg-pink-100 text-pink-800", hover: "hover:bg-pink-100" },
  "LinkedIn": { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-800", hover: "hover:bg-blue-100" },
  "Site web": { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", hover: "hover:bg-emerald-100" },
};

// Icônes pour les plateformes avec type indexable
const PLATFORM_ICONS: {[key: string]: JSX.Element} = {
  "Instagram": <Instagram className="h-3 w-3 mr-1" />,
  "LinkedIn": <Linkedin className="h-3 w-3 mr-1" />,
  "Site web": <Globe className="h-3 w-3 mr-1" />,
};

// Modification pour ne garder que LinkedIn et Instagram dans les légendes
const PLATFORMS_TO_DISPLAY = ["LinkedIn", "Instagram", "Site web"];

// Organisation intelligente des thématiques par jour de la semaine
const THEME_SCHEDULE = {
  1: ["Finistère", "Actualités locales"], // Lundi: Finistère et Actualités locales
  2: ["Morbihan", "Bureaux"], // Mardi: Morbihan et Bureaux
  3: ["Côtes d'Armor", "Veille juridique"], // Mercredi: Côtes d'Armor et Veille juridique
  4: ["Locaux", "Commerces"], // Jeudi: Locaux d'activité et Commerces
  5: ["Terrains", "Événements"], // Vendredi: Terrains et Événements
  6: [], // Samedi: Pas de communication
  0: []  // Dimanche: Pas de communication
};

// Fonction pour vérifier si un jour est un jour de travail (excluant weekend)
const isWorkDay = (date: Date): boolean => {
  const day = date.getDay(); // 0 = Dimanche, 6 = Samedi
  return day !== 0 && day !== 6;
};

// Création d'une nouvelle fonction pour obtenir la couleur par thématique basée sur la ville ou le type d'activité
const getThemeColorByRegionOrCategory = (item: CommunicationPost | null, prioritizeRegion: boolean = true): string => {
  if (!item) return "bg-white border border-gray-200 hover:bg-gray-50";
  
  const region = VILLE_TO_REGION[item.ville] || "Autre-region";
  const category = ACTIVITE_TO_CATEGORY[item.typeActivite] || "Autre-categorie";
  
  // On peut prioriser soit la région, soit la catégorie pour la couleur
  if (prioritizeRegion) {
    return THEME_COLORS[region] || "bg-gray-100 text-gray-800 border-gray-200";
  } else {
    return THEME_COLORS[category] || "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Fonction pour obtenir la couleur basée sur la ville et le type de bien
const getThemeColor = (city: string, propertyType: string): string => {
  // Déterminer la région
  const region = VILLE_TO_REGION[city] || "Autre-region";
  
  // Déterminer la catégorie
  const category = ACTIVITE_TO_CATEGORY[propertyType] || "Autre-categorie";
  
  // Prioriser la couleur de la région (mais on pourrait aussi prioriser la catégorie)
  return THEME_COLORS[region];
};

export default function PlanCommunicationTableau({ consultant }: PlanCommunicationTableauProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunicationPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<CommunicationPost[]>([]);
  const [activeFilters, setActiveFilters] = useState({
    ville: "all",
    typeActivite: "all",
    typeClient: "all",
    thematique: "all",
    plateforme: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPost, setCurrentPost] = useState<CommunicationPost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [consultantInfo, setConsultantInfo] = useState<Consultant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Variables d'état pour le drag and drop
  const [dragging, setDragging] = useState<string | null>(null);
  const [draggedPost, setDraggedPost] = useState<CommunicationPost | null>(null);
  
  // Champs du formulaire
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ville, setVille] = useState("");
  const [typeActivite, setTypeActivite] = useState("");
  const [typeClient, setTypeClient] = useState("");
  const [plateforme, setPlateforme] = useState("");
  const [selectedThematiques, setSelectedThematiques] = useState<string[]>([]);

  // Ajout des nouvelles variables
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('calendar');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Ajout de la définition de formData qui était manquante
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    content: string;
    ville: string;
    typeActivite: string;
    typeClient: string;
    plateforme: string;
    thematiques: string[];
    scheduledDate?: Date;
  }>({
    title: '',
    content: '',
    ville: '',
    typeActivite: '',
    typeClient: '',
    plateforme: '',
    thematiques: [],
    scheduledDate: new Date(),
  });

  // Références pour le drag and drop
  const dragSourceRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<HTMLDivElement>(null);

  // Récupérer les informations du consultant
  useEffect(() => {
    if (user && db) {
      const fetchConsultantInfo = async () => {
        const firestore = db as Firestore;
        const q = query(collection(firestore, "consultants"), where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const consultantData = querySnapshot.docs[0].data() as Consultant;
          consultantData.id = querySnapshot.docs[0].id;
          setConsultantInfo(consultantData);
        } else {
          // Consultant non trouvé, créer un profil par défaut
          const newConsultant: Consultant = {
            id: "temp",
            name: user.displayName || user.email || "Consultant",
            email: user.email || "",
            role: "consultant",
            permissions: {
              villes: VILLES,
              activites: TYPES_ACTIVITE,
            }
          };
          setConsultantInfo(newConsultant);
        }
        setLoading(false);
      };

      fetchConsultantInfo();
    }
  }, [user]);

  // Récupérer les posts de communication
  useEffect(() => {
    if (user && db) {
      const firestore = db as Firestore;
      const q = collection(firestore, "communicationPosts");
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const postsData: CommunicationPost[] = [];
        querySnapshot.forEach((doc) => {
          postsData.push({ id: doc.id, ...doc.data() } as CommunicationPost);
        });
        setPosts(postsData);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Filtrer les posts
  useEffect(() => {
    let filtered = [...posts];

    // Appliquer les filtres
    if (activeFilters.ville && activeFilters.ville !== "all") {
      filtered = filtered.filter(post => post.ville === activeFilters.ville);
    }
    if (activeFilters.typeActivite && activeFilters.typeActivite !== "all") {
      filtered = filtered.filter(post => post.typeActivite === activeFilters.typeActivite);
    }
    if (activeFilters.typeClient && activeFilters.typeClient !== "all") {
      filtered = filtered.filter(post => post.typeClient === activeFilters.typeClient);
    }
    if (activeFilters.thematique && activeFilters.thematique !== "all") {
      filtered = filtered.filter(post => post.thematiques.includes(activeFilters.thematique));
    }
    if (activeFilters.plateforme && activeFilters.plateforme !== "all") {
      filtered = filtered.filter(post => post.plateforme === activeFilters.plateforme);
    }

    // Appliquer la recherche
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(term) || 
        post.content.toLowerCase().includes(term)
      );
    }

    setFilteredPosts(filtered);
  }, [posts, activeFilters, searchTerm]);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setTitle("");
    setContent("");
    setVille("");
    setTypeActivite("");
    setTypeClient("");
    setPlateforme("");
    setSelectedThematiques([]);
    setCurrentPost(null);
  };

  // Ouvrir le formulaire pour éditer
  const handleEdit = (post: CommunicationPost) => {
    setCurrentPost(post);
    setTitle(post.title);
    setContent(post.content);
    setVille(post.ville);
    setTypeActivite(post.typeActivite);
    setTypeClient(post.typeClient);
    setPlateforme(post.plateforme);
    setSelectedThematiques(post.thematiques);
    setIsDialogOpen(true);
  };

  // Supprimer un post
  const handleDelete = async (postId: string) => {
    if (!db) return;
    
    if (confirm("Êtes-vous sûr de vouloir supprimer cette idée de communication ?")) {
      try {
        const firestore = db as Firestore;
        await deleteDoc(doc(firestore, "communicationPosts", postId));
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
      }
    }
  };

  // Gérer la sélection des thématiques
  const handleThematiqueChange = (thematique: string) => {
    setSelectedThematiques(prevThematiques => {
      if (prevThematiques.includes(thematique)) {
        return prevThematiques.filter(t => t !== thematique);
      } else {
        return [...prevThematiques, thematique];
      }
    });
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!db) {
      alert("La base de données n'est pas disponible");
      return;
    }
    
    if (!title || !content || !ville || !typeActivite || !typeClient || !plateforme) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const firestore = db as Firestore;
      const postData = {
        title,
        content,
        ville,
        typeActivite,
        typeClient,
        plateforme,
        thematiques: selectedThematiques,
        createdBy: user?.email || "anonymous",
        updatedAt: serverTimestamp(),
        scheduledDate: formData.scheduledDate ? formData.scheduledDate : new Date(),
      };

      if (currentPost) {
        // Mise à jour
        await updateDoc(doc(firestore, "communicationPosts", currentPost.id), postData);
      } else {
        // Création
        await addDoc(collection(firestore, "communicationPosts"), {
          ...postData,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
    }
  };

  // Exporter le plan de communication
  const exportToPDF = () => {
    alert("Fonctionnalité d'exportation à implémenter");
    // Utiliser jspdf ou pdfmake pour exporter
  };

  // Vérifier si l'utilisateur a les permissions pour modifier un post
  const canEditPost = (post: CommunicationPost) => {
    // L'utilisateur peut modifier ses propres posts ou ceux qui correspondent à ses permissions
    return post.createdBy === user?.email || 
      (consultantInfo?.permissions.villes.includes(post.ville) && 
       consultantInfo?.permissions.activites.includes(post.typeActivite));
  };

  // Modifier la fonction getPostsByDate pour utiliser les nouveaux codes couleurs
  const getPostsByDate = () => {
    const postsByDate: { [key: string]: CommunicationPost[] } = {};
    
    filteredPosts.forEach(post => {
      // On utilise la date planifiée si disponible, sinon la date de création
      const postDate = post.scheduledDate ? 
        (post.scheduledDate instanceof Date ? post.scheduledDate : new Date(post.scheduledDate)) : 
        (post.createdAt?.toDate ? post.createdAt.toDate() : new Date());
      
      // S'assurer que nous sommes dans le mois affiché
      if (postDate.getMonth() === selectedMonth && postDate.getFullYear() === selectedYear) {
        const dateKey = `${postDate.getDate()}`;
        
        if (!postsByDate[dateKey]) {
          postsByDate[dateKey] = [];
        }
        
        postsByDate[dateKey].push(post);
      }
    });
    
    return postsByDate;
  };

  // Fonction pour naviguer entre les mois
  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;
    
    if (direction === 'next') {
      if (selectedMonth === 11) {
        newMonth = 0;
        newYear += 1;
      } else {
        newMonth += 1;
      }
    } else {
      if (selectedMonth === 0) {
        newMonth = 11;
        newYear -= 1;
      } else {
        newMonth -= 1;
      }
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  // Fonction pour obtenir le nombre de jours dans un mois
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Fonction pour obtenir le premier jour de la semaine du mois
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Modification de la fonction qui utilise Firestore pour éviter l'erreur de typage
  const fetchPosts = async () => {
    setLoading(true);
    try {
      if (!db) {
        console.error("Firestore n'est pas initialisé");
        setLoading(false);
        return;
      }
      
      // Assertion de type pour db comme Firestore
      const firestore = db as Firestore;
      const postsRef = collection(firestore, 'communications');
      const q = query(postsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const postsData: CommunicationPost[] = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as CommunicationPost);
      });
      
      setPosts(postsData);
    } catch (error) {
      console.error("Erreur lors de la récupération des posts:", error);
      setError("Erreur lors de la récupération des données");
    } finally {
      setLoading(false);
    }
  };

  // Modifier pour utiliser les couleurs par plateforme dans la vue liste
  const getPlatformStyle = (platform: string) => {
    return PLATFORM_COLORS[platform] || { bg: "bg-gray-50", text: "text-gray-700", badge: "bg-gray-100 text-gray-800", hover: "hover:bg-gray-100" };
  };

  // Fonction pour gérer le début du drag
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, post: CommunicationPost) => {
    event.dataTransfer.setData('text/plain', post.id);
    setDragging(post.id);
    setDraggedPost(post);
    
    if (event.currentTarget) {
      event.dataTransfer.effectAllowed = 'move';
      // Créer une image fantôme pour le drag
      const ghost = event.currentTarget.cloneNode(true) as HTMLDivElement;
      ghost.style.position = 'absolute';
      ghost.style.top = '-1000px';
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
    }
    
    if (dragSourceRef.current) {
      dragSourceRef.current.style.opacity = '0.5';
    }
  };

  // Fonction pour gérer la fin du drag
  const handleDragEnd = () => {
    setDragging(null);
    setDraggedPost(null);
    
    if (dragSourceRef.current) {
      dragSourceRef.current.style.opacity = '1';
    }
  };

  // Fonction pour gérer le drop dans le calendrier
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, day: number, month: number, year: number) => {
    event.preventDefault();
    
    if (!draggedPost || !db) return;
    
    try {
      const targetDate = new Date(year, month, day);
      // Ne pas permettre le drop sur les weekends
      if (!isWorkDay(targetDate)) {
        alert('Les publications ne peuvent pas être programmées le weekend.');
        return;
      }
      
      const firestore = db as Firestore;
      
      // Mise à jour de la date programmée
      await updateDoc(doc(firestore, "communicationPosts", draggedPost.id), {
        scheduledDate: targetDate,
        updatedAt: serverTimestamp(),
      });
      
      // Réinitialiser
      handleDragEnd();
    } catch (error) {
      console.error("Erreur lors du déplacement de la publication :", error);
    }
  };
  
  // Fonction pour gérer le dragover
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, day: number) => {
    event.preventDefault();
    const date = new Date(selectedYear, selectedMonth, day);
    if (!isWorkDay(date)) {
      event.dataTransfer.dropEffect = 'none';
    } else {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <Card className="bg-white shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-[#2D2D2D]">Plan de Communication</CardTitle>
              <CardDescription className="text-[#DC0032]">
                Planifiez et organisez vos publications sur les réseaux sociaux
              </CardDescription>
              <p className="text-xs text-gray-600 mt-1">Calendrier commun à tous les utilisateurs de l'application</p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView('list')}
                className={activeView === 'list' ? 'bg-[#DC0032] text-white' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Liste
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView('calendar')}
                className={activeView === 'calendar' ? 'bg-[#DC0032] text-white' : ''}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendrier
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#DC0032] hover:bg-[#DC0032]/90 text-white">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Nouvelle publication
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{currentPost ? 'Modifier' : 'Ajouter'} une idée de communication</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations ci-dessous pour {currentPost ? 'modifier' : 'créer'} une idée de publication.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4 py-4">
                      <div className="grid grid-cols-1 gap-2">
                        <Label htmlFor="title">Titre de la publication</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Titre accrocheur pour la publication"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <Label htmlFor="content">Contenu</Label>
                        <Textarea
                          id="content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Détaillez le contenu de votre publication"
                          rows={4}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="ville">Ville</Label>
                          <Select value={ville} onValueChange={setVille} required>
                            <SelectTrigger id="ville">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {VILLES.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="typeActivite">Type d'activité</Label>
                          <Select value={typeActivite} onValueChange={setTypeActivite} required>
                            <SelectTrigger id="typeActivite">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {TYPES_ACTIVITE.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="typeClient">Type de client</Label>
                          <Select value={typeClient} onValueChange={setTypeClient} required>
                            <SelectTrigger id="typeClient">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {TYPES_CLIENT.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="plateforme">Plateforme</Label>
                        <Select value={plateforme} onValueChange={setPlateforme} required>
                          <SelectTrigger id="plateforme">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATEFORMES.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="mb-2 block">Thématiques</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {THEMATIQUES.map((theme) => (
                            <div key={theme} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`theme-${theme}`} 
                                checked={selectedThematiques.includes(theme)}
                                onCheckedChange={() => handleThematiqueChange(theme)}
                              />
                              <label
                                htmlFor={`theme-${theme}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {theme}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => {resetForm(); setIsDialogOpen(false);}}>
                        Annuler
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                        {currentPost ? 'Mettre à jour' : 'Ajouter'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="md:col-span-1">
              <Select value={activeFilters.ville} onValueChange={(value) => setActiveFilters({...activeFilters, ville: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {VILLES.map((ville) => (
                    <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-1">
              <Select value={activeFilters.typeActivite} onValueChange={(value) => setActiveFilters({...activeFilters, typeActivite: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Type d'activité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {TYPES_ACTIVITE.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-1">
              <Select value={activeFilters.typeClient} onValueChange={(value) => setActiveFilters({...activeFilters, typeClient: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Type de client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {TYPES_CLIENT.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-1">
              <Select value={activeFilters.thematique} onValueChange={(value) => setActiveFilters({...activeFilters, thematique: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Thématique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les thématiques</SelectItem>
                  {THEMATIQUES.map((theme) => (
                    <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-1">
              <Select value={activeFilters.plateforme} onValueChange={(value) => setActiveFilters({...activeFilters, plateforme: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Plateforme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les plateformes</SelectItem>
                  {PLATEFORMES.map((platform) => (
                    <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-1 relative">
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Vue Liste avec drag and drop */}
          {activeView === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => {
                  const platformStyle = getPlatformStyle(post.plateforme);
                  return (
                    <Card 
                      key={post.id} 
                      className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow duration-200"
                      draggable
                      ref={dragging === post.id ? dragSourceRef : null}
                      onDragStart={(e) => handleDragStart(e, post)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={`${platformStyle.bg} px-4 py-2 border-b border-gray-200`}>
                        <div className="flex justify-between items-center">
                          <Badge className={`flex items-center ${platformStyle.badge}`}>
                            {PLATFORM_ICONS[post.plateforme] || null}
                            {post.plateforme}
                          </Badge>
                          <div className="flex gap-2">
                            {canEditPost(post) && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(post)} className="h-8 w-8 p-0">
                                  <Edit size={14} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                                  <Trash2 size={14} />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                        <p className="text-gray-700 text-sm mb-3 line-clamp-3">{post.content}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.thematiques.map((theme) => (
                            <Badge key={theme} variant="outline" className="bg-gray-50">{theme}</Badge>
                          ))}
                        </div>
                        
                        <div className="text-xs text-gray-500 flex justify-between mt-4">
                          <span>{post.ville} • {post.typeActivite}</span>
                          <div className="flex flex-col items-end">
                            <span>
                              {post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : 'Non programmé'}
                            </span>
                            <span className="italic mt-1">
                              Créé par: {post.createdBy ? post.createdBy.split('@')[0] : 'Anonyme'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-3 text-center py-10 text-gray-500">
                  Aucune idée de communication ne correspond à vos critères.
                </div>
              )}
            </div>
          )}

          {/* Vue Calendrier avec thématiques intelligentes */}
          {activeView === 'calendar' && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  &laquo; Mois précédent
                </Button>
                <h2 className="text-xl font-semibold text-[#2D2D2D]">{MONTHS[selectedMonth]} {selectedYear}</h2>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  Mois suivant &raquo;
                </Button>
              </div>
              
              {/* Légende des thématiques */}
              <div className="p-3 border-b border-gray-200 flex flex-wrap gap-2">
                <h3 className="w-full text-sm font-medium mb-1">Thématiques :</h3>
                <Badge className={THEME_COLORS["Finistère"]}>Finistère (Lundi)</Badge>
                <Badge className={THEME_COLORS["Morbihan"]}>Morbihan (Mardi)</Badge>
                <Badge className={THEME_COLORS["Côtes d'Armor"]}>Côtes d'Armor (Mercredi)</Badge>
                <Badge className={THEME_COLORS["Bureaux"]}>Bureaux (Mardi)</Badge>
                <Badge className={THEME_COLORS["Commerces"]}>Commerces (Jeudi)</Badge>
                <Badge className={THEME_COLORS["Locaux"]}>Locaux d'activité (Jeudi)</Badge>
                <Badge className={THEME_COLORS["Terrains"]}>Terrains (Vendredi)</Badge>
                <Badge className={THEME_COLORS["Veille juridique"]}>Veille juridique (Mercredi)</Badge>
                <Badge className={THEME_COLORS["Actualités locales"]}>Actualités (Lundi)</Badge>
                <Badge className={THEME_COLORS["Événements"]}>Événements (Vendredi)</Badge>
              </div>
              
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, index) => (
                  <div key={index} className={`bg-gray-100 text-center py-2 font-medium ${index === 0 || index === 6 ? 'text-gray-400' : 'text-gray-700'}`}>
                    {day}
                  </div>
                ))}
                
                {/* Cases vides avant le premier jour du mois */}
                {Array(getFirstDayOfMonth(selectedYear, selectedMonth)).fill(null).map((_, index) => (
                  <div key={`empty-start-${index}`} className="bg-white h-32 p-2"></div>
                ))}
                
                {/* Jours du mois avec leur contenu */}
                {Array(getDaysInMonth(selectedYear, selectedMonth)).fill(null).map((_, index) => {
                  const day = index + 1;
                  const dateKey = `${day}`;
                  const date = new Date(selectedYear, selectedMonth, day);
                  const dayOfWeek = date.getDay(); // 0=Dimanche, 1=Lundi, etc.
                  const isWeekend = !isWorkDay(date);
                  const dayPosts = getPostsByDate()[dateKey] || [];
                  
                  // Obtenir les thématiques pour ce jour de la semaine
                  const dailyThemes = THEME_SCHEDULE[dayOfWeek as keyof typeof THEME_SCHEDULE] || [];
                  
                  return (
                    <div 
                      key={`day-${day}`} 
                      className={`bg-white border-t border-l border-r border-gray-200 h-32 overflow-hidden ${isWeekend ? 'bg-gray-50' : ''}`}
                      onDragOver={(e) => handleDragOver(e, day)}
                      onDrop={(e) => handleDrop(e, day, selectedMonth, selectedYear)}
                    >
                      <div className={`text-right p-1 ${
                        new Date().getDate() === day && new Date().getMonth() === selectedMonth && new Date().getFullYear() === selectedYear 
                        ? 'bg-red-50 text-red-700 font-bold' 
                        : isWeekend ? 'text-gray-400' : ''
                      }`}>
                        {day}
                      </div>
                      
                      {/* Afficher les thématiques uniquement si ce n'est pas un weekend */}
                      {!isWeekend && (
                        <div className="grid grid-cols-2 gap-1 p-1 h-6">
                          {dailyThemes.map((theme, idx) => (
                            <div 
                              key={`theme-${day}-${idx}`} 
                              className={`${THEME_COLORS[theme]} rounded-sm h-2 w-full`}
                              title={theme}
                            ></div>
                          ))}
                        </div>
                      )}
                      
                      {/* Contenu du jour - uniquement pour les jours de travail */}
                      {!isWeekend && (
                        <div className="overflow-y-auto p-1 max-h-20">
                          {dayPosts.map((post) => {
                            const style = getThemeColorByRegionOrCategory(post);
                            return (
                              <div 
                                key={`post-${post.id}`} 
                                className={`text-xs mb-1 p-1 rounded truncate ${style} cursor-grab`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, post)}
                                onDragEnd={handleDragEnd}
                              >
                                {post.title}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Indication pour les weekends */}
                      {isWeekend && (
                        <div className="flex items-center justify-center h-20 text-xs text-gray-400 italic">
                          Pas de communication le weekend
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Cases vides après le dernier jour du mois */}
                {Array(42 - getDaysInMonth(selectedYear, selectedMonth) - getFirstDayOfMonth(selectedYear, selectedMonth)).fill(null).map((_, index) => (
                  <div key={`empty-end-${index}`} className="bg-white h-32 p-2"></div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}