import { createServiceSupabaseClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

export type CustomerProfile = {
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  gender?: string;
  city?: string;
  vehicles?: CustomerVehicle[];
  vehicleNumbers?: string[];
};

export type CustomerVehicle = {
  number: string;
  make?: string;
  model?: string;
};

export type StoredCustomerProfile = CustomerProfile & {
  firebaseUid: string;
  hashedPassword?: string;
};

type UserProfileRow = {
  id: string;
  firebase_uid: string;
  phone: string | null;
  name: string | null;
  email: string | null;
  preferences: Json;
};

type CustomerPreferences = {
  hashedPassword?: string;
  displayName?: string;
  profileData?: CustomerProfile;
  [key: string]: unknown;
};

function parsePreferences(raw: Json | null | undefined): CustomerPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as CustomerPreferences;
}

function normalizeVehicle(vehicle: CustomerVehicle): CustomerVehicle | null {
  const number = vehicle.number.trim().toUpperCase();
  if (!number) return null;
  return {
    number,
    make: vehicle.make?.trim() || undefined,
    model: vehicle.model?.trim() || undefined,
  };
}

function normalizeVehicles(profile: CustomerProfile): CustomerVehicle[] {
  const fromVehicles = profile.vehicles ?? [];
  const fromLegacyNumbers = profile.vehicleNumbers?.map((number) => ({ number })) ?? [];
  const seen = new Set<string>();

  return [...fromVehicles, ...fromLegacyNumbers].reduce<CustomerVehicle[]>((vehicles, vehicle) => {
    const normalized = normalizeVehicle(vehicle);
    if (!normalized || seen.has(normalized.number)) return vehicles;
    seen.add(normalized.number);
    vehicles.push(normalized);
    return vehicles;
  }, []);
}

function compactProfile(profile: CustomerProfile): CustomerProfile {
  const vehicles = normalizeVehicles(profile);

  return {
    name: profile.name.trim(),
    phoneNumber: profile.phoneNumber.trim(),
    email: profile.email?.trim() || undefined,
    address: profile.address?.trim() || undefined,
    gender: profile.gender?.trim() || undefined,
    city: profile.city?.trim() || undefined,
    vehicles,
    vehicleNumbers: vehicles.map((vehicle) => vehicle.number),
  };
}

function mapRow(row: UserProfileRow): StoredCustomerProfile {
  const preferences = parsePreferences(row.preferences);
  const profileData = preferences.profileData;
  const vehicles = normalizeVehicles(profileData ?? {
    name: row.name ?? '',
    phoneNumber: row.phone ?? '',
    vehicleNumbers: [],
  });

  return {
    firebaseUid: row.firebase_uid,
    name: profileData?.name ?? row.name ?? '',
    phoneNumber: profileData?.phoneNumber ?? row.phone ?? '',
    email: profileData?.email ?? row.email ?? undefined,
    address: profileData?.address,
    gender: profileData?.gender,
    city: profileData?.city,
    vehicles,
    vehicleNumbers: vehicles.map((vehicle) => vehicle.number),
    hashedPassword: preferences.hashedPassword,
  };
}

export async function getUserProfile(input: {
  firebaseUid?: string;
  phone?: string | null;
}): Promise<StoredCustomerProfile | null> {
  const supabase = createServiceSupabaseClient();
  let query = supabase
    .from('user_profiles')
    .select('id, firebase_uid, phone, name, email, preferences');

  if (input.firebaseUid) {
    query = query.eq('firebase_uid', input.firebaseUid);
  } else if (input.phone) {
    query = query.eq('phone', input.phone);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as UserProfileRow) : null;
}

export async function upsertUserProfile(input: {
  firebaseUid: string;
  profile: CustomerProfile;
  hashedPassword?: string;
}): Promise<StoredCustomerProfile> {
  const supabase = createServiceSupabaseClient();
  const profile = compactProfile(input.profile);
  const now = new Date().toISOString();

  const { data: existingByUid, error: uidError } = await supabase
    .from('user_profiles')
    .select('id, preferences')
    .eq('firebase_uid', input.firebaseUid)
    .maybeSingle();
  if (uidError) throw new Error(uidError.message);

  const { data: existingByPhone, error: phoneError } = existingByUid
    ? { data: null, error: null }
    : await supabase
        .from('user_profiles')
        .select('id, preferences')
        .eq('phone', profile.phoneNumber)
        .maybeSingle();
  if (phoneError) throw new Error(phoneError.message);

  const existing = existingByUid ?? existingByPhone;
  const preferences = {
    ...parsePreferences(existing?.preferences),
    ...(input.hashedPassword ? { hashedPassword: input.hashedPassword } : {}),
    displayName: `${profile.name},${profile.phoneNumber}`,
    profileData: profile,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        firebase_uid: input.firebaseUid,
        phone: profile.phoneNumber,
        name: profile.name,
        email: profile.email ?? null,
        preferences,
        updated_at: now,
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('user_profiles').insert({
      firebase_uid: input.firebaseUid,
      phone: profile.phoneNumber,
      name: profile.name,
      email: profile.email ?? null,
      preferences,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
  }

  const saved = await getUserProfile({ firebaseUid: input.firebaseUid });
  if (!saved) throw new Error('Profile was not saved');
  return saved;
}
