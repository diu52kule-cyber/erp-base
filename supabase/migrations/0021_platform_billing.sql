-- Phase 21: Platform billing settings (SaaS-operator level, single global row)
-- Used by the trial-expiry paywall to render the WhatsApp contact button + QR.
create table if not exists platform_settings (
  id               smallint primary key default 1 check (id = 1),
  whatsapp_number  text,                 -- digits incl. country code, e.g. 919876543210
  whatsapp_message text default 'Hi, I would like to continue my ERP subscription. My business is: ',
  upi_id           text,                 -- optional UPI VPA for manual payment display
  contact_email    text,
  updated_at       timestamptz not null default now()
);

-- Ensure the singleton row exists
insert into platform_settings (id) values (1) on conflict (id) do nothing;

-- RLS: any authenticated user may READ (paywall needs it); only service role writes (admin panel).
alter table platform_settings enable row level security;

drop policy if exists platform_settings_read on platform_settings;
create policy platform_settings_read on platform_settings
  for select to authenticated using (true);
