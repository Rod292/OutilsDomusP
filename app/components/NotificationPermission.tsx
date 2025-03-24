'use client';

import React, { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/hooks/useAuth';

export interface NotificationPermissionProps {
  className?: string;
  iconOnly?: boolean;
  consultant?: string;
}

export default function NotificationPermission({ 
  className, 
  iconOnly = true,
  consultant
}: NotificationPermissionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleActivate = () => {
    setLoading(true);
    // Placeholder pour notification
    setTimeout(() => {
      toast({
        title: "Système en cours de refonte",
        description: "Le système de notification est en cours de reconstruction.",
      });
      setLoading(false);
    }, 1000);
  };

  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 relative", className)}
        onClick={handleActivate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        <span className={cn("absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-yellow-500")} />
      </Button>
    );
  }

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <Button
        variant="default"
        size="sm"
        onClick={handleActivate}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement...</>
        ) : (
          <><Bell className="mr-2 h-4 w-4" /> Activer les notifications</>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">Le système de notification est en cours de reconstruction.</p>
    </div>
  );
} 