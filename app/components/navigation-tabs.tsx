"use client"

interface NavigationTabsProps {
  activeTab: "form" | "preview" | "recent"
  onTabChange: (tab: "form" | "preview" | "recent") => void
}

export function NavigationTabs({ activeTab, onTabChange }: NavigationTabsProps) {
  return (
    <div className="flex gap-2 px-6 py-2 bg-white border-b">
      <button
        onClick={() => onTabChange("form")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === "form" ? "bg-[#DC0032] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
        }`}
      >
        Formulaire
      </button>
      <button
        onClick={() => onTabChange("preview")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === "preview" ? "bg-[#DC0032] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
        }`}
      >
        Aperçu
      </button>
      <button
        onClick={() => onTabChange("recent")}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === "recent" ? "bg-[#DC0032] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
        }`}
      >
        États des lieux récents
      </button>
    </div>
  )
}

