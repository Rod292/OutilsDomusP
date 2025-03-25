'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Chrome, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsHelpPage() {
  const router = useRouter();
  const isChrome = typeof navigator !== 'undefined' && navigator.userAgent.includes('Chrome');
  const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');
  
  const openChromeSettings = () => {
    try {
      window.open('chrome://settings/content/notifications', '_blank');
    } catch (error) {
      console.error('Impossible d\'ouvrir les paramètres Chrome:', error);
    }
  };
  
  const openFirefoxSettings = () => {
    try {
      window.open('about:preferences#privacy', '_blank');
    } catch (error) {
      console.error('Impossible d\'ouvrir les paramètres Firefox:', error);
    }
  };
  
  return (
    <div className="container mx-auto py-12 px-4">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Comment activer les notifications</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Pourquoi les notifications sont importantes</h2>
          <p className="mb-4">
            Les notifications vous permettent de recevoir des alertes en temps réel lorsqu'une tâche ou une communication vous est assignée, 
            même lorsque vous n'êtes pas sur le site.
          </p>
        </div>
        
        {isChrome && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Chrome className="mr-2 h-5 w-5" />
              Instructions pour Google Chrome
            </h2>
            <ol className="list-decimal pl-6 space-y-4">
              <li>Cliquez sur l'icône de cadenas à gauche de l'URL dans la barre d'adresse</li>
              <li>Trouvez l'option "Notifications" et sélectionnez "Autoriser"</li>
              <li>Si les notifications étaient précédemment bloquées, vous verrez peut-être "Bloqué" - Cliquez dessus pour changer en "Autoriser"</li>
              <li>Si vous ne voyez pas d'option pour changer le paramètre, suivez ces étapes supplémentaires:
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>Cliquez sur l'icône ⋮ (menu) en haut à droite de Chrome</li>
                  <li>Sélectionnez "Paramètres"</li>
                  <li>Dans la section "Confidentialité et sécurité", cliquez sur "Paramètres des sites"</li>
                  <li>Cliquez sur "Notifications"</li>
                  <li>Recherchez notre site dans la liste des sites bloqués</li>
                  <li>Changez le statut de "Bloquer" à "Autoriser"</li>
                </ul>
              </li>
              <li>Rafraîchissez cette page après avoir activé les notifications</li>
            </ol>
            <div className="mt-6">
              <Button onClick={openChromeSettings} className="mr-4">
                Ouvrir les paramètres de notifications Chrome
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Rafraîchir la page
              </Button>
            </div>
          </div>
        )}
        
        {isFirefox && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Instructions pour Firefox</h2>
            <ol className="list-decimal pl-6 space-y-4">
              <li>Cliquez sur l'icône de cadenas à gauche de l'URL dans la barre d'adresse</li>
              <li>Cliquez sur la flèche à droite de "Connexion non sécurisée" ou "Connexion sécurisée"</li>
              <li>Trouvez "Notifications" et sélectionnez "Autoriser"</li>
              <li>Rafraîchissez la page après avoir activé les notifications</li>
            </ol>
            <div className="mt-6">
              <Button onClick={openFirefoxSettings}>
                Ouvrir les paramètres de confidentialité Firefox
              </Button>
            </div>
          </div>
        )}
        
        {!isChrome && !isFirefox && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-800">
            <h2 className="text-xl font-semibold mb-4">Instructions générales</h2>
            <ol className="list-decimal pl-6 space-y-4">
              <li>Cliquez sur l'icône de cadenas ou les paramètres du site à côté de l'URL</li>
              <li>Recherchez les options liées aux notifications</li>
              <li>Activez les notifications pour ce site</li>
              <li>Rafraîchissez la page après avoir modifié les paramètres</li>
            </ol>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Après avoir activé les notifications</h2>
          <p className="mb-4">
            Une fois les notifications activées dans votre navigateur, revenez à la page principale et cliquez sur l'icône de cloche 
            <Bell className="inline mx-1 h-4 w-4" /> 
            pour les activer pour le consultant spécifique.
          </p>
          <Button 
            variant="default" 
            onClick={() => router.push('/notion-plan')}
            className="mt-2"
          >
            Retour au Plan de Communication
          </Button>
        </div>
      </div>
    </div>
  );
} 