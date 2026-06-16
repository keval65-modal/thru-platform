-- Run in Supabase SQL editor (once) so customer live GPS pings can be stored on placed_orders.
alter table public.placed_orders
  add column if not exists customer_live_lat double precision,
  add column if not exists customer_live_lng double precision,
  add column if not exists customer_live_accuracy double precision,
  add column if not exists customer_live_updated_at timestamptz;

comment on column public.placed_orders.customer_live_lat is 'Last customer-reported latitude during active order (isolated live tracking).';
comment on column public.placed_orders.customer_live_lng is 'Last customer-reported longitude during active order (isolated live tracking).';
