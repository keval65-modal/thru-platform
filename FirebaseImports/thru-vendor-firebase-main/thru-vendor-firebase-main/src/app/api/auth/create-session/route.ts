import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateUserForSession } from '@/lib/auth';
import { adminDb, getAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[Create Session API] Attempting to create session for UID:', uid);

    // Check if Firebase Admin app is initialized
    const app = getAdminApp();
    if (!app) {
      console.error('[Create Session API] Firebase Admin app not initialized');
      console.error('[Create Session API] Environment check:', {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
      });
      return NextResponse.json(
        { success: false, error: 'Database service is temporarily unavailable. Please contact support.' },
        { status: 500 }
      );
    }

    // Check if database is available
    const db = adminDb();
    if (!db) {
      console.error('[Create Session API] Firebase Admin database not initialized');
      console.error('[Create Session API] App exists but database is null');
      return NextResponse.json(
        { success: false, error: 'Database service is temporarily unavailable. Please contact support.' },
        { status: 500 }
      );
    }

    console.log('[Create Session API] Database initialized, validating user session...');

    // Validate user has vendor profile
    const sessionResult = await validateUserForSession(uid);
    if (!sessionResult.success) {
      console.error('[Create Session API] User validation failed:', sessionResult.error, 'UID:', uid);
      // Return 401 for authentication failures, 500 for server errors
      const statusCode = sessionResult.error?.includes('not yet available') ? 403 : 500;
      return NextResponse.json(
        { success: false, error: sessionResult.error || 'User validation failed' },
        { status: statusCode }
      );
    }

    console.log('[Create Session API] User validation successful, creating session cookie...');

    // Create session cookie
    const cookieStore = await cookies();
    cookieStore.set('thru_vendor_auth_token', uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Create Session API] Unexpected error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name
    });
    
    // Provide more specific error message based on error type
    let errorMessage = 'Failed to create session. Please try again.';
    if (error?.message?.includes('Firebase')) {
      errorMessage = 'Firebase service error. Please check server logs.';
    } else if (error?.message?.includes('Database') || error?.message?.includes('Firestore')) {
      errorMessage = 'Database connection error. Please ensure Firebase Admin is properly configured.';
    } else if (error?.message) {
      errorMessage = `Server error: ${error.message}`;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

