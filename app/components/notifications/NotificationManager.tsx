'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Smartphone, Laptop, Server, AlertCircle } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { useAuth } from '@/app/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CleanupNotificationsButton from './CleanupNotificationsButton';
import FixNotificationTokensButton from './FixNotificationTokensButton';
import { useSearchParams } from 'next/navigation';
import { getFirestore, onSnapshot } from 'firebase/firestore';

interface NotificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  timestamp: number;
  createdAt: any;
  platform?: string;
  userAgent?: string;
  deviceName?: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  taskId?: string;
  read: boolean;
  timestamp: Date;
  [key: string]: any;
}

export default function NotificationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<NotificationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);

  // Fonction pour récupérer les tokens de notification
  const fetchTokens = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const db = getFirestore();
      
      // Requête pour récupérer les tokens
      const tokensRef = collection(db, 'notificationTokens');
      let tokensQuery;
      
      if (consultant && consultant !== 'null') {
        // Si un consultant est sélectionné, chercher des tokens spécifiques
        const userId = `${user.email}_${consultant}`;
        tokensQuery = query(
          tokensRef,
          where('userId', '==', userId)
        );
      } else {
        // Sinon, chercher des tokens pour cet email
        tokensQuery = query(
          tokensRef,
          where('email', '==', user.email)
        );
      }
      
      const tokensSnapshot = await getDocs(tokensQuery);
      console.log(`Récupération de ${tokensSnapshot.size} tokens de notification`);
      
      // Mettre à jour l'état
      setTokens(tokensSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationToken[]);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchTokens();
    }
  }, [user?.email, consultant]);

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce token?')) {
      return;
    }
    
    try {
      setDeleting(prev => ({ ...prev, [tokenId]: true }));
      
      // Supprimer le token de la base de données
      await deleteDoc(doc(db, 'notificationTokens', tokenId));
      
      // Mettre à jour l'état local
      setTokens(prev => prev.filter(token => token.id !== tokenId));
      
      toast({
        title: "Token supprimé",
        description: "Le token de notification a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le token",
        variant: "destructive",
      });
    } finally {
      setDeleting(prev => ({ ...prev, [tokenId]: false }));
    }
  };

  const getDeviceIcon = (token: NotificationToken) => {
    const userAgent = token.userAgent?.toLowerCase() || '';
    const platform = token.platform?.toLowerCase() || '';
    
    if (userAgent.includes('iphone') || platform.includes('ios')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (userAgent.includes('android')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (userAgent.includes('mac') || userAgent.includes('safari')) {
      return <Laptop className="h-4 w-4" />;
    } else if (userAgent.includes('windows') || userAgent.includes('chrome')) {
      return <Laptop className="h-4 w-4" />;
    } else {
      return <Server className="h-4 w-4" />;
    }
  };

  const getDeviceName = (token: NotificationToken) => {
    if (token.deviceName) return token.deviceName;
    
    const userAgent = token.userAgent?.toLowerCase() || '';
    const platform = token.platform?.toLowerCase() || '';
    
    if (userAgent.includes('iphone') || platform.includes('ios')) {
      return 'iPhone';
    } else if (userAgent.includes('ipad')) {
      return 'iPad';
    } else if (userAgent.includes('android')) {
      return 'Android';
    } else if (userAgent.includes('mac')) {
      return 'Mac';
    } else if (userAgent.includes('windows')) {
      return 'Windows';
    } else if (userAgent.includes('chrome')) {
      return 'Chrome';
    } else if (userAgent.includes('firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('safari')) {
      return 'Safari';
    } else {
      return 'Appareil inconnu';
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Date inconnue';
    
    try {
      const date = new Date(timestamp);
      return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Pour la partie qui récupère les notifications, modifiez-la pour gérer l'erreur d'index
  useEffect(() => {
    if (!user?.email) return;
    
    let unsubscribe = () => {};
    
    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const db = getFirestore();
        
        // Construire la requête
        const notificationsRef = collection(db, 'notifications');
        
        // Identifiant utilisateur
        let userIds = [user.email];
        if (consultant && consultant !== 'null') {
          userIds.push(`${user.email}_${consultant}`);
        }
        
        try {
          // Essayer d'utiliser une requête avec tri
          const notificationsQuery = query(
            notificationsRef,
            where('userId', 'in', userIds),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
          
          unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date()
            })) as Notification[];
            
            setNotifications(notificationsData);
            setNotificationsLoading(false);
            setIndexError(false);
          }, (error) => {
            console.error('Erreur avec la requête de notifications:', error);
            
            // Vérifier si c'est une erreur d'index manquant
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
              setIndexError(true);
              
              // Utiliser une requête sans tri comme solution de secours
              const simpleQuery = query(
                notificationsRef,
                where('userId', 'in', userIds),
                limit(20)
              );
              
              getDocs(simpleQuery).then(snapshot => {
                const notificationsData = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  timestamp: doc.data().timestamp?.toDate() || new Date()
                })) as Notification[];
                
                // Trier manuellement côté client
                notificationsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                
                setNotifications(notificationsData);
                setNotificationsLoading(false);
              }).catch(err => {
                console.error('Erreur avec la requête simple:', err);
                setNotificationsLoading(false);
              });
            } else {
              setNotificationsLoading(false);
            }
          });
          
        } catch (error) {
          console.error('Erreur lors de la configuration de la requête:', error);
          setNotificationsLoading(false);
        }
        
      } catch (error) {
        console.error('Erreur globale:', error);
        setNotificationsLoading(false);
      }
    };
    
    fetchNotifications();
    
    return () => unsubscribe();
  }, [user?.email, consultant]);
  
  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p>Veuillez vous connecter pour gérer vos notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des notifications</CardTitle>
        <CardDescription>
          {consultant ? (
            `Gérez les appareils recevant des notifications pour ${consultant}`
          ) : (
            'Gérez les appareils recevant des notifications'
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {indexError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
            <AlertCircle className="text-yellow-500 h-5 w-5 mr-2" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Index en cours de création</p>
              <p>Un index Firestore est en cours de création. Certaines fonctionnalités peuvent être limitées.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-muted-foreground">Aucun appareil n'est enregistré pour les notifications</p>
            <Button variant="outline" size="sm">
              Activer les notifications
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Appareils enregistrés</h3>
              <div className="flex space-x-2">
                <FixNotificationTokensButton email={user.email} consultant={consultant || undefined} />
                <CleanupNotificationsButton 
                  userId={consultant ? `${user.email}_${consultant}` : user.email}
                  onCleaned={fetchTokens}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchTokens}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="border rounded-md divide-y">
              {tokens.map(token => (
                <div 
                  key={token.id} 
                  className="p-3 flex justify-between items-start hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(token)}
                      <span className="font-medium text-sm">{getDeviceName(token)}</span>
                      {token.timestamp && new Date().getTime() - token.timestamp < 24 * 60 * 60 * 1000 && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-100">Récent</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-md">
                      {token.token?.substring(0, 20)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Enregistré le {formatTimestamp(token.timestamp)}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteToken(token.id)}
                    disabled={deleting[token.id]}
                  >
                    {deleting[token.id] ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {tokens.length} appareil(s) enregistré(s)
        </div>
      </CardFooter>
    </Card>
  );
} 