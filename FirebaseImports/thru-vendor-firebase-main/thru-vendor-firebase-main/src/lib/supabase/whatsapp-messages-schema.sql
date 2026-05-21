-- WhatsApp outbound log (run in Supabase SQL editor)
-- Requires public.vendors(id uuid) as merchant identity.

alter table public.vendors
  add column if not exists phone_verified boolean not null default false;

comment on column public.vendors.phone_verified is 'True after phone OTP verified on signup (or equivalent). Used for WhatsApp welcome eligibility.';

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.vendors(id) on delete cascade,
  phone_number text not null,
  template_name text not null,
  status text not null,
  meta_message_id text,
  api_response jsonb,
  created_at timestamptz not null default now()
);

comment on table public.whatsapp_messages is 'Outbound WhatsApp Cloud API sends; api_response stores full Graph JSON for debugging and delivery tracking.';
comment on column public.whatsapp_messages.status is 'e.g. pending, sent, failed';

-- At most one row per merchant per template (duplicate send prevention).
create unique index if not exists whatsapp_messages_one_merchant_welcome
  on public.whatsapp_messages (merchant_id)
  where template_name = 'merchant_welcome';

create unique index if not exists whatsapp_messages_one_merchant_onboarding_complete
  on public.whatsapp_messages (merchant_id)
  where template_name = 'merchant_onboarding_complete';

create index if not exists idx_whatsapp_messages_merchant_id
  on public.whatsapp_messages (merchant_id);

create index if not exists idx_whatsapp_messages_template
  on public.whatsapp_messages (template_name);

create index if not exists idx_whatsapp_messages_created_at
  on public.whatsapp_messages (created_at desc);

alter table public.whatsapp_messages enable row level security;
