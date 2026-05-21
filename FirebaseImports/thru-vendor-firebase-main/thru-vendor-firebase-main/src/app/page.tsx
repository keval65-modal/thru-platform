import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/auth';

export default async function RootPage() {
  try {
    const session = await getSession();
    if (session.isAuthenticated) {
      redirect('/orders');
    } else {
      redirect('/login');
    }
  } catch (error) {
    // If session check fails, redirect to login
    console.error('Root page error:', error);
    redirect('/login');
  }
}
