"use client"

import { cn } from "@/lib/utils"

interface EtatSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function EtatSelector({ value, onChange, className }: EtatSelectorProps) {
  const options = [
    { label: "Très bon état", value: "Très bon état", color: "bg-emerald-400 hover:bg-emerald-500" },
    { label: "Bon état", value: "Bon état", color: "bg-lime-300 hover:bg-lime-400" },
    { label: "Etat moyen", value: "Etat moyen", color: "bg-orange-400 hover:bg-orange-500" },
    { label: "Mauvais état", value: "Mauvais état", color: "bg-red-500 hover:bg-red-600" },
  ]

  return (
    <div className={cn("grid grid-cols-2 gap-2 mt-safe", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={(e) => {
            e.preventDefault()
            onChange(option.value)
          }}
          className={cn(
            "px-3 py-3 rounded-full text-center transition-colors text-sm",
            option.color,
            value === option.value ? "ring-2 ring-offset-2 ring-black" : "",
            "text-black font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

