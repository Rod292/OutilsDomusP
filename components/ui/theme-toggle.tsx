"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"

const spring = {
  type: "spring",
  stiffness: 700,
  damping: 30
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isOn, setIsOn] = useState(false)

  // Effet pour initialiser l'état du bouton en fonction du thème actuel
  useEffect(() => {
    setMounted(true)
    setIsOn(theme === "dark")
  }, [theme])

  // Éviter le rendu hydration mismatch
  if (!mounted) {
    return null
  }

  const toggleSwitch = () => {
    setIsOn(!isOn)
    setTheme(isOn ? "light" : "dark")
  }

  return (
    <div 
      onClick={toggleSwitch}
      className={`flex-start flex h-[28px] w-[56px] rounded-[50px] bg-white/20 p-[3px] shadow-inner hover:cursor-pointer ${
        isOn ? "justify-end" : "justify-start"
      }`}
      role="button"
      aria-label={`Basculer vers le mode ${isOn ? "clair" : "sombre"}`}
      tabIndex={0}
    >
      <motion.div
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow-md"
        layout
        transition={spring}
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: isOn ? 360 : 0 }}
          transition={{ duration: 0.7, type: "spring" }}
        >
          {isOn ? (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#1E293B" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#F59E0B" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="m4.93 4.93 1.41 1.41"></path>
              <path d="m17.66 17.66 1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="m6.34 17.66-1.41 1.41"></path>
              <path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
} 