import { Metadata } from 'next';
import NotificationManagerWrapper from '../components/notifications/NotificationManagerWrapper';
import HeaderWrapper from '../components/HeaderWrapper';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationList from '../components/NotificationList';
import NotificationSettings from '../components/NotificationSettings';
import DebugNotificationComponent from '../components/DebugNotificationComponent';
import { Separator } from '@/components/ui/separator';

// Configuration pour éviter la génération statique
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Gestion des notifications',
  description: 'Gérez vos appareils recevant des notifications pour chaque consultant',
};

export default function NotificationsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderWrapper />
      
      <div className="flex-1 container mx-auto py-8 px-4">
        <div className="grid gap-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Gestion des notifications</h1>
            <p className="text-muted-foreground text-sm">
              Vous pouvez voir et gérer ici tous les appareils qui reçoivent des notifications.
            </p>
          </div>
          
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
              <TabsTrigger value="debug">Débogage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications" className="space-y-4 pt-4">
              <NotificationList />
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4 pt-4">
              <NotificationSettings />
            </TabsContent>
            
            <TabsContent value="debug" className="space-y-4 pt-4">
              <DebugNotificationComponent />
              
              <Separator className="my-6" />
              
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">Aide au débogage</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Si vous rencontrez des problèmes avec les notifications, suivez ces étapes:
                </p>
                
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Vérifiez que vous avez bien autorisé les notifications dans votre navigateur</li>
                  <li>Assurez-vous que votre appareil est connecté à Internet</li>
                  <li>Sur iOS, vérifiez que l'application est en arrière-plan et non complètement fermée</li>
                  <li>Utilisez l'outil de débogage ci-dessus pour vérifier si des tokens sont bien enregistrés</li>
                  <li>Essayez de réactiver les notifications en cliquant sur l'icône de la cloche dans l'en-tête</li>
                  <li>Si les problèmes persistent, contactez le support technique</li>
                </ol>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 