import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { deleteIncompleteRegistration } from '@/lib/incomplete-registration';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await deleteIncompleteRegistration(session.uid);
  if (!result.deleted) {
    if (result.reason === 'agreement_already_signed') {
      return NextResponse.json(
        { error: 'Your account is already registered. Use login to continue.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Could not cancel registration. Please contact support.' },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete('thru_vendor_auth_token');

  return NextResponse.json({ success: true, redirect: '/signup' });
}
