"use client"

import Image from "next/image"
import Link from "next/link"
import { RefreshCw, ChevronLeft, LogOut, Menu, X, FileSpreadsheet, Home, ClipboardCheck, Star, UserIcon, BookOpen, Mail } from "lucide-react"
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

export function Header() {
  const [isStandalone, setIsStandalone] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const consultant = searchParams.get('consultant')

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches)
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setUser(user)
      })
      return () => unsubscribe()
    }
  }, [])

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
      console.error("Error signing out", error)
    }
  }

  const navigateTo = (path: string) => {
    if (consultant && !path.includes('?')) {
      if (path === '/') {
        router.push(path)
      } else {
        router.push(`${path}?consultant=${consultant}`)
      }
    } else {
      router.push(path)
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const showBackButton = pathname !== "/"

  return (
    <header className="bg-[#DC0032] shadow-md z-10 pt-safe">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-12 sm:h-14 mt-2 md:mt-0">
          <div className="flex items-center">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1 sm:p-1.5 rounded-full mr-1"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            <div className="flex items-center space-x-1 sm:space-x-3">
              <Link href="/">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-01-20%20at%2015.22.07-XcaUpl2kmkXGPWq4GoS5Mvl5RpKRc1.png"
                  alt="Arthur Lloyd"
                  width={100}
                  height={28}
                  className="h-6 sm:h-7 w-auto"
                />
              </Link>
              {pathname.includes('/plan-communication') ? (
                <h1 className="text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">Plan de Communication</h1>
              ) : pathname.includes('/selection-outil') ? (
                <h1 className="text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">Sélection d'Outil</h1>
              ) : pathname.includes('/avis-google') ? (
                <h1 className="text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">Avis Google</h1>
              ) : pathname.includes('/guides-immobilier') ? (
                <h1 className="text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">Guides Immobilier</h1>
              ) : pathname.includes('/newsletter') ? (
                <h1 className="text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">Newsletter</h1>
              ) : (
                <h1 className="text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">État des Lieux</h1>
              )}
              {consultant && (
                <span className="text-white text-[10px] sm:text-xs bg-white/20 px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded truncate max-w-[60px] sm:max-w-none">
                  {consultant}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Menu de navigation */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1 sm:p-1.5"
                  >
                    <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 sm:w-56">
                  <DropdownMenuItem onClick={() => navigateTo("/")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo("/consultant")}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    État des Lieux
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo("/plan-communication")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Plan de Communication
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo("/avis-google")}>
                    <Star className="mr-2 h-4 w-4" />
                    Avis Google
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo("/guides-immobilier")}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Guides Immobilier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo("/newsletter")}>
                    <Mail className="mr-2 h-4 w-4" />
                    Newsletter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user && (
              <span className="text-white text-sm mr-2 hidden md:inline-block">{user.displayName || user.email}</span>
            )}
            {isStandalone && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1 sm:p-1.5"
                aria-label="Rafraîchir la page"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-white hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 p-1 sm:p-1.5"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

