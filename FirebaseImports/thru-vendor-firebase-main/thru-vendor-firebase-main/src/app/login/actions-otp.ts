'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { signInVendor, getVendorProfile } from '@/lib/supabase-auth';
import { validateUserForSession } from '@/lib/auth';

const otpLoginSchema = z.object({
  identifier: z.string().trim().min(1, { message: 'Phone number is required.' }),
  firebaseIdToken: z.string().min(10, { message: 'OTP verification token missing.' }),
});

export type OTPLoginFormState = {
  success: boolean;
  error?: string;
  fields?: Record<string, string[]>;
  supabaseSession?: {
    access_token: string;
    refresh_token: string;
    expires_in?: number | null;
    expires_at?: number | null;
  };
};

function formDataToObject(formData: FormData): Record<string, any> {
  return Object.fromEntries((formData as any).entries());
}

export async function handleOTPLogin(
  formData: FormData
): Promise<OTPLoginFormState> {
  const validatedFields = otpLoginSchema.safeParse(formDataToObject(formData));

  if (!validatedFields.success) {
    return { 
      success: false, 
      error: "Invalid login details.",
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { identifier, firebaseIdToken } = validatedFields.data;

  try {
    // Verify Firebase OTP token
    console.log('\n📱 Verifying Firebase OTP token...');
    const adminAuthInstance = adminAuth();
    if (!adminAuthInstance) {
      console.error('❌ Firebase Admin not initialized - cannot verify OTP token');
      return { success: false, error: 'Server configuration error: unable to verify OTP. Please try again shortly.' };
    }

    let verifiedPhoneNumber = '';
    try {
      const decoded = await adminAuthInstance.verifyIdToken(firebaseIdToken);
      verifiedPhoneNumber = decoded.phone_number ?? '';
      console.log('✅ Firebase OTP token verified for phone:', verifiedPhoneNumber);
    } catch (error: any) {
      console.error('❌ Failed to verify Firebase OTP token:', error?.message || error);
      return { success: false, error: 'OTP verification failed. Please request a new OTP and try again.' };
    }

    // Normalize the submitted phone number
    const normalizePhone = (value: string) => {
      if (!value) return null;
      // Remove all non-digits first
      const digits = value.replace(/[^0-9]/g, '');
      if (digits.length === 10) {
        return `+91${digits}`;
      }
      if (value.startsWith('+')) {
        return value.replace(/[\s-]/g, '');
      }
      // If it's already 12 digits (with country code), add +
      if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits}`;
      }
      return null;
    };

    const submittedPhone = normalizePhone(identifier);
    const normalizedVerified = verifiedPhoneNumber.replace(/[\s-]/g, '');

    if (!submittedPhone) {
      console.error('❌ Could not normalize submitted phone:', identifier);
      return { success: false, error: 'Invalid phone number format. Please enter a 10-digit number.' };
    }

    const normalizedSubmittedPhone = submittedPhone.replace(/[\s-]/g, '');
    if (normalizedVerified !== normalizedSubmittedPhone) {
      console.error('❌ Phone mismatch:', { submittedPhone, normalizedSubmittedPhone, normalizedVerified });
      return { success: false, error: 'Verified phone number does not match. Please try again.' };
    }

    // Find user by phone number in Supabase
    // Since Supabase doesn't support passwordless phone login directly,
    // we need to find the user and create a session
    console.log('🔐 Looking up user by phone number...');
    
    // Use Supabase admin to find user by phone
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'Server configuration error.' };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Find user by phone in auth.users
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      return { success: false, error: 'Unable to find user. Please ensure you have registered.' };
    }

    // Try multiple phone format variations for matching
    const user = users.users.find(u => {
      if (!u.phone) return false;
      const userPhone = u.phone.replace(/[\s-]/g, '');
      // Match exact, or try without leading +
      return userPhone === normalizedVerified || 
             userPhone === normalizedVerified.replace(/^\+/, '') ||
             `+${userPhone}` === normalizedVerified ||
             userPhone.replace(/^91/, '+91') === normalizedVerified;
    });

    if (!user) {
      console.error('❌ User not found for phone:', normalizedVerified);
      console.log('Available phone numbers in database:', users.users.map(u => u.phone).filter(Boolean));
      return { success: false, error: 'No account found for this phone number. Please sign up first.' };
    }

    console.log('✅ User found:', user.id);

    // Validate user and set session cookie
    const sessionResult = await validateUserForSession(user.id);
    if (!sessionResult.success) {
      console.error('[OTP Login] Session validation failed:', sessionResult.error);
      return { success: false, error: sessionResult.error || 'Account not set up yet. Please contact support.' };
    }

    const { success: profileSuccess, vendor, error: profileError } = await getVendorProfile(user.id);
    if (!profileSuccess || !vendor) {
      console.error('[OTP Login] Vendor profile missing:', profileError);
      return { success: false, error: profileError || 'Vendor profile not found. Please complete signup.' };
    }

    // Create a session using admin API
    // We'll create a custom session token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email || `phone_${user.phone?.replace(/[^0-9]/g, '')}@thru.local`,
    });

    const cookieStore = cookies();
    cookieStore.set('thru_vendor_auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      path: '/',
    });

    console.log('✅ OTP login successful for user:', user.id);
    
    // Return success - the cookie is set, which is what we use for auth
    return { 
      success: true,
    };

  } catch (error: any) {
    console.error('[OTP Login] Unexpected error:', error);
    return { success: false, error: error?.message || 'Unable to login. Please try again.' };
  }
}
