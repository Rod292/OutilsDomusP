import { Metadata } from 'next';
import NotificationManager from '../components/notifications/NotificationManager';
import { Header } from '../components/header';

export const metadata: Metadata = {
  title: 'Gestion des notifications',
  description: 'Gérez vos appareils recevant des notifications pour chaque consultant',
};

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
          
          <NotificationManager />
        </div>
      </div>
    </div>
  );
} 