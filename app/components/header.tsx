"use client"

import Image from "next/image"
import Link from "next/link"
import { RefreshCw, ChevronLeft, LogOut, Menu, X, FileSpreadsheet, Home, ClipboardCheck, Star, UserIcon, BookOpen, Mail, Bell, Eraser, Settings, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { auth } from "@/app/lib/firebase"
import type { User } from "firebase/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "../../components/ui/theme-toggle"
import NotificationPermission from "./NotificationPermission"
import CleanupNotificationsButton from "./notifications/CleanupNotificationsButton"
import FixNotificationTokensButton from "./notifications/FixNotificationTokensButton"
import { toast } from "sonner"

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

export function Header() {
  const [isStandalone, setIsStandalone] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const consultant = searchParams.get('consultant')
  const [showNotificationBadge, setShowNotificationBadge] = useState(false)

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches)
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setUser(user)
      })
      return () => unsubscribe()
    }
  }, [])

  // Afficher une notification pour informer les utilisateurs de la nouvelle fonctionnalité
  useEffect(() => {
    // Vérifier si l'utilisateur est connecté et si la notification n'a pas déjà été affichée
    if (user && !localStorage.getItem('notification_prefs_announced')) {
      // Attendre un peu avant d'afficher pour ne pas surcharger l'utilisateur
      const timer = setTimeout(() => {
        toast.info(
          <div>
            <p className="font-semibold">Nouvelle fonctionnalité !</p>
            <p>Vous pouvez maintenant gérer vos préférences de notifications.</p>
          </div>,
          {
            duration: 6000,
            action: {
              label: "Voir",
              onClick: () => router.push('/notifications/preferences')
            }
          }
        );
        // Marquer comme déjà affiché
        localStorage.setItem('notification_prefs_announced', 'true');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  const handleBack = () => {
    router.back()
  }

  const handleSignOut = async () => {
    if (!auth) return;
    
    try {
      await auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    }
  }

  const navigateTo = (path: string) => {
    setIsMenuOpen(false)
    
    // Ajouter le consultant au chemin
    if (path === "/") {
      router.push("/")
    } else if (path.startsWith("/consultant")) {
      router.push(`${path}/${consultant}`)
    } else {
      router.push(`${path}?consultant=${consultant}`)
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const showBackButton = pathname !== "/"

  // Vérifier si l'utilisateur est connecté pour afficher le bouton de notification
  const shouldShowNotification = !!user && !!consultant

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
              {pathname.includes('/plan-communication') ? (
                <h1 className="text-white text-sm sm:text-lg font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none">Plan de Communication</h1>
              ) : pathname.includes('/selection-outil') ? (
                <h1 className="text-white text-sm sm:text-lg font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none">Sélection d'Outil</h1>
              ) : pathname.includes('/avis-google') ? (
                <h1 className="text-white text-sm sm:text-lg font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none">Avis Google</h1>
              ) : pathname.includes('/guides-immobilier') ? (
                <h1 className="text-white text-sm sm:text-lg font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none">Guides Immobilier</h1>
              ) : pathname.includes('/newsletter') ? (
                <h1 className="text-white text-sm sm:text-lg font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none">Newsletter</h1>
              ) : (
                <h1 className="text-white text-sm sm:text-lg font-semibold tracking-wide truncate max-w-[120px] sm:max-w-none">État des Lieux</h1>
              )}
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
            <ThemeToggle />
            
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
                            <UserIcon className="mr-2 h-4 w-4 text-[#DC0032]" />
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
                          <DropdownMenuItem onClick={() => navigateTo("/notion-plan")} className="flex items-center p-2 cursor-pointer">
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
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem asChild>
                            <div className="flex items-center p-2 cursor-pointer">
                              <Bell className="mr-2 h-4 w-4 text-[#DC0032]" />
                              <Link
                                href="/notifications"
                                className="flex-1"
                              >
                                Notifications
                              </Link>
                            </div>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem asChild>
                            <div className="flex items-center p-2 cursor-pointer">
                              <Settings className="mr-2 h-4 w-4 text-[#DC0032]" />
                              <Link
                                href="/notifications/preferences"
                                className="flex-1"
                              >
                                Préférences notifications
                              </Link>
                            </div>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem asChild>
                            <div className="flex items-center p-2 cursor-pointer">
                              <Eraser className="mr-2 h-4 w-4 text-[#DC0032]" />
                              <CleanupNotificationsButton 
                                variant="ghost"
                                size="sm"
                                showText={true}
                                className="w-full p-0 text-sm justify-start font-normal h-auto dark:text-gray-200"
                              />
                            </div>
                          </DropdownMenuItem>
                        </motion.div>
                        <motion.div variants={menuItemVariants} className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                          <DropdownMenuItem asChild>
                            <div className="flex items-center p-2 cursor-pointer">
                              <Wrench className="mr-2 h-4 w-4 text-[#DC0032]" />
                              {consultant && (
                                <FixNotificationTokensButton 
                                  variant="ghost"
                                  size="sm"
                                  showText={true}
                                  email={user?.email}
                                  consultant={consultant}
                                  className="w-full p-0 text-sm justify-start font-normal h-auto dark:text-gray-200"
                                />
                              )}
                              {!consultant && (
                                <span className="text-gray-400 text-sm">Sélectionnez un consultant</span>
                              )}
                            </div>
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
            {isStandalone && (
              <motion.button
                onClick={handleRefresh}
                className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1.5 sm:p-2 rounded-full"
                aria-label="Rafraîchir la page"
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.button>
            )}
            {user && (
              <motion.button
                onClick={handleSignOut}
                className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1.5 sm:p-2 rounded-full"
                aria-label="Se déconnecter"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

