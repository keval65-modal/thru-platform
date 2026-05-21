-- Run this in your Supabase SQL Editor to support the Vendor Onboarding flow

-- 1) Onboarding state (simple jsonb bucket for toggles + progress)
create table if not exists public.vendor_onboarding (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vendor_onboarding enable row level security;

create policy "Vendors can view their own onboarding"
on public.vendor_onboarding for select
using ( auth.uid() = vendor_id );

create policy "Vendors can insert their own onboarding"
on public.vendor_onboarding for insert
with check ( auth.uid() = vendor_id );

create policy "Vendors can update their own onboarding"
on public.vendor_onboarding for update
using ( auth.uid() = vendor_id );

-- 2) Bank account details (separate table for cleaner validation + future payouts)
create table if not exists public.vendor_bank_accounts (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  account_holder_name text not null,
  account_number text not null,
  ifsc_code text not null,
  bank_name text not null,
  upi_id text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vendor_bank_accounts enable row level security;

create policy "Vendors can view their own bank account"
on public.vendor_bank_accounts for select
using ( auth.uid() = vendor_id );

create policy "Vendors can insert their own bank account"
on public.vendor_bank_accounts for insert
with check ( auth.uid() = vendor_id );

create policy "Vendors can update their own bank account"
on public.vendor_bank_accounts for update
using ( auth.uid() = vendor_id );

-- 3) Generated agreements
create table if not exists public.vendor_agreements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  language text not null check (language in ('en', 'hi')),
  template_version text not null default 'v1',
  file_path text not null,
  public_url text,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_vendor_agreements_vendor_id on public.vendor_agreements(vendor_id);

alter table public.vendor_agreements enable row level security;

create policy "Vendors can view their own agreements"
on public.vendor_agreements for select
using ( auth.uid() = vendor_id );

create policy "Vendors can insert their own agreements"
on public.vendor_agreements for insert
with check ( auth.uid() = vendor_id );

-- 4) Storage bucket for generated agreements (make public for now to simplify download)
insert into storage.buckets (id, name, public)
values ('vendor-agreements', 'vendor-agreements', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Vendors can upload their agreements"
on storage.objects for insert
with check (
  bucket_id = 'vendor-agreements' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public Access to Vendor Agreements"
on storage.objects for select
using ( bucket_id = 'vendor-agreements' );

