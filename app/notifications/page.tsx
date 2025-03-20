import { Metadata } from 'next';
import NotificationManager from '../components/notifications/NotificationManager';
import { Header } from '../components/header';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Gestion des notifications',
  description: 'Gérez vos appareils recevant des notifications pour chaque consultant',
};

// Composant de fallback pendant le chargement
function NotificationsLoading() {
  return (
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-full max-w-sm" />
      <Skeleton className="h-96 w-full rounded-md" />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex-1 container mx-auto py-8 px-4">
        <div className="grid gap-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Gestion des notifications</h1>
            <p className="text-muted-foreground text-sm">
              Vous pouvez voir et gérer ici tous les appareils qui reçoivent des notifications.
            </p>
          </div>
          
          <Suspense fallback={<NotificationsLoading />}>
            <NotificationManager />
          </Suspense>
        </div>
      </div>
    </div>
  );
} 