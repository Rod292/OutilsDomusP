"use client";

import { Suspense } from "react";
import { Header } from "@/app/components/header";
import { LoadingSpinner } from "@/app/components/ui/loading";
import NotificationPreferencesClient from "./client";

// Page principale exportée comme composant client
export default function NotificationsPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      }>
        <NotificationPreferencesClient />
      </Suspense>
    </>
  );
} 