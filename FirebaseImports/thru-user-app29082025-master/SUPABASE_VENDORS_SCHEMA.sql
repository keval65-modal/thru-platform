-- SUPABASE VENDORS TABLE - REQUIRED SCHEMA
-- Run this in the Supabase SQL Editor for the thru vendor project

create extension if not exists "uuid-ossp";

alter table public.vendors
    add column if not exists id uuid default uuid_generate_v4(),
    add column if not exists name text not null,
    add column if not exists email text not null,
    add column if not exists phone text,
    add column if not exists address text,
    add column if not exists city text,
    add column if not exists location jsonb,
    add column if not exists store_type text,
    add column if not exists owner_name text,
    add column if not exists opening_time text,
    add column if not exists closing_time text,
    add column if not exists weekly_close_on text,
    add column if not exists image_url text,
    add column if not exists categories text[] default '{}'::text[],
    add column if not exists operating_hours jsonb,
    add column if not exists fcm_token text,
    add column if not exists is_active boolean default true,
    add column if not exists is_active_on_thru boolean default false,
    add column if not exists grocery_enabled boolean default false,
    add column if not exists always_open boolean default false,
    add column if not exists created_at timestamptz default timezone('utc', now()),
    add column if not exists updated_at timestamptz default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendors_pkey'
      and conrelid = 'public.vendors'::regclass
  ) then
    alter table public.vendors
      add constraint vendors_pkey primary key (id);
  end if;
end $$;

create unique index if not exists vendors_email_unique on public.vendors(email);
create unique index if not exists vendors_phone_unique on public.vendors(phone);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists vendors_set_updated_at on public.vendors;
create trigger vendors_set_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

