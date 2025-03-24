'use client';

import { Suspense } from 'react';
import NotificationManager from './NotificationManager';
import { Skeleton } from '@/components/ui/skeleton';

function NotificationManagerLoading() {
  return (
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-full max-w-sm" />
      <Skeleton className="h-96 w-full rounded-md" />
    </div>
  );
}

interface NotificationManagerWrapperProps {
  className?: string;
}

export default function NotificationManagerWrapper({ className = '' }: NotificationManagerWrapperProps) {
  return (
    <div className={className}>
      <Suspense fallback={<NotificationManagerLoading />}>
        <NotificationManager />
      </Suspense>
    </div>
  );
} 