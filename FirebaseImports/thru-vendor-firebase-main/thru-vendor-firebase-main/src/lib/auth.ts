
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSupabaseDbClient } from '@/lib/supabase-auth';
import type { SessionData } from '@/types/session';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';

function titleCase(value?: string | null) {
  if (!value) return 'Other';
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Other';
}

function splitPhoneNumber(fullPhone?: string | null) {
  if (!fullPhone) return { phoneCountryCode: null, phoneNumber: null, fullPhoneNumber: null };
  const digits = fullPhone.replace(/\s+/g, '');
  if (!digits.startsWith('+')) {
    return {
      phoneCountryCode: null,
      phoneNumber: digits,
      fullPhoneNumber: digits,
    };
  }
  const countryCodeMatch = digits.match(/^\+\d{1,4}/);
  const phoneCountryCode = countryCodeMatch ? countryCodeMatch[0] : null;
  const phoneNumber = phoneCountryCode ? digits.slice(phoneCountryCode.length) : digits;
  return { phoneCountryCode, phoneNumber, fullPhoneNumber: digits };
}

function extractCoordinates(rawLocation: any) {
  let location = rawLocation;

  if (typeof location === 'string') {
    try {
      location = JSON.parse(location);
    } catch {
      location = null;
    }
  }

  if (!location) return { latitude: null, longitude: null };

  if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    const [lng, lat] = location.coordinates;
    return {
      latitude: typeof lat === 'number' ? lat : null,
      longitude: typeof lng === 'number' ? lng : null,
    };
  }

  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return { latitude: location.lat, longitude: location.lng };
  }

  return { latitude: null, longitude: null };
}

function mapVendorRowToSession(row: any): SessionData {
  const { phoneCountryCode, phoneNumber, fullPhoneNumber } = splitPhoneNumber(row?.phone);
  const { latitude, longitude } = extractCoordinates(row?.location);

  return {
    isAuthenticated: true,
    id: row.id,
    uid: row.id,
    role: row.role || 'vendor', // Use role from database, default to 'vendor'
    email: row.email,
    shopName: row.name,
    ownerName: row.owner_name,
    storeCategory: titleCase(row.store_type),
    shopImageUrl: row.image_url,
    phoneCountryCode,
    phoneNumber,
    fullPhoneNumber,
    city: row.city,
    weeklyCloseOn: row.weekly_close_on,
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    shopFullAddress: row.address,
    latitude,
    longitude,
    isActiveOnThru: row.is_active_on_thru,
    type: titleCase(row.store_type),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function validateUserForSession(uid: string): Promise<{ success: boolean; error?: string }> {
  if (!uid) {
    return { success: false, error: 'User ID is required to validate a session.' };
  }

  try {
    const supabase = getSupabaseDbClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', uid)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[validateUserForSession] Supabase error:', error);
      return { success: false, error: 'Unable to verify vendor profile. Please try again.' };
    }

    if (!data) {
      console.error('[validateUserForSession] Vendor not found for UID:', uid);
      return { success: false, error: 'Vendor profile not found. Please contact support.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[validateUserForSession] Unexpected error:', error);
    return { success: false, error: 'Unexpected server error while verifying account.' };
  }
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

export async function getSession(): Promise<SessionData> {
  const cookieValue = cookies().get(AUTH_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return { isAuthenticated: false };
  }

  try {
    const supabase = getSupabaseDbClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', cookieValue)
      .maybeSingle();

    if (error) {
      console.error('[getSession] Supabase error:', error);
      cookies().delete(AUTH_COOKIE_NAME);
      return { isAuthenticated: false };
    }

    if (!data) {
      console.warn('[getSession] Vendor not found for cookie UID:', cookieValue);
      cookies().delete(AUTH_COOKIE_NAME);
      return { isAuthenticated: false };
    }

    return mapVendorRowToSession(data);
  } catch (error) {
    console.error('[getSession] Unexpected error:', error);
    cookies().delete(AUTH_COOKIE_NAME);
    return { isAuthenticated: false };
  }
}
