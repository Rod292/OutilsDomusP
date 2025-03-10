"use client"

import { FileText, Eye, Clock } from "lucide-react"

interface NavigationTabsProps {
  activeTab: "form" | "preview" | "recent"
  onTabChange: (tab: "form" | "preview" | "recent") => void
}

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  return (
    <div className="flex gap-3 px-6 py-3 bg-white border-b shadow-sm">
      <button
        onClick={() => onTabChange("form")}
        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
          activeTab === "form" 
            ? "bg-[#DC0032] text-white shadow-sm" 
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <FileText size={16} />
        <span>Formulaire</span>
      </button>
      <button
        onClick={() => onTabChange("preview")}
        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
          activeTab === "preview" 
            ? "bg-[#DC0032] text-white shadow-sm" 
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <Eye size={16} />
        <span>Aperçu</span>
      </button>
      <button
        onClick={() => onTabChange("recent")}
        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
          activeTab === "recent" 
            ? "bg-[#DC0032] text-white shadow-sm" 
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <Clock size={16} />
        <span>États des lieux récents</span>
      </button>
    </div>
  )
}

