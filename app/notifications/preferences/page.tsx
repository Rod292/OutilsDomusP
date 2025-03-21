export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import NotificationPreferencesContent from "./content";

// Composant de chargement pour le Suspense
const NotificationPreferencesLoading = () => (
  <div className="flex flex-col items-center justify-center min-h-screen py-12">
    <div className="animate-spin rounded-full border-2 border-t-transparent h-12 w-12" />
    <p className="mt-4 text-gray-500">Chargement des préférences de notifications...</p>
  </div>
);

// Page principale qui utilise Suspense
export default function NotificationPreferencesPage() {
  return (
    <Suspense fallback={<NotificationPreferencesLoading />}>
      <NotificationPreferencesContent />
    </Suspense>
  );
} 