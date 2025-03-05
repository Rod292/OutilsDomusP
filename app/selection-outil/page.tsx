"use client";

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { ClipboardList, FileSpreadsheet, Star, BookOpen, Mail, Edit } from 'lucide-react';
import { Header } from '../components/header';

// Composant client qui utilise useSearchParams
function SelectionOutilClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const { user, loading } = useAuth();
  const [transitionOpacity, setTransitionOpacity] = useState('opacity-0');

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

  const navigateTo = (path: string) => {
    setTransitionOpacity('opacity-0');
    setTimeout(() => {
      // Ajouter le consultant au chemin
      if (path.startsWith('/consultant')) {
        router.push(`${path}${consultant}`);
      } else {
        router.push(`${path}?consultant=${consultant}`);
      }
    }, 300);
  };

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
      
      <div className="py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center mb-4">
              <Image 
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-XcaUpl2kmkXGPWq4GoS5Mvl5RpKRc1.png" 
                alt="Arthur Lloyd" 
                width={180} 
                height={48} 
                className="mb-4" 
              />
              <h1 className="text-3xl font-bold text-[#2D2D2D]">Bienvenue, {user?.displayName || user?.email}</h1>
              {consultant && <span className="mt-2 text-[#DC0032] font-medium text-sm bg-red-50 px-3 py-1 rounded-md">Consultant: {consultant}</span>}
            </div>
            <p className="text-lg text-gray-600">Sélectionnez l'outil que vous souhaitez utiliser</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card className="border border-gray-200 hover:border-[#DC0032] transition-all hover:shadow-md cursor-pointer" onClick={() => navigateTo('/consultant/')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-[#DC0032] text-white p-3 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#2D2D2D]">État des Lieux</CardTitle>
                    <CardDescription className="text-sm text-gray-600">Gestion des états des lieux</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5">
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Créer et modifier des états des lieux
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Générer des rapports PDF
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-5">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-gray-200 hover:border-[#DC0032] transition-all hover:shadow-md cursor-pointer" onClick={() => navigateTo('/plan-communication')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-[#DC0032] text-white p-3 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#2D2D2D]">Plan de Communication</CardTitle>
                    <CardDescription className="text-sm text-gray-600">Gestion des publications sociales</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5">
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Planifier des idées de publications
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Organiser par ville et activité
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-5">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-200 hover:border-[#DC0032] transition-all hover:shadow-md cursor-pointer" onClick={() => navigateTo('/avis-google')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-[#DC0032] text-white p-3 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                    <Star size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#2D2D2D]">Avis Google</CardTitle>
                    <CardDescription className="text-sm text-gray-600">Sollicitation d'avis clients</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5">
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Envoi de demandes post-signature
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Relance des clients après 1-3 ans
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-5">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-200 hover:border-[#DC0032] transition-all hover:shadow-md cursor-pointer" onClick={() => navigateTo('/guides-immobilier')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-[#DC0032] text-white p-3 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#2D2D2D]">Guides Immobilier</CardTitle>
                    <CardDescription className="text-sm text-gray-600">Bonnes pratiques professionnelles</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5">
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Baux commerciaux et loi Hoguet
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Droit au bail et investissements
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-5">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-gray-200 hover:border-[#DC0032] transition-all hover:shadow-md cursor-pointer" onClick={() => navigateTo('/newsletter')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-[#DC0032] text-white p-3 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                    <Mail size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#2D2D2D]">Newsletter</CardTitle>
                    <CardDescription className="text-sm text-gray-600">Création et envoi d'emails</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5">
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Créer des newsletters personnalisées
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Suivi des envois et statistiques
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-5">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-gray-200 hover:border-[#DC0032] transition-all hover:shadow-md cursor-pointer" onClick={() => navigateTo('/email-professionnel')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-[#DC0032] text-white p-3 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                    <Edit size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#2D2D2D]">Emails Professionnels</CardTitle>
                    <CardDescription className="text-sm text-gray-600">Rédaction d'emails personnalisés</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5">
                <ul className="space-y-2 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Créer des emails professionnels
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 rounded-full p-0.5 mr-2 text-sm">✓</span>
                    Modèles personnalisables
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-5">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback à afficher pendant le chargement du composant client
function SelectionOutilFallback() {
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
export default function SelectionOutil() {
  return (
    <Suspense fallback={<SelectionOutilFallback />}>
      <SelectionOutilClient />
    </Suspense>
  );
} 