-- Merchant consents, agreements, audit logs, storage bucket (run in Supabase SQL editor)
-- Requires public.vendors(id uuid) as merchant identity.

alter table public.vendors
  add column if not exists preferred_language text default 'en';

-- ---------------------------------------------------------------------------
-- merchant_consents
-- ---------------------------------------------------------------------------
create table if not exists public.merchant_consents (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.vendors(id) on delete cascade,
  whatsapp_consent boolean not null,
  consented_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_merchant_consents_merchant_id on public.merchant_consents(merchant_id);

-- ---------------------------------------------------------------------------
-- merchant_agreements (immutable: no updates/deletes via RLS for app roles)
-- ---------------------------------------------------------------------------
create table if not exists public.merchant_agreements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.vendors(id) on delete cascade,
  agreement_version text not null,
  language text not null,
  signed_name text not null,
  signed_at timestamptz not null,
  ip_address text,
  pdf_url text not null,
  agreement_hash text not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, agreement_version)
);

create index if not exists idx_merchant_agreements_merchant_id on public.merchant_agreements(merchant_id);

-- ---------------------------------------------------------------------------
-- agreement_audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.agreement_audit_logs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.vendors(id) on delete cascade,
  action text not null,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agreement_audit_logs_merchant_id on public.agreement_audit_logs(merchant_id);

-- ---------------------------------------------------------------------------
-- Helper: admin check via vendors.role (auth.uid() = vendors.id)
-- ---------------------------------------------------------------------------
create or replace function public.is_merchant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select v.role = 'admin' from public.vendors v where v.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_merchant_admin() from public;
grant execute on function public.is_merchant_admin() to authenticated;
grant execute on function public.is_merchant_admin() to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.merchant_consents enable row level security;
alter table public.merchant_agreements enable row level security;
alter table public.agreement_audit_logs enable row level security;

drop policy if exists "merchant_consents_select_own" on public.merchant_consents;
create policy "merchant_consents_select_own"
  on public.merchant_consents for select
  using (auth.uid() = merchant_id or public.is_merchant_admin());

drop policy if exists "merchant_consents_insert_self" on public.merchant_consents;
create policy "merchant_consents_insert_self"
  on public.merchant_consents for insert
  with check (auth.uid() = merchant_id);

drop policy if exists "merchant_agreements_select_own" on public.merchant_agreements;
create policy "merchant_agreements_select_own"
  on public.merchant_agreements for select
  using (auth.uid() = merchant_id or public.is_merchant_admin());

drop policy if exists "merchant_agreements_insert_self" on public.merchant_agreements;
create policy "merchant_agreements_insert_self"
  on public.merchant_agreements for insert
  with check (auth.uid() = merchant_id);

-- Immutable: no update/delete policies for authenticated (service_role bypasses RLS)

drop policy if exists "agreement_audit_logs_select" on public.agreement_audit_logs;
create policy "agreement_audit_logs_select"
  on public.agreement_audit_logs for select
  using (auth.uid() = merchant_id or public.is_merchant_admin());

drop policy if exists "agreement_audit_logs_insert_self" on public.agreement_audit_logs;
create policy "agreement_audit_logs_insert_self"
  on public.agreement_audit_logs for insert
  with check (auth.uid() = merchant_id);

-- ---------------------------------------------------------------------------
-- Storage: merchant-agreements
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('merchant-agreements', 'merchant-agreements', false)
on conflict (id) do nothing;

drop policy if exists "merchant_agreements_storage_read_own" on storage.objects;
create policy "merchant_agreements_storage_read_own"
  on storage.objects for select
  using (
    bucket_id = 'merchant-agreements'
    and (
      auth.uid()::text = split_part(name, '/', 1)
      or public.is_merchant_admin()
    )
  );

drop policy if exists "merchant_agreements_storage_insert_own" on storage.objects;
create policy "merchant_agreements_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'merchant-agreements'
    and auth.uid()::text = split_part(name, '/', 1)
  );
