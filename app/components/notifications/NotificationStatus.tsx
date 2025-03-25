import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { NotificationPermission } from './NotificationPermission';
import { Badge } from '../ui/badge';
import { debugUserTokens } from '../../services/notificationService';

interface NotificationStatusProps {
  email?: string;
  consultant?: string;
}

export function NotificationStatus({ email, consultant }: NotificationStatusProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');

  // Afficher les informations de débogage au chargement
  useEffect(() => {
    if (email) {
      debugUserTokens(email, consultant);
    }
  }, [email, consultant]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>État des notifications</CardTitle>
            <CardDescription>
              Gérez les notifications pour cet appareil
            </CardDescription>
          </div>
          <Badge variant={permissionStatus === 'granted' ? 'default' : 'secondary'}>
            {permissionStatus === 'granted' ? 'Activées' : 
             permissionStatus === 'denied' ? 'Bloquées' :
             permissionStatus === 'unsupported' ? 'Non supportées' : 'Non activées'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <NotificationPermission
          email={email}
          consultant={consultant}
          onPermissionChange={setPermissionStatus}
        />
        
        {email && (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Configuration actuelle :</p>
            <ul className="list-disc list-inside mt-2">
              <li>Email : {email}</li>
              {consultant && <li>Consultant : {consultant}</li>}
              <li>Navigateur : {navigator.userAgent}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 