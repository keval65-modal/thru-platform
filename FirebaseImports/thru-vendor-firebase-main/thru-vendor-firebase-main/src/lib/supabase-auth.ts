/**
 * Supabase Authentication for Vendor App
 * 
 * This replaces Firebase Auth with Supabase Auth
 * 
 * Note: Individual functions marked with 'use server' instead of file-level
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PHONE_COUNTRY_CODE = process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY_CODE || '+91';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'MISSING');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'MISSING');
}

console.log('[Supabase Auth] Service role key detected:', Boolean(supabaseServiceRoleKey));

function looksLikeEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim().toLowerCase());
}

function sanitizeDigits(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function normalizePhoneInput(rawInput: string): string | null {
  if (!rawInput) return null;
  let value = rawInput.trim();

  if (!value) return null;

  if (value.startsWith('00')) {
    value = `+${value.slice(2)}`;
  }

  if (value.startsWith('+')) {
    const digits = sanitizeDigits(value);
    return digits ? `+${digits}` : null;
  }

  const digits = sanitizeDigits(value);
  if (!digits) return null;

  if (digits.length === 10) {
    return `${DEFAULT_PHONE_COUNTRY_CODE}${digits}`;
  }

  return `+${digits}`;
}

const supabaseAnonServerClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

const supabaseServiceServerClient =
  supabaseServiceRoleKey !== undefined && supabaseServiceRoleKey !== ''
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'thru-vendor-service',
          },
        },
      })
    : null;

// Server-side Supabase client with cookie handling (anon key)
export function createServerSupabaseClient() {
  return supabaseAnonServerClient;
}

export function getSupabaseDbClient() {
  return supabaseServiceServerClient ?? supabaseAnonServerClient;
}

/** Service-role client for server-only writes (WhatsApp log, admin). Returns null if not configured. */
export function getSupabaseServiceDbClient() {
  return supabaseServiceServerClient;
}

export function isSupabaseServiceRoleConfigured(): boolean {
  return Boolean(supabaseServiceServerClient);
}

export async function linkSupabaseUserPhone(
  userId: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseServiceServerClient) {
    console.warn('[Supabase Auth] Service role key missing - cannot link phone number');
    return { success: false, error: 'Service role key missing' };
  }

  try {
    const { data, error } = await supabaseServiceServerClient.auth.admin.updateUserById(userId, {
      phone: phoneNumber,
      phone_confirm: true,
    });

    if (error) {
      console.error('❌ Error linking phone to Supabase auth user:', error.message);
      return { success: false, error: error.message };
    }

    console.log('🔗 Phone linked to Supabase auth user:', data?.user?.id ?? userId);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected error linking phone:', error);
    return { success: false, error: error?.message || 'Unknown error linking phone' };
  }
}

// Get authenticated user from Supabase
export async function getSupabaseUser() {
  const supabase = getSupabaseDbClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('[Supabase Auth] Error getting user:', error.message);
    return null;
  }
  
  return user;
}

// Sign up new vendor
export async function signUpVendor(
  email: string | null,
  password: string,
  phoneNumber?: string
) {
  if (!email && !phoneNumber) {
    console.error('❌ signUpVendor called without email or phone');
    return {
      success: false,
      error: 'Email or phone number is required to create an account.',
      user: null,
      phoneLinked: false,
    };
  }
  // Prefer service role to create fully verified user in one step
  if (supabaseServiceServerClient) {
    const identifierForLog = email || phoneNumber || 'unknown';
    console.log('📧 Creating Supabase Auth user via service client:', identifierForLog);

    const createPayload: Parameters<
      typeof supabaseServiceServerClient.auth.admin.createUser
    >[0] = {
      password,
      ...(email
        ? {
            email,
            email_confirm: true,
          }
        : {}),
      ...(phoneNumber
        ? {
            phone: phoneNumber,
            phone_confirm: true,
          }
        : {}),
    };

    const { data, error } = await supabaseServiceServerClient.auth.admin.createUser(
      createPayload
    );

    if (error) {
      console.error('❌ Supabase admin createUser error:', error.message);
      console.error('Error code:', error.status);
      console.error('Full error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message, user: null, phoneLinked: false };
    }

    console.log('✅ Supabase Auth user created (admin):', data.user?.id);
    return {
      success: true,
      user: data.user,
      error: null,
      phoneLinked: Boolean(data.user?.phone),
    };
  }

  const supabase = createServerSupabaseClient();
  const identifierForLog = email || phoneNumber || 'unknown';
  console.log('📧 Creating Supabase Auth user (anon client):', identifierForLog);

  let data, error;

  if (email) {
    ({ data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/auth/callback`,
      },
    }));
  } else if (phoneNumber) {
    ({ data, error } = await supabase.auth.signUp({
      phone: phoneNumber,
      password,
    } as any));
  } else {
    return {
      success: false,
      error: 'Email or phone number is required to create an account.',
      user: null,
      phoneLinked: false,
    };
  }

  if (error) {
    console.error('❌ Supabase signup error:', error.message);
    return { success: false, error: error.message, user: null, phoneLinked: false };
  }

  console.log('✅ Supabase Auth user created (anon):', data.user?.id);
  return { success: true, user: data.user, error: null, phoneLinked: Boolean(data.user?.phone) };
}

// Workaround for phone password login when Phone provider is not enabled
async function signInVendorByPhoneWorkaround(
  phone: string,
  password: string
): Promise<{ success: boolean; user: any; session: any; error: string | null }> {
  if (!supabaseServiceServerClient) {
    return {
      success: false,
      error: 'Service role key missing. Cannot perform phone login workaround.',
      user: null,
      session: null,
    };
  }

  try {
    console.log('🔍 Looking up user by phone number:', phone);
    
    // List all users and find by phone
    const { data: usersData, error: listError } = await supabaseServiceServerClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return {
        success: false,
        error: 'Unable to find user. Please ensure you have registered.',
        user: null,
        session: null,
      };
    }

    const normalizedPhone = phone.replace(/[\s-]/g, '');
    const user = usersData.users.find(u => {
      if (!u.phone) return false;
      const userPhone = u.phone.replace(/[\s-]/g, '');
      // Match exact, or try variations
      return userPhone === normalizedPhone || 
             userPhone === normalizedPhone.replace(/^\+/, '') ||
             `+${userPhone}` === normalizedPhone ||
             userPhone.replace(/^91/, '+91') === normalizedPhone;
    });

    if (!user) {
      console.error('❌ User not found for phone:', normalizedPhone);
      return {
        success: false,
        error: 'No account found for this phone number. Please sign up first.',
        user: null,
        session: null,
      };
    }

    console.log('✅ User found:', user.id);

    // Try to verify password by attempting sign in with email (if user has email)
    if (user.email) {
      console.log('🔐 Attempting password verification via email...');
      const { createClient } = await import('@supabase/supabase-js');
      const tempSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: signInData, error: signInError } = await tempSupabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        console.error('❌ Password verification failed:', signInError.message);
        return {
          success: false,
          error: 'Invalid password. Please try again.',
          user: null,
          session: null,
        };
      }

      console.log('✅ Password verified, user signed in via email workaround');
      return {
        success: true,
        user: signInData.user,
        session: signInData.session,
        error: null,
      };
    } else {
      // User has no email - we can't verify password directly
      // In this case, we should use OTP login instead
      return {
        success: false,
        error: 'Password login not available for phone-only accounts. Please use OTP login instead.',
        user: null,
        session: null,
      };
    }
  } catch (error: any) {
    console.error('❌ Error in phone login workaround:', error);
    return {
      success: false,
      error: error.message || 'Unable to login. Please try OTP login or use your email address.',
      user: null,
      session: null,
    };
  }
}

// Sign in vendor
export async function signInVendor(identifier: string, password: string) {
  const supabase = createServerSupabaseClient();
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return { success: false, error: 'Please enter your email or phone number.', user: null, session: null };
  }

  let credentials:
    | { email: string; password: string }
    | { phone: string; password: string };

  if (looksLikeEmail(trimmedIdentifier)) {
    console.log('🔐 Signing in vendor via email');
    credentials = { email: trimmedIdentifier.toLowerCase(), password };
  } else {
    const normalizedPhone = normalizePhoneInput(trimmedIdentifier);
    if (!normalizedPhone) {
      console.warn('Invalid phone number provided for login:', trimmedIdentifier);
      return {
        success: false,
        error: 'Please enter a valid 10-digit phone number or email address.',
        user: null,
        session: null,
      };
    }
    console.log('🔐 Signing in vendor via phone:', normalizedPhone);
    credentials = { phone: normalizedPhone, password };
  }

  const { data, error } = await supabase.auth.signInWithPassword(credentials as any);
  
  if (error) {
    console.error('❌ Supabase signin error:', error.message);
    
    // If phone login fails with "disabled" error, use workaround to find user and verify password
    if ((error.message.includes('disabled') || error.message.includes('Phone logins')) && credentials.phone) {
      console.log('🔄 Phone provider not enabled, using workaround for phone login...');
      return await signInVendorByPhoneWorkaround(credentials.phone, password);
    }
    
    return { success: false, error: error.message, user: null, session: null };
  }
  
  console.log('✅ Vendor signed in:', data.user?.id);
  
  return { success: true, user: data.user, session: data.session, error: null };
}

// Sign out vendor
export async function signOutVendor() {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('❌ Supabase signout error:', error.message);
    return { success: false, error: error.message };
  }
  
  // Clear cookies
  const cookieStore = cookies();
  cookieStore.delete('thru_vendor_auth_token');
  
  return { success: true, error: null };
}

// Check if vendor profile exists
export async function getVendorProfile(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return { success: false, error: 'Vendor profile not found', vendor: null };
    }
    console.error('❌ Error fetching vendor profile:', error.message);
    return { success: false, error: error.message, vendor: null };
  }
  
  return { success: true, vendor: data, error: null };
}

// Create vendor profile
export async function createVendorProfile(vendorData: any) {
  const usingServiceRole = Boolean(supabaseServiceServerClient);
  console.log('🛡️ Vendor profile insert client:', usingServiceRole ? 'service-role' : 'anon');
  const supabase = getSupabaseDbClient();
  
  console.log('💾 Creating vendor profile in Supabase:', vendorData.name);
  
  // Idempotent: upsert by primary key `id` so double-submit/retry does not fail.
  const { data, error } = await supabase
    .from('vendors')
    .upsert([vendorData], { onConflict: 'id' })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating vendor profile:', error.message);
    return { success: false, error: error.message, vendor: null };
  }
  
  console.log('✅ Vendor profile created:', data.id);
  
  return { success: true, vendor: data, error: null };
}

/** Supabase Storage bucket for shop images (signup + profile). */
export const VENDOR_IMAGES_BUCKET = 'vendor-images';

// Upload image to Supabase Storage
export async function uploadVendorImage(
  vendorId: string,
  imageFile: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = getSupabaseDbClient();
  
  try {
    const fileExt = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `${vendorId}/shop_image.${fileExt}`;
    const filePath = `vendor_shop_images/${fileName}`;
    
    console.log('📸 Uploading image to Supabase Storage:', {
      bucket: VENDOR_IMAGES_BUCKET,
      filePath,
    });
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(VENDOR_IMAGES_BUCKET)
      .upload(filePath, buffer, {
        contentType: imageFile.type || 'image/jpeg',
        upsert: true,
      });
    
    if (error) {
      const hint =
        error.message?.toLowerCase().includes('bucket') ||
        error.message?.toLowerCase().includes('not found')
          ? ` Run src/lib/supabase/vendor-images-schema.sql in the Supabase SQL editor (bucket "${VENDOR_IMAGES_BUCKET}").`
          : '';
      console.error('❌ Error uploading image:', error.message);
      return { success: false, error: error.message + hint };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(VENDOR_IMAGES_BUCKET)
      .getPublicUrl(filePath);
    
    console.log('✅ Image uploaded successfully:', publicUrl);
    
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('❌ Unexpected error uploading image:', error);
    return { success: false, error: error.message };
  }
}

