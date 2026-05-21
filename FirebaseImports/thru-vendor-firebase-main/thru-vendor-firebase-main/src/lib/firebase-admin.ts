import { getApps, cert, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  // Check both naming conventions: FIREBASE_ADMIN_* and FIREBASE_*
  const projectId = (process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)?.trim();
  const clientEmail = (process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL)?.trim();
  let privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY);

  console.log('🔍 Firebase Admin initialization attempt...');
  console.log('Project ID:', projectId ? `${projectId.substring(0, 10)}...` : 'MISSING');
  console.log('Client Email:', clientEmail ? `${clientEmail.substring(0, 20)}...` : 'MISSING');
  console.log('Private Key:', privateKey ? `${privateKey.substring(0, 30)}...` : 'MISSING');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ CRITICAL: Firebase Admin credentials not available!', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      envVars: Object.keys(process.env).filter(k => k.includes('FIREBASE'))
    });
    return null;
  }

  // Trim private key and normalize whitespace
  if (privateKey) {
    privateKey = privateKey.trim();
    // Normalize private key for both multiline and \n-escaped formats
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    // Remove accidental surrounding quotes
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    // Remove carriage returns that might cause issues
    privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  try {
    // Validate private key format before initialization
    if (!privateKey.startsWith('-----BEGIN')) {
      console.warn('Firebase Admin private key may be incorrectly formatted (missing BEGIN marker)');
    }

    // Get storage bucket name from environment variables
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
    console.log('🪣 Storage bucket configured:', storageBucket);

    const config = {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId: projectId,
      storageBucket: storageBucket, // ✅ FIXED: Added storage bucket configuration
    };

    console.log('🔧 Firebase Admin config prepared:', {
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      hasCredential: !!config.credential
    });

    adminApp = initializeApp(config, `thru-vendor-${projectId}`); // Explicit app name to avoid conflicts
    
    console.log('✅ Firebase Admin initialized successfully for project:', projectId);
    console.log('✅ App name:', adminApp.name);
    return adminApp;
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin:', {
      error: error?.message,
      code: error?.code,
      projectId: projectId ? projectId.substring(0, 6) + '...' : 'missing',
      clientEmailPrefix: clientEmail ? clientEmail.substring(0, 6) + '...' : 'missing',
      privateKeyLength: privateKey ? privateKey.length : 0,
      privateKeyStartsWith: privateKey ? privateKey.substring(0, 20) : 'N/A'
    });
    return null;
  }
}

export const adminAuth = () => {
  const app = getAdminApp();
  if (!app) {
    console.error('❌ adminAuth: Cannot get Auth - Firebase Admin app not initialized');
    return null;
  }
  
  try {
    const auth = getAuth(app);
    console.log('✅ Auth instance created successfully');
    return auth;
  } catch (error: any) {
    console.error('❌ adminAuth: Failed to get Auth instance:', {
      error: error?.message,
      code: error?.code
    });
    return null;
  }
};

export const adminDb = () => {
  const app = getAdminApp();
  if (!app) {
    console.warn('Cannot get Firestore: Firebase Admin app not initialized');
    return null;
  }
  
  try {
    const db = getFirestore(app);
    console.log('✅ Firestore instance created successfully');
    return db;
  } catch (error: any) {
    console.error('❌ Failed to get Firestore instance:', {
      error: error?.message,
      code: error?.code
    });
    return null;
  }
};

export const adminStorage = () => {
  const app = getAdminApp();
  if (!app) {
    console.error('❌ adminStorage: Cannot get Storage - Firebase Admin app not initialized');
    return null;
  }
  
  try {
    const storage = getStorage(app);
    console.log('✅ Storage instance created successfully');
    return storage;
  } catch (error: any) {
    console.error('❌ adminStorage: Failed to get Storage instance:', {
      error: error?.message,
      code: error?.code
    });
    return null;
  }
};

// Legacy exports for backward compatibility - REMOVED
// These were causing issues because they evaluate at module load time,
// before environment variables are available in serverless environments.
// Use adminDb(), adminAuth(), adminStorage() getter functions instead.
