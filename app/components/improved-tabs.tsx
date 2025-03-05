"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface Tab {
  value: string
  label: string
}

interface ImprovedTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (value: string) => void
}

export function ImprovedTabs({ tabs, activeTab, onTabChange }: ImprovedTabsProps) {
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const scrollAreaRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    const scrollArea = scrollAreaRef.current
    if (scrollArea) {
      setCanScrollLeft(scrollArea.scrollLeft > 0)
      setCanScrollRight(scrollArea.scrollLeft < scrollArea.scrollWidth - scrollArea.clientWidth)
    }
  }

  React.useEffect(() => {
    handleScroll()
    window.addEventListener("resize", handleScroll)
    return () => window.removeEventListener("resize", handleScroll)
  }, [])

  const scrollByAmount = (amount: number) => {
    const scrollArea = scrollAreaRef.current
    if (scrollArea) {
      scrollArea.scrollBy({ left: amount, behavior: "smooth" })
    }
  }

  return (
    <div className="relative">
      <ScrollArea ref={scrollAreaRef} className="w-full whitespace-nowrap" onScroll={handleScroll}>
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "outline"}
              className={`flex-shrink-0 px-6 py-3 text-base font-medium transition-all duration-200 ease-in-out ${
                activeTab === tab.value ? "bg-brand text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => onTabChange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm"
          onClick={() => scrollByAmount(-200)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm"
          onClick={() => scrollByAmount(200)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

