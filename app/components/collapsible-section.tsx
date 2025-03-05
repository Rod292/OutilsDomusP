"use client"

import type * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  className?: string
}

export function CollapsibleSection({ title, children, isOpen, onToggle, className }: CollapsibleSectionProps) {
  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
      >
        <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        <div className="bg-white rounded-full p-1.5 shadow-sm">
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-gray-200 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

