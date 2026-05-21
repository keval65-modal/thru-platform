
'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useSession } from '@/hooks/use-session';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Skip AppShell wrapper for admin routes - they have their own AdminShell
  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (!isLoading && !session?.isAuthenticated && !isAdminRoute) {
      router.push('/login');
    }
  }, [isLoading, session, router, isAdminRoute]);

  useEffect(() => {
    if (isLoading || !session?.isAuthenticated || isAdminRoute || session.role === 'admin') return;
    const path = pathname || '';
    const skip =
      path.startsWith('/merchant/agreement') ||
      path.startsWith('/kyc') ||
      path.startsWith('/bank') ||
      path.startsWith('/agreements') ||
      path.startsWith('/whatsapp-consent') ||
      path.startsWith('/signup');
    if (skip) return;

    let cancelled = false;
    fetch('/api/merchant/onboarding', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && data.agreementSigned === false) {
          router.replace('/merchant/agreement');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoading, session, pathname, router, isAdminRoute]);

  // Admin routes are handled by their own layout, so just return children
  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (isLoading || !session?.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="p-8 space-y-4 w-full max-w-lg">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
