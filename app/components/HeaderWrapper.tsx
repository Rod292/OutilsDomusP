'use client';

import { Suspense } from 'react';
import { Header } from './header';
import { Skeleton } from '@/components/ui/skeleton';

function HeaderLoading() {
  return (
    <div className="bg-[#DC0032] dark:bg-[#9A0023] h-14 sm:h-16 shadow-md">
      <div className="animate-pulse bg-white/10 h-full w-full"></div>
    </div>
  );
}

export default function HeaderWrapper() {
  return (
    <Suspense fallback={<HeaderLoading />}>
      <Header />
    </Suspense>
  );
} 