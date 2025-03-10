"use client"

import { Progress } from "@/components/ui/progress"
import { CheckCircle2 } from "lucide-react"
import type React from "react"

interface ProgressBarProps {
  value: number
}

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-white border-b">
      <div className="flex-grow">
        <Progress
          value={value}
          className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"
          style={
            {
              "--progress-background": value === 100 ? "#10B981" : "#DC0032",
            } as React.CSSProperties
          }
        />
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
        {value === 100 ? (
          <>
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-emerald-600">Complété</span>
          </>
        ) : (
          <span className="text-gray-700">{value}% complété</span>
        )}
      </div>
    </div>
  )
}

