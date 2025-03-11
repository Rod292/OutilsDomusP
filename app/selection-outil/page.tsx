"use client";

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { ClipboardList, FileSpreadsheet, Star, BookOpen, Mail, Cat } from 'lucide-react';
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-gray-700 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 transition-opacity duration-500 ${transitionOpacity}`}>
      <Header />
      
      <div className="py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative w-[200px] h-[60px] mb-6">
                <Image 
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-XcaUpl2kmkXGPWq4GoS5Mvl5RpKRc1.png" 
                  alt="Arthur Lloyd" 
                  fill
                  style={{ objectFit: 'contain' }}
                  className="drop-shadow-sm" 
                />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-3">Bienvenue, {user?.displayName || user?.email?.split('@')[0]}</h1>
              {consultant && (
                <span className="mt-1 text-[#DC0032] font-medium text-sm bg-red-50 px-4 py-1.5 rounded-full shadow-sm border border-red-100">
                  Consultant: {consultant}
                </span>
              )}
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Sélectionnez l'outil que vous souhaitez utiliser pour votre session de travail</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] cursor-pointer group" onClick={() => navigateTo('/consultant/')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-gray-100">
                <div className="flex items-center gap-5">
                  <div className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <ClipboardList size={28} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#2D2D2D]">État des Lieux</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">Gestion des états des lieux</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 px-6">
                <ul className="space-y-3 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Créer et modifier des états des lieux
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Générer des rapports PDF
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-5 px-6">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] cursor-pointer group" onClick={() => navigateTo('/plan-communication')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-gray-100">
                <div className="flex items-center gap-5">
                  <div className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <FileSpreadsheet size={28} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#2D2D2D]">Plan de Communication</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">Gestion des publications sociales</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 px-6">
                <ul className="space-y-3 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Planifier des idées de publications
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Organiser par ville et activité
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-5 px-6">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] cursor-pointer group" onClick={() => navigateTo('/avis-google')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-gray-100">
                <div className="flex items-center gap-5">
                  <div className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Star size={28} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#2D2D2D]">Avis Google</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">Sollicitation d'avis clients</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 px-6">
                <ul className="space-y-3 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Envoi de demandes post-signature
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Relance des clients après 1-3 ans
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-5 px-6">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] cursor-pointer group" onClick={() => navigateTo('/guides-immobilier')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-gray-100">
                <div className="flex items-center gap-5">
                  <div className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#2D2D2D]">Guides Immobilier</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">Bonnes pratiques professionnelles</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 px-6">
                <ul className="space-y-3 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Baux commerciaux et loi Hoguet
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Droit au bail et investissements
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-5 px-6">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] cursor-pointer group" onClick={() => navigateTo('/newsletter')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-gray-100">
                <div className="flex items-center gap-5">
                  <div className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Mail size={28} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#2D2D2D]">Newsletter</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">Création et envoi d'emails</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 px-6">
                <ul className="space-y-3 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Créer des newsletters personnalisées
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Suivi des envois et statistiques
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-5 px-6">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>
            
            {/* Nouvel outil: Arthur le chat */}
            <Card className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] cursor-pointer group" onClick={() => navigateTo('/arthur-le-chat')}>
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-6 border-b border-gray-100">
                <div className="flex items-center gap-5">
                  <div className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Cat size={28} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#2D2D2D]">Arthur le chat</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">Assistant immobilier intelligent</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 px-6">
                <ul className="space-y-3 text-base text-gray-700">
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Réponses à vos questions immobilières
                  </li>
                  <li className="flex items-center">
                    <span className="bg-red-100 text-[#DC0032] rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                    Conseils personnalisés et instantanés
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 pb-5 px-6">
                <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                  Accéder à l'outil
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Arthur Loyd Bretagne. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback à afficher pendant le chargement du composant client
function SelectionOutilFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
        <p className="text-gray-700 font-medium">Chargement...</p>
      </div>
    </div>
  );
}

// Page principale qui utilise Suspense pour le chargement
export default function SelectionOutil() {
  return (
    <Suspense fallback={<SelectionOutilFallback />}>
      <SelectionOutilClient />
    </Suspense>
  );
} 