
-- Run this in your Supabase SQL Editor to support the KYC flow

-- 1. Create a table for storing Vendor KYC data
-- CHANGED: vendor_id is now uuid to match public.vendors(id)
create table if not exists public.vendor_kyc (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.vendor_kyc enable row level security;

-- 3. Create policies
-- Allow vendors to view their own KYC data
create policy "Vendors can view their own kyc data"
on public.vendor_kyc for select
using ( auth.uid() = vendor_id );

-- Allow vendors to insert/update their own KYC data
create policy "Vendors can insert their own kyc data"
on public.vendor_kyc for insert
with check ( auth.uid() = vendor_id );

create policy "Vendors can update their own kyc data"
on public.vendor_kyc for update
using ( auth.uid() = vendor_id );

-- 4. Create Storage Bucket for KYC Documents
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', true)
on conflict (id) do nothing;

-- 5. Storage Policies
-- Allow authenticated users to upload files to their own folder
create policy "Vendors can upload kyc documents"
on storage.objects for insert
with check (
  bucket_id = 'kyc-documents' and
  auth.role() = 'authenticated' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow vendors to view their own files (and public view if needed, but restrict if privacy is key)
-- For now, allowing public read for simplicity of the "publicUrl" approach in code, 
-- but in production you'd want signed URLs and stricter read policies.
create policy "Public Access to KYC Docs"
on storage.objects for select
using ( bucket_id = 'kyc-documents' );
