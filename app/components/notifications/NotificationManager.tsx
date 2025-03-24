'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Smartphone, Laptop, Server, AlertCircle, Eraser } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { useAuth } from '@/app/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { cleanupDuplicateTokens } from "@/app/services/notificationService";
import CleanupNotificationsButton from './CleanupNotificationsButton';

interface NotificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  timestamp: number;
  platform: string;
  userAgent: string;
  createdAt: any;
  lastUpdated: any;
}

export default function NotificationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<NotificationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Fonction pour récupérer les tokens de notification
  const fetchTokens = async () => {
    if (!user?.email) return;
    
    try {
      setRefreshing(true);
      
      // Récupérer tous les tokens associés à cet email
      const tokensRef = collection(db, 'notificationTokens');
      const q = query(tokensRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      const tokensData: NotificationToken[] = [];
      querySnapshot.forEach((doc) => {
        tokensData.push({
          id: doc.id,
          ...doc.data()
        } as NotificationToken);
      });
      
      // Trier par date de dernière mise à jour (plus récent en premier)
      tokensData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      setTokens(tokensData);
      console.log(`Récupération de ${tokensData.length} tokens de notification`);
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Récupérer les tokens au chargement du composant
  useEffect(() => {
    if (user?.email) {
      fetchTokens();
    }
  }, [user?.email]);
  
  // Fonction pour nettoyer les tokens dupliqués
  const cleanupTokens = async () => {
    if (!user?.email) return;

    try {
      // Appeler la fonction de nettoyage
      const deletedCount = await cleanupDuplicateTokens(user.email);
      
      if (deletedCount > 0) {
        toast({
          title: "Nettoyage effectué",
          description: `${deletedCount} notification${deletedCount > 1 ? 's' : ''} dupliquée${deletedCount > 1 ? 's' : ''} supprimée${deletedCount > 1 ? 's' : ''}.`,
          variant: "default",
        });
        
        // Rafraîchir la liste
        fetchTokens();
      } else {
        toast({
          title: "Aucun doublon trouvé",
          description: "Tous vos appareils sont correctement enregistrés.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des tokens:', error);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer les notifications.",
        variant: "destructive",
      });
    }
  };
  
  // Fonction pour supprimer un token de notification
  const deleteToken = async (tokenId: string) => {
    try {
      await deleteDoc(doc(db, 'notificationTokens', tokenId));
      
      // Mettre à jour la liste des tokens
      setTokens(tokens.filter(token => token.id !== tokenId));
      
      toast({
        title: "Notification supprimée",
        description: "L'appareil ne recevra plus de notifications",
        variant: "default",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive",
      });
    }
  };
  
  // Fonction pour déterminer l'icône en fonction du type d'appareil
  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent?.toLowerCase() || '';
    
    if (ua.includes('iphone') || ua.includes('android') || ua.includes('mobile')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (ua.includes('macintosh') || ua.includes('windows') || ua.includes('linux')) {
      return <Laptop className="h-4 w-4" />;
    } else {
      return <Server className="h-4 w-4" />;
    }
  };
  
  // Fonction pour obtenir le nom de l'appareil à partir de l'user agent
  const getDeviceName = (userAgent: string) => {
    const ua = userAgent?.toLowerCase() || '';
    
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('macintosh')) return 'Mac';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('linux')) return 'Linux';
    
    return 'Appareil inconnu';
  };
  
  // Fonction pour formater la date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Date inconnue';
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Extraire la liste des consultants pour lesquels l'utilisateur reçoit des notifications
  const consultants = [...new Set(tokens.map(token => {
    // Format: email_consultant
    const parts = token.userId?.split('_');
    return parts && parts.length > 1 ? parts[1] : 'personnel';
  }))];
  
  // Filtrer les tokens en fonction de l'onglet sélectionné
  const filteredTokens = selectedTab === "all" 
    ? tokens 
    : tokens.filter(token => {
        const parts = token.userId?.split('_');
        return parts && parts.length > 1 && parts[1] === selectedTab;
      });
  
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestion des notifications</CardTitle>
          <CardDescription>Vous devez être connecté pour gérer vos notifications</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestion des notifications</CardTitle>
            <CardDescription>
              Gérez les appareils recevant des notifications pour chaque consultant
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchTokens} 
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium">Aucune notification activée</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Vous n'avez activé les notifications pour aucun appareil.
              <br />
              Utilisez le bouton de notification dans le plan de communication pour les activer.
            </p>
          </div>
        ) : (
          <>
            <Tabs 
              defaultValue="all" 
              value={selectedTab} 
              onValueChange={setSelectedTab}
              className="w-full"
            >
              <TabsList className="mb-4 flex flex-wrap">
                <TabsTrigger value="all">Tous</TabsTrigger>
                {consultants.map(consultant => (
                  <TabsTrigger key={consultant} value={consultant}>
                    {consultant === 'personnel' ? 'Personnel' : consultant}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value={selectedTab} className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Appareils enregistrés</h3>
                    <CleanupNotificationsButton onSuccess={fetchTokens} />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Appareil</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead className="hidden md:table-cell">Consultant</TableHead>
                      <TableHead className="hidden md:table-cell">Activé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTokens.map((token) => {
                      // Extraire le nom du consultant à partir de userId (format: email_consultant)
                      const userId = token.userId || '';
                      const parts = userId.split('_');
                      const consultant = parts.length > 1 ? parts[1] : 'personnel';
                      
                      return (
                        <TableRow key={token.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {getDeviceIcon(token.userAgent)}
                              <span className="ml-2">{getDeviceName(token.userAgent)}</span>
                            </div>
                            <div className="text-xs text-gray-500 md:hidden mt-1">
                              <Badge variant="outline" className="mr-1">
                                {consultant}
                              </Badge>
                              {formatDate(token.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {token.platform || 'Web'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">
                              {consultant}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(token.timestamp)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteToken(token.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Supprimer</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-xs text-gray-500">
        <p>
          Lorsque vous supprimez un appareil, il ne recevra plus de notifications pour le consultant sélectionné. 
          Si vous souhaitez recevoir des notifications sur un appareil que vous avez supprimé, vous devrez les réactiver.
        </p>
      </CardFooter>
    </Card>
  );
} 