
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { validateUserForSession } from '@/lib/auth';
import { signInVendor, getVendorProfile } from '@/lib/supabase-auth';
import { cookies } from 'next/headers';

const adminLoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export type AdminLoginFormState = {
  success?: boolean;
  error?: string;
  fields?: Record<string, string[]>;
};

// Admin login with email and password
export async function handleAdminLogin(
  prevState: AdminLoginFormState,
  formData: FormData
): Promise<AdminLoginFormState> {
  const formDataObj = Object.fromEntries(formData.entries());
  const validatedFields = adminLoginSchema.safeParse(formDataObj);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid login details.',
      fields: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  try {
    // Sign in via Supabase
    const { success, user, error, session } = await signInVendor(email, password);

    if (!success || !user) {
      console.error('[Admin Login] Supabase sign-in failed:', error);
      return { success: false, error: error || 'Invalid email or password.' };
    }

    // Validate session
    const sessionValidation = await validateUserForSession(user.id);
    if (!sessionValidation.success) {
      console.error('[Admin Login] Session validation failed:', sessionValidation.error);
      return { success: false, error: sessionValidation.error || 'Account not set up yet. Please contact support.' };
    }

    // Get vendor profile to check if user is admin
    const { success: profileSuccess, vendor, error: profileError } = await getVendorProfile(user.id);
    if (!profileSuccess || !vendor) {
      console.error('[Admin Login] Vendor profile missing:', profileError);
      return { success: false, error: profileError || 'Vendor profile not found. Please complete signup.' };
    }

    // Check if user has admin role
    if (vendor.role !== 'admin') {
      console.error('[Admin Login] User does not have admin role:', user.id);
      return { success: false, error: 'Access denied. Admin privileges required.' };
    }

    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set('thru_vendor_auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'lax',
      path: '/',
    });

    console.log('[Admin Login] Admin login successful:', user.id);
  } catch (err) {
    console.error('[Admin Login] Exception during login process:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }

  // Redirect to admin panel
  redirect('/admin');
}
