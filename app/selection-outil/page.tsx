"use client";

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { ClipboardList, FileSpreadsheet, Star, BookOpen, Mail, Brain } from 'lucide-react';
import { Header } from '../components/header';
import { motion, AnimatePresence, stagger } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Task } from '../notion-plan/types';

// Variantes d'animation pour les éléments
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const logoVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 20, delay: 0.2 }
  }
};

const titleVariants = {
  hidden: { y: -20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 20, delay: 0.3 }
  }
};

// Composant client qui utilise useSearchParams
function SelectionOutilClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const { user, loading } = useAuth();
  const [transitionOpacity, setTransitionOpacity] = useState('opacity-0');
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  // Fonction pour charger le nombre de tâches assignées au consultant
  useEffect(() => {
    const loadPendingTasks = async () => {
      if (!consultant) return;

      try {
        // Rechercher l'email du consultant basé sur son nom
        const consultantEmail = getConsultantEmail(consultant);
        
        if (!consultantEmail) return;
        
        // 1. Récupérer les tâches directement assignées au consultant
        const taskRef = collection(db, 'tasks');
        const q = query(
          taskRef, 
          where('assignedTo', 'array-contains', consultantEmail)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Compter les tâches principales qui ne sont pas terminées
        let count = 0;
        
        for (const doc of querySnapshot.docs) {
          const task = doc.data() as Task;
          // Filtre côté client pour les tâches non terminées
          if (task.status !== 'terminée') {
            count++;
          }
          
          // Compter aussi les communications assignées à ce consultant
          if (task.communicationDetails && task.communicationDetails.length > 0) {
            task.communicationDetails.forEach(comm => {
              if (comm.assignedTo && 
                  comm.assignedTo.includes(consultantEmail) && 
                  comm.status !== 'terminée' && 
                  comm.status !== 'publié') {
                count++;
              }
            });
          }
        }
        
        // 2. Récupérer toutes les tâches pour trouver celles avec des communications assignées au consultant
        // mais où le consultant n'est pas directement assigné à la tâche principale
        const allTasksQuery = query(collection(db, 'tasks'));
        const allTasksSnapshot = await getDocs(allTasksQuery);
        
        // Créer un Set des IDs des tâches déjà comptées pour éviter les doublons
        const countedTaskIds = new Set(querySnapshot.docs.map(doc => doc.id));
        
        for (const taskDoc of allTasksSnapshot.docs) {
          // Ignorer les tâches déjà comptées
          if (countedTaskIds.has(taskDoc.id)) continue;
          
          const data = taskDoc.data();
          
          // Vérifier si cette tâche a des communications assignées au consultant
          if (data.communicationDetails && data.communicationDetails.length > 0) {
            data.communicationDetails.forEach((comm: any) => {
              if (comm.assignedTo && 
                  comm.assignedTo.includes(consultantEmail) && 
                  comm.status !== 'terminée' && 
                  comm.status !== 'publié') {
                count++;
              }
            });
          }
        }
        
        setPendingTasksCount(count);
      } catch (error) {
        console.error('Erreur lors du chargement des tâches assignées:', error);
      }
    };
    
    loadPendingTasks();
  }, [consultant]);

  // Fonction pour obtenir l'email du consultant
  const getConsultantEmail = (name: string): string | null => {
    const consultants = [
      { name: "Anne", email: "acoat@arthurloydbretagne.fr" },
      { name: "Elowan", email: "ejouan@arthurloydbretagne.fr" },
      { name: "Erwan", email: "eleroux@arthurloydbretagne.fr" },
      { name: "Julie", email: "jdalet@arthurloydbretagne.fr" },
      { name: "Justine", email: "jjambon@arthurloydbretagne.fr" },
      { name: "Morgane", email: "agencebrest@arthurloydbretagne.fr" },
      { name: "Nathalie", email: "npers@arthurloydbretagne.fr" },
      { name: "Pierre", email: "pmottais@arthurloydbretagne.fr" },
      { name: "Pierre-Marie", email: "pmjaumain@arthurloydbretagne.fr" },
      { name: "Sonia", email: "shadjlarbi@arthur-loyd.com" }
    ];
    
    const found = consultants.find(c => c.name.toLowerCase() === name.toLowerCase());
    return found ? found.email : null;
  };

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-opacity duration-500 ${transitionOpacity}`}>
      <Header />
      
      <AnimatePresence>
        <motion.div 
          className="py-12 px-4 sm:px-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="max-w-6xl mx-auto">
            <motion.div className="text-center mb-12">
              <div className="flex flex-col items-center justify-center mb-6">
                <motion.div 
                  className="relative w-[200px] h-[60px] mb-6"
                  variants={logoVariants}
                >
                  <Image 
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-XcaUpl2kmkXGPWq4GoS5Mvl5RpKRc1.png" 
                    alt="Arthur Loyd" 
                    fill
                    style={{ objectFit: 'contain' }}
                    className="drop-shadow-sm" 
                  />
                </motion.div>
                <motion.h1 
                  className="text-3xl md:text-4xl font-bold text-[#2D2D2D] dark:text-white mb-3"
                  variants={titleVariants}
                >
                  Bienvenue, {user?.displayName || user?.email?.split('@')[0]}
                </motion.h1>
                {consultant && (
                  <motion.span 
                    className="mt-1 text-[#DC0032] font-medium text-sm bg-red-50 dark:bg-red-900/20 px-4 py-1.5 rounded-full shadow-sm border border-red-100 dark:border-red-900/30"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    Consultant: {consultant}
                  </motion.span>
                )}
              </div>
              <motion.p 
                className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                Sélectionnez l'outil que vous souhaitez utiliser pour votre session de travail
              </motion.p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-[#DC0032] dark:hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg cursor-pointer group dark:bg-gray-800" onClick={() => navigateTo('/consultant/')}>
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-red-900/20 p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <ClipboardList size={28} />
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl font-bold text-[#2D2D2D] dark:text-white">État des Lieux</CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gestion des états des lieux</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-5 px-6">
                    <ul className="space-y-3 text-base text-gray-700 dark:text-gray-300">
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                        Créer et modifier des états des lieux
                      </li>
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
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
              </motion.div>

              <motion.div variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-[#DC0032] dark:hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg cursor-pointer group dark:bg-gray-800" onClick={() => navigateTo('/notion-plan')}>
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-red-900/20 p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md relative"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <FileSpreadsheet size={28} />
                        {pendingTasksCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-[#DC0032] text-white text-xs font-bold rounded-full flex items-center justify-center w-6 h-6 border-2 border-white dark:border-gray-800 shadow-sm">
                            {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
                          </span>
                        )}
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl font-bold text-[#2D2D2D] dark:text-white">Plan de Communication</CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Style Notion - Gestion des tâches
                          {pendingTasksCount > 0 && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {pendingTasksCount} en attente
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-5 px-6">
                    <ul className="space-y-3 text-base text-gray-700 dark:text-gray-300">
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                        Planifier des tâches et assignations
                      </li>
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                        Interface Notion avec calendrier dynamique
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-0 pb-5 px-6">
                    <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                      Accéder à l'outil
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
              
              <motion.div variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-[#DC0032] dark:hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg cursor-pointer group dark:bg-gray-800" onClick={() => navigateTo('/avis-google')}>
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-red-900/20 p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Star size={28} />
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl font-bold text-[#2D2D2D] dark:text-white">Avis Google</CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sollicitation d'avis clients</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-5 px-6">
                    <ul className="space-y-3 text-base text-gray-700 dark:text-gray-300">
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                        Envoi de demandes post-signature
                      </li>
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
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
              </motion.div>

              <motion.div variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-[#DC0032] dark:hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg cursor-pointer group dark:bg-gray-800" onClick={() => navigateTo('/newsletter')}>
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-red-900/20 p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Mail size={28} />
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl font-bold text-[#2D2D2D] dark:text-white">Newsletter</CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">Création et envoi d'emails</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-5 px-6">
                    <ul className="space-y-3 text-base text-gray-700 dark:text-gray-300">
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                        Créer des newsletters personnalisées
                      </li>
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
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
              </motion.div>

              <motion.div variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-[#DC0032] dark:hover:border-[#DC0032] transition-all duration-300 hover:shadow-lg cursor-pointer group dark:bg-gray-800" onClick={() => navigateTo('/ia-assistant')}>
                  <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-red-900/20 p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="bg-[#DC0032] text-white p-3.5 rounded-full w-16 h-16 flex items-center justify-center shadow-md"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <Brain size={28} />
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl font-bold text-[#2D2D2D] dark:text-white">IA Assistant</CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">Intelligence artificielle</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-5 px-6">
                    <ul className="space-y-3 text-base text-gray-700 dark:text-gray-300">
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                        Générer du contenu avec l'IA
                      </li>
                      <li className="flex items-center">
                        <span className="bg-red-100 dark:bg-red-900/30 text-[#DC0032] dark:text-red-300 rounded-full p-0.5 mr-2.5 flex items-center justify-center w-5 h-5">✓</span>
                        Réponses intelligentes aux questions
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-0 pb-5 px-6">
                    <Button className="w-full bg-[#DC0032] hover:bg-[#DC0032]/90 text-white text-base font-medium py-5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                      Accéder à l'outil
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="mt-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Arthur Loyd Bretagne. Tous droits réservés.</p>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Fallback à afficher pendant le chargement du composant client
function SelectionOutilFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <motion.div 
          className="w-14 h-14 border-4 border-[#DC0032] border-t-transparent rounded-full animate-spin mx-auto mb-5"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        ></motion.div>
        <motion.p 
          className="text-gray-700 dark:text-gray-300 font-medium"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Chargement...
        </motion.p>
      </motion.div>
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