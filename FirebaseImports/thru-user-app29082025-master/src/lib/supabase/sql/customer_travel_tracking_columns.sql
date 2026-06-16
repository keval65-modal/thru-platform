-- Run in Supabase SQL editor after customer_live_location_columns.sql (additive).
-- Travel tracking, ETA, arrival, and manual confirmation (customer pickup orders).

alter table public.placed_orders
  add column if not exists current_latitude double precision,
  add column if not exists current_longitude double precision,
  add column if not exists last_polled_at timestamptz,
  add column if not exists last_eta_refresh_at timestamptz,
  add column if not exists last_eta_refresh_latitude double precision,
  add column if not exists last_eta_refresh_longitude double precision,
  add column if not exists current_eta_minutes double precision,
  add column if not exists current_eta_range text,
  add column if not exists arrival_radius_entered boolean default false,
  add column if not exists arrival_radius_entered_at timestamptz,
  add column if not exists manually_confirmed_travel boolean default false,
  add column if not exists customer_tracking_status text,
  add column if not exists customer_travel_route_json jsonb;

comment on column public.placed_orders.customer_tracking_status is 'e.g. Arriving when inside arrival radius (first entry only).';
