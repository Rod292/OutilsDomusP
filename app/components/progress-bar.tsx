"use client"

import { Progress } from "@/components/ui/progress"
import type React from "react"

interface ProgressBarProps {
  value: number
}

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-white border-b">
      <div className="flex-grow">
        <Progress
          value={value}
          className="w-full bg-gray-100"
          style={
            {
              "--progress-background": "#DC0032",
            } as React.CSSProperties
          }
        />
      </div>
      <div className="text-sm text-gray-600 whitespace-nowrap">{value}% complété</div>
    </div>
  )
}

