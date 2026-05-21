import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error('[Session API] Failed to retrieve session:', error);
    return NextResponse.json({ isAuthenticated: false }, { status: 500 });
  }
}






