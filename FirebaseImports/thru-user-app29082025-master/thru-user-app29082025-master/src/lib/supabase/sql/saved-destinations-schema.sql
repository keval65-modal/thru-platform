-- Saved destinations + travel timing patterns for notification suggestions.
-- Run in Supabase SQL Editor (consumer app project).

CREATE TABLE IF NOT EXISTS saved_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  label_type TEXT NOT NULL CHECK (label_type IN ('home', 'office', 'gym', 'other')),
  custom_label TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  place_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT saved_dest_custom_label_chk CHECK (
    (label_type = 'other' AND custom_label IS NOT NULL AND length(trim(custom_label)) > 0)
    OR (label_type <> 'other')
  )
);

-- One Home / Office / Gym per user; unlimited "other" with distinct custom labels.
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_dest_unique_preset
  ON saved_destinations (firebase_uid, label_type)
  WHERE label_type IN ('home', 'office', 'gym');

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_dest_unique_other_label
  ON saved_destinations (firebase_uid, lower(trim(custom_label)))
  WHERE label_type = 'other';

CREATE INDEX IF NOT EXISTS idx_saved_dest_firebase_uid ON saved_destinations (firebase_uid);

-- Aggregated travel habits: when the user usually leaves for a destination.
CREATE TABLE IF NOT EXISTS destination_travel_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  saved_destination_id UUID REFERENCES saved_destinations(id) ON DELETE SET NULL,
  destination_label TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  departure_hour SMALLINT NOT NULL CHECK (departure_hour >= 0 AND departure_hour <= 23),
  departure_minute SMALLINT NOT NULL DEFAULT 0 CHECK (departure_minute >= 0 AND departure_minute <= 59),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_immediate BOOLEAN NOT NULL DEFAULT false,
  occurrence_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (firebase_uid, destination_label, departure_hour, departure_minute, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_travel_patterns_uid ON destination_travel_patterns (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_travel_patterns_schedule
  ON destination_travel_patterns (firebase_uid, day_of_week, departure_hour, departure_minute);

ALTER TABLE saved_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_travel_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_saved_destinations" ON saved_destinations;
CREATE POLICY "service_role_saved_destinations"
  ON saved_destinations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_travel_patterns" ON destination_travel_patterns;
CREATE POLICY "service_role_travel_patterns"
  ON destination_travel_patterns FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
