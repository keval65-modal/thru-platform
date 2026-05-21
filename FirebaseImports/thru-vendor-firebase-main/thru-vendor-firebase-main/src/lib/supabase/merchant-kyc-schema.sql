-- Private KYC document storage (run in Supabase SQL editor)

insert into storage.buckets (id, name, public)
values ('merchant-kyc', 'merchant-kyc', false)
on conflict (id) do nothing;

-- Service role used by the app for uploads; merchants use API routes.
-- Admins read via service role signed URLs in admin panel.

create table if not exists public.vendor_kyc (
  vendor_id uuid primary key references public.vendors(id) on delete cascade,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_kyc_updated on public.vendor_kyc(updated_at desc);

alter table public.vendor_kyc enable row level security;
