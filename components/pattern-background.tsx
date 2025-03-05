"use client"

import Image from "next/image"

interface PatternBackgroundProps {
  className?: string
  fill?: boolean
  height?: number
  width?: number
}

export function PatternBackground({ className = "", fill, height = 400, width = 800 }: PatternBackgroundProps) {
  if (fill) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Capture%20d%E2%80%99e%CC%81cran%202025-02-14%20a%CC%80%2009.42.22-uRR9ikguNo982toV6urni7ltA3kWxr.png"
          alt="Abstract pattern of vertical lines"
          fill
          className="object-cover"
          priority
        />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Capture%20d%E2%80%99e%CC%81cran%202025-02-14%20a%CC%80%2009.42.22-uRR9ikguNo982toV6urni7ltA3kWxr.png"
        alt="Abstract pattern of vertical lines"
        width={width}
        height={height}
        className="object-cover"
        priority
      />
    </div>
  )
}

