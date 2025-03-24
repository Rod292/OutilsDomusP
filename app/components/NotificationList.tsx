'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Bell, CheckCircle, Clock, X, Trash2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import NotificationManagerWrapper from './notifications/NotificationManagerWrapper';

export default function NotificationList() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const consultant = searchParams.get('consultant');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    setLoading(true);

    // Construire le userId pour la recherche
    let userId = user.email;
    if (consultant && consultant !== 'null') {
      userId = `${user.email}_${consultant}`;
    }

    // Requête pour récupérer les notifications (soit spécifiques au consultant, soit générales)
    const db = getFirestore();
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('userId', 'in', [userId, user.email]),
      orderBy('timestamp', 'desc')
    );

    // Observer les changements
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.email, consultant]);

  const markAsRead = async (notificationId: string) => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications.length) return;
    
    setIsMarkingAllAsRead(true);
    try {
      const db = getFirestore();
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Mettre à jour par lots de 10 maximum (limitation Firestore)
      const batchSize = 10;
      for (let i = 0; i < unreadNotifications.length; i += batchSize) {
        const batch = unreadNotifications.slice(i, i + batchSize);
        await Promise.all(
          batch.map(notification => 
            updateDoc(doc(db, 'notifications', notification.id), { read: true })
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  // Afficher un message si aucune notification
  if (!loading && notifications.length === 0) {
    return (
      <div>
        <NotificationManagerWrapper className="mb-6" />
        <Card className="bg-muted">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center p-6">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune notification</h3>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas encore reçu de notifications.
              Les nouvelles notifications apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Grouper les notifications par jour
  const groupedNotifications: Record<string, any[]> = {};
  notifications.forEach(notification => {
    const date = format(notification.timestamp, 'yyyy-MM-dd');
    if (!groupedNotifications[date]) {
      groupedNotifications[date] = [];
    }
    groupedNotifications[date].push(notification);
  });

  return (
    <div>
      <NotificationManagerWrapper className="mb-6" />
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Historique des notifications</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={markAllAsRead}
          disabled={isMarkingAllAsRead || !notifications.some(n => !n.read)}
        >
          {isMarkingAllAsRead ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Tout marquer comme lu
        </Button>
      </div>
      
      <div className="space-y-4">
        {loading ? (
          <Card className="bg-muted">
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center p-6">
              <RefreshCw className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium mb-2">Chargement des notifications</h3>
              <p className="text-sm text-muted-foreground">
                Veuillez patienter pendant que nous récupérons vos notifications...
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.keys(groupedNotifications).map(date => (
            <div key={date} className="mb-4">
              <div className="flex items-center mb-2">
                <div className="text-sm font-medium mr-2">
                  {format(new Date(date), 'dd MMMM yyyy', { locale: fr })}
                </div>
                <Separator className="flex-grow" />
              </div>
              
              <div className="space-y-2">
                {groupedNotifications[date].map(notification => (
                  <Card 
                    key={notification.id} 
                    className={`overflow-hidden ${notification.read ? 'bg-card/60' : 'border-primary/30 bg-primary/5'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <h4 className="text-sm font-semibold mr-2">{notification.title}</h4>
                            {!notification.read && (
                              <Badge variant="default" className="text-[10px] h-5">Nouveau</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.body}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(notification.timestamp, 'HH:mm', { locale: fr })}
                            
                            {notification.type && (
                              <>
                                <span className="mx-1">•</span>
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {notification.type.replace('_', ' ')}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 