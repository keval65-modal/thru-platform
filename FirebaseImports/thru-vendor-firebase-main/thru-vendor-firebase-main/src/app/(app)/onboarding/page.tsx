'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getOnboardingSummary, type OnboardingSummary } from '@/lib/onboarding-service';
import { ProfileCompletionCard } from '@/components/onboarding/ProfileCompletionCard';

export default function OnboardingPage() {
  const { session, isLoading } = useSession();
  const [summary, setSummary] = useState<OnboardingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.uid) {
      getOnboardingSummary(session.uid)
        .then(setSummary)
        .finally(() => setLoading(false));
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [session, isLoading]);

  if (isLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session?.isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication required</CardTitle>
        </CardHeader>
        <CardContent>Please log in to continue onboarding.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Finish these steps to start receiving payouts and avoid account issues.
        </p>
      </div>

      {summary && <ProfileCompletionCard summary={summary} />}
    </div>
  );
}

