"use client"

import { FileText, Eye, Clock } from "lucide-react"

interface NavigationTabsProps {
  activeTab: "form" | "preview" | "recent"
  onTabChange: (tab: "form" | "preview" | "recent") => void
}

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  return (
    <div className="flex overflow-x-auto gap-2 px-3 sm:px-6 py-2 bg-white border-b shadow-sm">
      <button
        onClick={() => onTabChange("form")}
        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
          activeTab === "form" 
            ? "bg-[#DC0032] text-white shadow-sm" 
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <FileText size={14} className="flex-shrink-0" />
        <span>Formulaire</span>
      </button>
      <button
        onClick={() => onTabChange("preview")}
        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
          activeTab === "preview" 
            ? "bg-[#DC0032] text-white shadow-sm" 
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <Eye size={14} className="flex-shrink-0" />
        <span>Aperçu</span>
      </button>
      <button
        onClick={() => onTabChange("recent")}
        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
          activeTab === "recent" 
            ? "bg-[#DC0032] text-white shadow-sm" 
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <Clock size={14} className="flex-shrink-0" />
        <span>Récents</span>
      </button>
    </div>
  )
}

