"use client";

import { AssignedToFilterProvider } from './hooks/useAssignedToFilter';

export default function NotionPlanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AssignedToFilterProvider>
      {children}
    </AssignedToFilterProvider>
  );
} 