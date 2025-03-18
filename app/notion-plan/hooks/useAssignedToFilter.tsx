"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Créer un contexte pour le filtre d'assignation
interface AssignedToFilterContextType {
  assignedToFilter: string[];
  setAssignedToFilter: (filter: string[]) => void;
}

const AssignedToFilterContext = createContext<AssignedToFilterContextType | undefined>(undefined);

// Provider pour encapsuler l'application
export function AssignedToFilterProvider({ children }: { children: ReactNode }) {
  const [assignedToFilter, setAssignedToFilter] = useState<string[]>([]);

  return (
    <AssignedToFilterContext.Provider value={{ assignedToFilter, setAssignedToFilter }}>
      {children}
    </AssignedToFilterContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte
export function useAssignedToFilter() {
  const context = useContext(AssignedToFilterContext);
  if (context === undefined) {
    throw new Error("useAssignedToFilter doit être utilisé à l'intérieur d'un AssignedToFilterProvider");
  }
  return context;
} 