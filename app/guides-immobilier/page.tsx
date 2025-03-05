"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '../components/header';
import { useAuth } from '../hooks/useAuth';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BookOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  Building2,
  Landmark,
  Scale,
  Home,
  Key,
  Briefcase
} from 'lucide-react';

// Types pour les guides
interface GuideItem {
  id: string;
  title: string;
  category: string;
  description: string;
  createdBy: string;
  createdAt: any;
  content?: string;
}

// Catégories de guides
const CATEGORIES = [
  { id: "baux-commerciaux", name: "Baux commerciaux", icon: <Building2 className="w-4 h-4 mr-2" /> },
  { id: "loi-hoguet", name: "Loi Hoguet", icon: <Scale className="w-4 h-4 mr-2" /> },
  { id: "mandats", name: "Types de mandats", icon: <FileText className="w-4 h-4 mr-2" /> },
  { id: "urbanisme", name: "Urbanisme", icon: <Landmark className="w-4 h-4 mr-2" /> },
  { id: "gestion-locative", name: "Gestion locative", icon: <Home className="w-4 h-4 mr-2" /> },
  { id: "droit-bail", name: "Droit au bail et fonds de commerce", icon: <Key className="w-4 h-4 mr-2" /> },
  { id: "investissement", name: "Investissement immobilier d'entreprise", icon: <Briefcase className="w-4 h-4 mr-2" /> },
];

// Composant client qui utilise useSearchParams
function GuidesImmobilierClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const { user, loading } = useAuth();
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [transitionOpacity, setTransitionOpacity] = useState('opacity-0');

  // Effet pour vérifier l'authentification et le consultant
  useEffect(() => {
    // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
    if (!loading && !user) {
      router.push('/email-signin');
      return;
    }

    // Rediriger vers la page d'accueil si aucun consultant n'est sélectionné
    if (!loading && !consultant) {
      router.push('/');
      return;
    }

    // Animation d'entrée
    const timer = setTimeout(() => {
      setTransitionOpacity('opacity-100');
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, router, consultant]);

  // Pour le moment, données factices pour les guides
  useEffect(() => {
    // Dans la version finale, ces données viendraient de la base de données Firebase
    const mockGuides: GuideItem[] = [
      {
        id: "guide-1",
        title: "Guide des baux commerciaux 3-6-9",
        category: "baux-commerciaux",
        description: "Tout ce qu'il faut savoir sur les baux commerciaux classiques",
        createdBy: "admin@arthurloyd.fr",
        createdAt: new Date(),
      },
      {
        id: "guide-2",
        title: "Les obligations de la loi Hoguet pour les agents immobiliers",
        category: "loi-hoguet",
        description: "Explications claires des contraintes légales pour les professionnels",
        createdBy: "admin@arthurloyd.fr",
        createdAt: new Date(),
      },
      {
        id: "guide-3",
        title: "Différencier les mandats simples et exclusifs",
        category: "mandats",
        description: "Comparaison des avantages et inconvénients des différents types de mandats",
        createdBy: "admin@arthurloyd.fr",
        createdAt: new Date(),
      },
    ];
    
    setGuides(mockGuides);
  }, []);

  // Filtrer les guides par catégorie
  const filteredGuides = activeCategory === "all" 
    ? guides 
    : guides.filter(guide => guide.category === activeCategory);

  // Afficher le chargement pendant la vérification d'authentification
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 transition-opacity duration-300 ${transitionOpacity}`}>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-6 mb-8 border border-red-100">
            <h1 className="text-3xl font-bold text-[#2D2D2D] mb-2">Guides de bonnes pratiques immobilières</h1>
            <p className="text-gray-600">
              Consultez et créez des guides de référence pour l'immobilier d'entreprise : 
              baux commerciaux, réglementations, et conseils pratiques.
            </p>
            {consultant && <p className="text-[#DC0032] font-medium mt-2">Consultant: {consultant}</p>}
          </div>

          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="browse" className="text-base py-3">
                <BookOpen className="mr-2 h-5 w-5" />
                Consulter les guides
              </TabsTrigger>
              <TabsTrigger value="create" className="text-base py-3">
                <Plus className="mr-2 h-5 w-5" />
                Créer un guide
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-6">
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <h2 className="text-xl font-semibold mb-4">Filtrer par catégorie</h2>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={activeCategory === "all" ? "default" : "outline"}
                    className={activeCategory === "all" ? "bg-[#DC0032] hover:bg-[#DC0032]/90" : ""}
                    onClick={() => setActiveCategory("all")}
                  >
                    Tous les guides
                  </Button>
                  
                  {CATEGORIES.map(category => (
                    <Button 
                      key={category.id}
                      variant={activeCategory === category.id ? "default" : "outline"}
                      className={`flex items-center ${activeCategory === category.id ? "bg-[#DC0032] hover:bg-[#DC0032]/90" : ""}`}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      {category.icon}
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              {filteredGuides.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGuides.map(guide => {
                    const category = CATEGORIES.find(c => c.id === guide.category);
                    
                    return (
                      <Card key={guide.id} className="border hover:shadow-md transition-shadow">
                        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 pb-4">
                          <div className="flex items-center mb-2">
                            {category?.icon}
                            <span className="text-sm font-medium text-[#DC0032]">{category?.name}</span>
                          </div>
                          <CardTitle className="text-xl">{guide.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <p className="text-gray-600 mb-4">{guide.description}</p>
                          <p className="text-xs text-gray-500">
                            Créé par {guide.createdBy.split('@')[0]} • {guide.createdAt.toLocaleDateString()}
                          </p>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t pt-4">
                          <Button variant="outline" size="sm" className="text-[#DC0032]">
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </Button>
                          <Button variant="outline" size="sm">
                            Lire le guide
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Aucun guide dans cette catégorie</h3>
                  <p className="text-gray-500 mb-6">Commencez par créer un nouveau guide</p>
                  <Button className="bg-[#DC0032] hover:bg-[#DC0032]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un guide
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="create">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-[#2D2D2D]">Créer un nouveau guide</h2>
                <p className="text-gray-600 mb-8">
                  Cette fonctionnalité sera disponible prochainement. Vous pourrez créer des guides
                  détaillés sur les différents aspects de l'immobilier d'entreprise.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {CATEGORIES.map(category => (
                    <Card key={category.id} className="border hover:shadow-md transition-shadow">
                      <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
                        <div className="flex items-center">
                          {category.icon}
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90" disabled>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer dans cette catégorie
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// Fallback à afficher pendant le chargement du composant client
function GuidesImmobilierFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement de la page...</p>
      </div>
    </div>
  );
}

// Composant principal qui enveloppe le client avec Suspense
export default function GuidesImmobilier() {
  return (
    <Suspense fallback={<GuidesImmobilierFallback />}>
      <GuidesImmobilierClient />
    </Suspense>
  );
} 