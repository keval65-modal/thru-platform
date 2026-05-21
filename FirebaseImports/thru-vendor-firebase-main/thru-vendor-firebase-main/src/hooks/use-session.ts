
'use client';

import { useEffect, useState } from 'react';
import type { SessionData } from '@/types/session';

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch session.');
        }

        const data = (await response.json()) as SessionData;
        if (isMounted) {
          setSession(data);
        }
      } catch (error) {
        console.error('[useSession] Failed to fetch session:', error);
        if (isMounted) {
          setSession({ isAuthenticated: false });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return { session, isLoading };
}
