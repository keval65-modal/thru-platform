import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables (without exposing sensitive data)
    // Check both naming conventions
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    
    const envCheck = {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      projectId: projectId ? `${projectId.trim().substring(0, 10)}...` : 'missing',
      projectIdLength: projectId ? projectId.length : 0,
      projectIdHasWhitespace: projectId ? /\s/.test(projectId) : false,
      usingAdminPrefix: !!process.env.FIREBASE_ADMIN_PROJECT_ID
    };

    // Try to initialize Firebase Admin
    const app = getAdminApp();
    const appStatus = app ? 'initialized' : 'failed to initialize';

    // Try to get Firestore instance
    const db = adminDb();
    const dbStatus = db ? 'initialized' : 'failed to initialize';

    // Try a simple query if db is available
    let testQueryStatus = 'not attempted';
    if (db) {
      try {
        const testQuery = await db.collection('vendors').limit(1).get();
        testQueryStatus = `success - found ${testQuery.size} documents`;
      } catch (queryError: any) {
        testQueryStatus = `failed: ${queryError.message}`;
      }
    }

    return NextResponse.json({
      success: true,
      env: envCheck,
      app: appStatus,
      db: dbStatus,
      testQuery: testQueryStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

