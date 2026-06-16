-- Menu items + optional PDF staging bucket (run in Supabase SQL editor)
-- Server routes use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
-- The vendor app does NOT use Supabase Auth JWT in the browser for menu writes.

-- menu_items table (if not already created)
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  description text,
  price decimal(10,2) not null,
  image_url text,
  category text,
  is_available boolean default true,
  is_veg boolean default false,
  preparation_time integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_menu_items_vendor_id on public.menu_items(vendor_id);
create index if not exists idx_menu_items_available on public.menu_items(is_available);

alter table public.menu_items enable row level security;

-- Public read for customer-facing menus
drop policy if exists "Anyone can view available menu items" on public.menu_items;
create policy "Anyone can view available menu items"
  on public.menu_items for select
  using (is_available = true);

-- Service role full access (app server writes)
drop policy if exists "menu_items_service_role_all" on public.menu_items;
create policy "menu_items_service_role_all"
  on public.menu_items for all
  to service_role
  using (true)
  with check (true);

-- Optional staging bucket for legacy PDF uploads (app now posts PDFs directly to the API)
-- Menu item photos are stored in the vendor-images bucket: menu_item_images/{vendor_id}/{item_id}.{ext}
insert into storage.buckets (id, name, public)
values ('vendor-menu-pdfs', 'vendor-menu-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "vendor_menu_pdfs_service_role_all" on storage.objects;
create policy "vendor_menu_pdfs_service_role_all"
  on storage.objects for all
  to service_role
  using (bucket_id = 'vendor-menu-pdfs')
  with check (bucket_id = 'vendor-menu-pdfs');
