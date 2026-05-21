/**
 * Firebase OTP Service - ONLY for Phone Number Verification
 * 
 * This is the ONLY Firebase functionality we use.
 * All data storage is in Supabase.
 */

'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  signOut,
  type Auth,
  type ConfirmationResult
} from 'firebase/auth';

// Firebase config - ONLY for OTP
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;

// Initialize Firebase (client-side only, for OTP)
export function initializeFirebaseOTP() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('✅ Firebase initialized for OTP service');
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
  return { app, auth };
}

// Setup reCAPTCHA for phone verification
export function setupRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
  const { auth } = initializeFirebaseOTP();
  
  const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('✅ reCAPTCHA verified');
    },
    'expired-callback': () => {
      console.log('⚠️ reCAPTCHA expired');
    }
  });

  return recaptchaVerifier;
}

// Send OTP to phone number
export async function sendOTP(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }> {
  try {
    const { auth } = initializeFirebaseOTP();
    
    console.log('📱 Sending OTP to:', phoneNumber);
    
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );
    
    console.log('✅ OTP sent successfully');
    
    return { success: true, confirmationResult };
  } catch (error: any) {
    console.error('❌ Error sending OTP:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    let errorMessage = 'Failed to send OTP. Please try again.';
    
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format. Please use international format (e.g., +919876543210)';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMessage = 'SMS quota exceeded. Please upgrade to Blaze plan or contact support.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'reCAPTCHA verification failed. Please refresh the page and try again.';
    } else if (error.code === 'auth/missing-phone-number') {
      errorMessage = 'Phone number is required. Please enter a valid phone number.';
    } else if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid verification code format.';
    } else if (error.code === 'auth/session-expired') {
      errorMessage = 'Session expired. Please request a new OTP.';
    } else if (error.message) {
      // Check for common error patterns
      if (error.message.includes('400')) {
        errorMessage = 'Firebase configuration error (400). Please check: 1) Firebase is on Blaze plan, 2) Phone auth is enabled, 3) API key has correct permissions. See FIREBASE_OTP_TROUBLESHOOTING.md for details.';
      } else if (error.message.includes('quota') || error.message.includes('Quota')) {
        errorMessage = 'SMS quota exceeded. Please upgrade to Blaze plan in Firebase Console.';
      } else if (error.message.includes('reCAPTCHA') || error.message.includes('captcha')) {
        errorMessage = 'reCAPTCHA verification failed. Please try again or check Firebase Console settings.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

// Verify OTP code
export async function verifyOTP(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<{ success: boolean; idToken?: string; phoneNumber?: string; error?: string }> {
  try {
    console.log('🔐 Verifying OTP code:', code);
    
    const userCredential = await confirmationResult.confirm(code);
    const firebaseUser = userCredential.user;
    const idToken = await firebaseUser.getIdToken();
    const phoneNumber = firebaseUser.phoneNumber ?? undefined;

    try {
      await firebaseUser.delete();
    } catch (deleteError) {
      console.warn('⚠️ Unable to delete temporary Firebase user:', deleteError);
      try {
        const { auth } = initializeFirebaseOTP();
        await signOut(auth);
      } catch (signOutError) {
        console.warn('⚠️ Unable to sign out Firebase OTP session:', signOutError);
      }
    }
    
    console.log('✅ OTP verified successfully');
    
    return { success: true, idToken, phoneNumber };
  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error);
    
    let errorMessage = 'Invalid OTP code. Please try again.';
    
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid verification code. Please check and try again.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'Verification code has expired. Please request a new one.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

// Cleanup function
export function cleanupRecaptcha(recaptchaVerifier: RecaptchaVerifier) {
  try {
    recaptchaVerifier.clear();
  } catch (error) {
    console.warn('Warning: Could not clear reCAPTCHA:', error);
  }
}



