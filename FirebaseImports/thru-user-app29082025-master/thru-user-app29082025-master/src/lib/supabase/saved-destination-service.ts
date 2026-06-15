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
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('saved_destinations')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .order('label_type', { ascending: true })
    .order('custom_label', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as SavedDestinationRow[] | null)?.map(mapSavedDestination) ?? [];
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

  const supabase = createServiceSupabaseClient();
  const now = new Date().toISOString();
  const payload = {
    firebase_uid: input.firebaseUid,
    label_type: input.labelType,
    custom_label: input.labelType === 'other' ? input.customLabel?.trim() ?? null : null,
    address: input.address.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    place_id: input.placeId ?? null,
    updated_at: now,
  };

  if (input.labelType === 'other') {
    const { data: existing } = await supabase
      .from('saved_destinations')
      .select('id')
      .eq('firebase_uid', input.firebaseUid)
      .eq('label_type', 'other')
      .ilike('custom_label', payload.custom_label ?? '')
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('saved_destinations')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapSavedDestination(data as SavedDestinationRow);
    }

    const { data, error } = await supabase
      .from('saved_destinations')
      .insert({ ...payload, created_at: now })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapSavedDestination(data as SavedDestinationRow);
  }

  const { data: existingPreset } = await supabase
    .from('saved_destinations')
    .select('id')
    .eq('firebase_uid', input.firebaseUid)
    .eq('label_type', input.labelType)
    .maybeSingle();

  if (existingPreset?.id) {
    const { data, error } = await supabase
      .from('saved_destinations')
      .update(payload)
      .eq('id', existingPreset.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapSavedDestination(data as SavedDestinationRow);
  }

  const { data, error } = await supabase
    .from('saved_destinations')
    .insert({ ...payload, created_at: now })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapSavedDestination(data as SavedDestinationRow);
}

export async function deleteSavedDestination(firebaseUid: string, id: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from('saved_destinations')
    .delete()
    .eq('id', id)
    .eq('firebase_uid', firebaseUid);
  if (error) throw new Error(error.message);
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

  const supabase = createServiceSupabaseClient();
  const departureHour = departure.getHours();
  const departureMinute = departure.getMinutes();
  const dayOfWeek = departure.getDay();
  const label = input.destinationLabel.trim();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('destination_travel_patterns')
    .select('*')
    .eq('firebase_uid', input.firebaseUid)
    .eq('destination_label', label)
    .eq('departure_hour', departureHour)
    .eq('departure_minute', departureMinute)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('destination_travel_patterns')
      .update({
        saved_destination_id: input.savedDestinationId ?? existing.saved_destination_id,
        destination_lat: input.destinationLat,
        destination_lng: input.destinationLng,
        is_immediate: input.isImmediate,
        occurrence_count: (existing.occurrence_count ?? 1) + 1,
        last_used_at: now,
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapTravelPattern(data as TravelPatternRow);
  }

  const { data, error } = await supabase
    .from('destination_travel_patterns')
    .insert({
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
      created_at: now,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapTravelPattern(data as TravelPatternRow);
}

export async function listTravelPatterns(firebaseUid: string): Promise<DestinationTravelPattern[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('destination_travel_patterns')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .order('occurrence_count', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TravelPatternRow[] | null)?.map(mapTravelPattern) ?? [];
}
