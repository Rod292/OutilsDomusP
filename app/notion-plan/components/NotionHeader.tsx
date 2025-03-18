import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Menu, X, User, ClipboardCheck, FileSpreadsheet, Star, BookOpen, Mail, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { auth } from "@/app/lib/firebase";

// Variantes d'animation pour le menu
const menuVariants = {
  closed: { 
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { 
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  open: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      duration: 0.3,
      ease: "easeOut",
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

const menuItemVariants = {
  closed: { 
    opacity: 0, 
    x: -10,
    transition: { duration: 0.2 }
  },
  open: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};

interface NotionHeaderProps {
  consultant: string | null | undefined;
}

export default function NotionHeader({ consultant }: NotionHeaderProps) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  const handleBack = () => {
    router.back();
  };

  const navigateTo = (path: string) => {
    setIsMenuOpen(false);
    
    // Ajouter le consultant au chemin
    if (path === "/") {
      router.push("/");
    } else if (path.startsWith("/consultant")) {
      router.push(`${path}/${consultant}`);
    } else {
      router.push(`${path}?consultant=${consultant}`);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const showBackButton = pathname !== "/";

  return (
    <header className={`bg-[#DC0032] dark:bg-[#9A0023] shadow-md ${isStandalone ? 'standalone-header' : ''}`}>
      <div className="container mx-auto px-2 sm:px-4">
        <div className={`flex items-center justify-between ${isStandalone ? 'pt-20 pb-4 h-[var(--header-height)]' : 'pt-safe h-14 sm:h-16'}`}>
          <div className="flex items-center">
            {showBackButton && (
              <motion.button
                onClick={handleBack}
                className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1.5 sm:p-2 rounded-full mr-1 sm:mr-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.button>
            )}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link href="/">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-XcaUpl2kmkXGPWq4GoS5Mvl5RpKRc1.png"
                  alt="Arthur Loyd"
                  width={120}
                  height={32}
                  className="h-7 sm:h-8 w-auto"
                />
              </Link>
              <h1 className="text-white text-sm sm:text-lg font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none">Plan de Communication</h1>
              {consultant && (
                <motion.span 
                  className="text-white text-xs sm:text-sm bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded truncate max-w-[80px] sm:max-w-none"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {consultant}
                </motion.span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Bouton de basculement de thème */}
            <motion.button
              onClick={toggleTheme}
              className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1.5 sm:p-2 rounded-full"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </motion.button>
            
            {/* Menu de navigation */}
            {user && (
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1.5 sm:p-2 rounded-md flex items-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      animate={isMenuOpen ? { opacity: 1 } : { opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center"
                    >
                      {isMenuOpen ? (
                        <X className="h-5 w-5 md:mr-2" />
                      ) : (
                        <Menu className="h-5 w-5 md:mr-2" />
                      )}
                      <span className="hidden md:inline">Menu</span>
                    </motion.div>
                  </motion.button>
                </DropdownMenuTrigger>
                <AnimatePresence>
                  {isMenuOpen && (
                    <DropdownMenuContent 
                      align="end" 
                      className="w-48 sm:w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1"
                      asChild
                      forceMount
                    >
                      <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={menuVariants}
                      >
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem onClick={() => navigateTo("/")} className="flex items-center p-2 cursor-pointer">
                            <User className="mr-2 h-4 w-4 text-[#DC0032]" />
                            <span className="dark:text-gray-200">Profil</span>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem onClick={() => navigateTo("/consultant")} className="flex items-center p-2 cursor-pointer">
                            <ClipboardCheck className="mr-2 h-4 w-4 text-[#DC0032]" />
                            <span className="dark:text-gray-200">État des Lieux</span>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem onClick={() => navigateTo("/plan-communication")} className="flex items-center p-2 cursor-pointer">
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-[#DC0032]" />
                            <span className="dark:text-gray-200">Plan de Communication</span>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem onClick={() => navigateTo("/avis-google")} className="flex items-center p-2 cursor-pointer">
                            <Star className="mr-2 h-4 w-4 text-[#DC0032]" />
                            <span className="dark:text-gray-200">Avis Google</span>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem onClick={() => navigateTo("/guides-immobilier")} className="flex items-center p-2 cursor-pointer">
                            <BookOpen className="mr-2 h-4 w-4 text-[#DC0032]" />
                            <span className="dark:text-gray-200">Guides Immobilier</span>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem onClick={() => navigateTo("/newsletter")} className="flex items-center p-2 cursor-pointer">
                            <Mail className="mr-2 h-4 w-4 text-[#DC0032]" />
                            <span className="dark:text-gray-200">Newsletter</span>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                          <DropdownMenuItem onClick={handleSignOut} className="flex items-center p-2 cursor-pointer text-red-500">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span className="dark:text-red-400">Déconnexion</span>
                          </DropdownMenuItem>
                        </motion.div>
                      </motion.div>
                    </DropdownMenuContent>
                  )}
                </AnimatePresence>
              </DropdownMenu>
            )}

            {user && (
              <span className="text-white text-sm mr-2 hidden md:inline-block">{user.displayName || user.email}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 