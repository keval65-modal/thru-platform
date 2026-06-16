import { randomUUID } from 'crypto';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import {
  savedDestinationDisplayLabel,
  type SavedDestination,
  type SavedDestinationLabelType,
  type DestinationTravelPattern,
} from '@/types/saved-destinations';

type SavedDestinationRow = {
  id: string;
  firebase_uid: string;
  label_type: SavedDestinationLabelType;
  custom_label: string | null;
  address: string;
  latitude: number;
  longitude: number;
  place_id: string | null;
  created_at: string;
  updated_at: string;
};

type TravelPatternRow = {
  id: string;
  firebase_uid: string;
  saved_destination_id: string | null;
  destination_label: string;
  destination_lat: number;
  destination_lng: number;
  departure_hour: number;
  departure_minute: number;
  day_of_week: number;
  is_immediate: boolean;
  occurrence_count: number;
  last_used_at: string;
};

type SavedDestinationsPreferences = {
  savedDestinations?: SavedDestinationRow[];
  travelPatterns?: TravelPatternRow[];
};

function mapSavedDestination(row: SavedDestinationRow): SavedDestination {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    labelType: row.label_type,
    customLabel: row.custom_label,
    displayLabel: savedDestinationDisplayLabel(row.label_type, row.custom_label),
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    placeId: row.place_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTravelPattern(row: TravelPatternRow): DestinationTravelPattern {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    savedDestinationId: row.saved_destination_id,
    destinationLabel: row.destination_label,
    destinationLat: row.destination_lat,
    destinationLng: row.destination_lng,
    departureHour: row.departure_hour,
    departureMinute: row.departure_minute,
    dayOfWeek: row.day_of_week,
    isImmediate: row.is_immediate,
    occurrenceCount: row.occurrence_count,
    lastUsedAt: row.last_used_at,
  };
}

function parsePreferences(raw: unknown): SavedDestinationsPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const prefs = raw as SavedDestinationsPreferences;
  return {
    savedDestinations: Array.isArray(prefs.savedDestinations) ? prefs.savedDestinations : [],
    travelPatterns: Array.isArray(prefs.travelPatterns) ? prefs.travelPatterns : [],
  };
}

async function loadUserPreferences(
  firebaseUid: string
): Promise<{ phone: string | null; prefs: SavedDestinationsPreferences }> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('phone, preferences')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    phone: data?.phone ?? null,
    prefs: parsePreferences(data?.preferences),
  };
}

async function saveUserPreferences(
  firebaseUid: string,
  phone: string | null | undefined,
  prefs: SavedDestinationsPreferences
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  const mergedPreferences = {
    ...(existing?.preferences && typeof existing.preferences === 'object' && !Array.isArray(existing.preferences)
      ? (existing.preferences as Record<string, unknown>)
      : {}),
    savedDestinations: prefs.savedDestinations ?? [],
    travelPatterns: prefs.travelPatterns ?? [],
  };

  const { error } = await supabase.from('user_profiles').upsert(
    {
      firebase_uid: firebaseUid,
      phone: phone ?? null,
      preferences: mergedPreferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'firebase_uid' }
  );

  if (error) throw new Error(error.message);
}

export async function ensureUserProfile(firebaseUid: string, phone?: string | null) {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from('user_profiles').upsert(
    {
      firebase_uid: firebaseUid,
      phone: phone ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'firebase_uid' }
  );
  if (error) {
    console.warn('[ensureUserProfile]', error.message);
  }
}

export async function listSavedDestinations(firebaseUid: string): Promise<SavedDestination[]> {
  const { prefs } = await loadUserPreferences(firebaseUid);
  const rows = prefs.savedDestinations ?? [];
  return rows
    .filter((row) => row.firebase_uid === firebaseUid)
    .sort((a, b) => {
      const typeOrder = a.label_type.localeCompare(b.label_type);
      if (typeOrder !== 0) return typeOrder;
      return (a.custom_label ?? '').localeCompare(b.custom_label ?? '');
    })
    .map(mapSavedDestination);
}

export async function upsertSavedDestination(input: {
  firebaseUid: string;
  phone?: string | null;
  labelType: SavedDestinationLabelType;
  customLabel?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
}): Promise<SavedDestination> {
  await ensureUserProfile(input.firebaseUid, input.phone);

  const { prefs, phone } = await loadUserPreferences(input.firebaseUid);
  const destinations = [...(prefs.savedDestinations ?? [])];
  const now = new Date().toISOString();
  const customLabel = input.labelType === 'other' ? input.customLabel?.trim() ?? null : null;

  const payload: SavedDestinationRow = {
    id: randomUUID(),
    firebase_uid: input.firebaseUid,
    label_type: input.labelType,
    custom_label: customLabel,
    address: input.address.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    place_id: input.placeId ?? null,
    created_at: now,
    updated_at: now,
  };

  let existingIndex = -1;
  if (input.labelType === 'other') {
    const normalized = customLabel?.toLowerCase() ?? '';
    existingIndex = destinations.findIndex(
      (row) =>
        row.firebase_uid === input.firebaseUid &&
        row.label_type === 'other' &&
        (row.custom_label ?? '').trim().toLowerCase() === normalized
    );
  } else {
    existingIndex = destinations.findIndex(
      (row) => row.firebase_uid === input.firebaseUid && row.label_type === input.labelType
    );
  }

  if (existingIndex >= 0) {
    const existing = destinations[existingIndex];
    destinations[existingIndex] = {
      ...payload,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: now,
    };
  } else {
    destinations.push(payload);
  }

  await saveUserPreferences(input.firebaseUid, input.phone ?? phone, {
    ...prefs,
    savedDestinations: destinations,
  });

  const saved = existingIndex >= 0 ? destinations[existingIndex] : destinations[destinations.length - 1];
  return mapSavedDestination(saved);
}

export async function deleteSavedDestination(firebaseUid: string, id: string): Promise<void> {
  const { prefs, phone } = await loadUserPreferences(firebaseUid);
  const destinations = (prefs.savedDestinations ?? []).filter(
    (row) => !(row.id === id && row.firebase_uid === firebaseUid)
  );

  await saveUserPreferences(firebaseUid, phone, {
    ...prefs,
    savedDestinations: destinations,
  });
}

export async function recordTravelPattern(input: {
  firebaseUid: string;
  savedDestinationId?: string | null;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  departureAt: string;
  isImmediate: boolean;
}): Promise<DestinationTravelPattern> {
  const departure = new Date(input.departureAt);
  if (Number.isNaN(departure.getTime())) {
    throw new Error('Invalid departure time');
  }

  const { prefs, phone } = await loadUserPreferences(input.firebaseUid);
  const patterns = [...(prefs.travelPatterns ?? [])];
  const departureHour = departure.getHours();
  const departureMinute = departure.getMinutes();
  const dayOfWeek = departure.getDay();
  const label = input.destinationLabel.trim();
  const now = new Date().toISOString();

  const existingIndex = patterns.findIndex(
    (row) =>
      row.firebase_uid === input.firebaseUid &&
      row.destination_label === label &&
      row.departure_hour === departureHour &&
      row.departure_minute === departureMinute &&
      row.day_of_week === dayOfWeek
  );

  if (existingIndex >= 0) {
    const existing = patterns[existingIndex];
    patterns[existingIndex] = {
      ...existing,
      saved_destination_id: input.savedDestinationId ?? existing.saved_destination_id,
      destination_lat: input.destinationLat,
      destination_lng: input.destinationLng,
      is_immediate: input.isImmediate,
      occurrence_count: (existing.occurrence_count ?? 1) + 1,
      last_used_at: now,
    };
    await saveUserPreferences(input.firebaseUid, phone, { ...prefs, travelPatterns: patterns });
    return mapTravelPattern(patterns[existingIndex]);
  }

  const created: TravelPatternRow = {
    id: randomUUID(),
    firebase_uid: input.firebaseUid,
    saved_destination_id: input.savedDestinationId ?? null,
    destination_label: label,
    destination_lat: input.destinationLat,
    destination_lng: input.destinationLng,
    departure_hour: departureHour,
    departure_minute: departureMinute,
    day_of_week: dayOfWeek,
    is_immediate: input.isImmediate,
    occurrence_count: 1,
    last_used_at: now,
  };

  patterns.push(created);
  await saveUserPreferences(input.firebaseUid, phone, { ...prefs, travelPatterns: patterns });
  return mapTravelPattern(created);
}

export async function listTravelPatterns(firebaseUid: string): Promise<DestinationTravelPattern[]> {
  const { prefs } = await loadUserPreferences(firebaseUid);
  return (prefs.travelPatterns ?? [])
    .filter((row) => row.firebase_uid === firebaseUid)
    .sort((a, b) => b.occurrence_count - a.occurrence_count)
    .map(mapTravelPattern);
}
