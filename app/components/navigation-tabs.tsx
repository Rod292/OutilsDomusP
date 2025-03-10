"use client"

import { FileText, Eye, Clock, ChevronRight, ChevronLeft } from "lucide-react"
import { useRef, useEffect, useState } from "react"

interface NavigationTabsProps {
  activeTab: "form" | "preview" | "recent"
  onTabChange: (tab: "form" | "preview" | "recent") => void
}

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Vérifier si le défilement est nécessaire
  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (container) {
        setShowLeftArrow(container.scrollLeft > 0);
        setShowRightArrow(container.scrollLeft < container.scrollWidth - container.clientWidth - 5);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      // Observer les changements de taille
      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(container);
      // Vérification initiale
      checkScroll();

      return () => {
        container.removeEventListener('scroll', checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, []);

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -100, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 100, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative bg-white border-b shadow-sm">
      {showLeftArrow && (
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-70 rounded-full p-1 shadow-sm"
          aria-label="Défiler vers la gauche"
        >
          <ChevronLeft size={18} className="text-gray-700" />
        </button>
      )}
      
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto no-scrollbar gap-2 px-2 sm:px-4 py-2 scrollbar-hide"
      >
        <button
          onClick={() => onTabChange("form")}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
            activeTab === "form" 
              ? "bg-[#DC0032] text-white shadow-sm" 
              : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <FileText size={14} />
          <span>Formulaire</span>
        </button>
        <button
          onClick={() => onTabChange("preview")}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
            activeTab === "preview" 
              ? "bg-[#DC0032] text-white shadow-sm" 
              : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Eye size={14} />
          <span>Aperçu</span>
        </button>
        <button
          onClick={() => onTabChange("recent")}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
            activeTab === "recent" 
              ? "bg-[#DC0032] text-white shadow-sm" 
              : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Clock size={14} />
          <span>Récents</span>
        </button>
      </div>
      
      {showRightArrow && (
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-70 rounded-full p-1 shadow-sm"
          aria-label="Défiler vers la droite"
        >
          <ChevronRight size={18} className="text-gray-700" />
        </button>
      )}
    </div>
  )
}

