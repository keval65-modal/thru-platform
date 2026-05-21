import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabaseDbClient } from '@/lib/supabase-auth';
import { getOnboardingSummary } from '@/lib/onboarding-service';

export async function GET() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await getOnboardingSummary(session.uid, getSupabaseDbClient());
    return NextResponse.json(summary);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to load onboarding';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
