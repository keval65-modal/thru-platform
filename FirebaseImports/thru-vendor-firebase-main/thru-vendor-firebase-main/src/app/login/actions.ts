
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { signInVendor, getVendorProfile, getSupabaseDbClient } from '@/lib/supabase-auth';
import { validateUserForSession } from '@/lib/auth';
import { merchantHasSignedAgreement } from '@/lib/incomplete-registration';

const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, { message: 'Email or phone number is required.' }),
  password: z.string().trim().min(1, { message: 'Password is required.' }),
});

export type LoginFormState = {
  success: boolean;
  error?: string;
  fields?: Record<string, string[]>;
  isAdmin?: boolean;
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

export async function handleLogin(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validatedFields = loginFormSchema.safeParse(formDataToObject(formData));

  if (!validatedFields.success) {
    return { 
      success: false, 
      error: "Invalid login details.",
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { identifier, password } = validatedFields.data;

  try {
    const { success, user, error, session } = await signInVendor(identifier, password);

    if (!success || !user) {
      console.error('[Login Action] Supabase sign-in failed:', error);
      return { success: false, error: error || 'Invalid email/phone or password.' };
    }

    const sessionValidation = await validateUserForSession(user.id);
    if (!sessionValidation.success) {
      console.error('[Login Action] Session validation failed:', sessionValidation.error);
      return { success: false, error: sessionValidation.error || 'Account not set up yet. Please contact support.' };
    }

    const { success: profileSuccess, vendor, error: profileError } = await getVendorProfile(user.id);
    if (!profileSuccess || !vendor) {
      console.error('[Login Action] Vendor profile missing:', profileError);
      return {
        success: false,
        error:
          'Registration was not completed. Please sign up again with the same phone number to finish setup.',
      };
    }

    const db = getSupabaseDbClient();
    const signed = await merchantHasSignedAgreement(db, user.id);
    if (!signed) {
      return {
        success: false,
        error:
          'You have not signed the merchant agreement yet. Please sign up again to continue, or use Cancel on the agreement page if you want to start over.',
      };
    }

    const cookieStore = cookies();
    cookieStore.set('thru_vendor_auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      path: '/',
    });

    let supabaseSession: LoginFormState['supabaseSession'];
    if (session?.access_token && session?.refresh_token) {
      supabaseSession = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
      };
    } else {
      console.warn('[Login Action] Supabase session tokens missing in sign-in response.');
    }
    
    // Return admin status - client will handle redirect
    const isAdmin = vendor.role === 'admin';
    
    return { success: true, isAdmin, supabaseSession };

  } catch (error: any) {
    console.error('[Login Action] Unexpected error:', error);
    return { success: false, error: error?.message || 'Unable to login. Please try again.' };
  }
}
