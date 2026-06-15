'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useFirebaseUser() {
  const [user, setUser] = React.useState<User | null>(auth?.currentUser ?? null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, firebaseUid: user?.uid ?? null };
}
