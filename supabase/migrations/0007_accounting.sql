-- =====================================================================
-- Phase 8: GST Compliance & Accounting
-- Run in Supabase SQL Editor after 0006_subscriptions_reports_import.sql
-- =====================================================================

-- ----- Extend invoice_items with HSN code + item type ----------------
alter table invoice_items
  add column if not exists hsn_code  text,
  add column if not exists item_type text not null default 'service'
    check (item_type in ('goods','service'));

-- ----- Extend invoices with GST classification fields ----------------
alter table invoices
  add column if not exists place_of_supply text,          -- 2-digit state code e.g. '27'
  add column if not exists supply_type     text default 'B2CS'
    check (supply_type in ('B2B','B2CS','B2CL','export','nil')),
  add column if not exists igst_amount numeric(12,2) not null default 0,
  add column if not exists cgst_amount numeric(12,2) not null default 0,
  add column if not exists sgst_amount numeric(12,2) not null default 0;

-- ----- Org GST settings ----------------------------------------------
create table if not exists org_gst_settings (
  org_id         uuid primary key references organizations(id) on delete cascade,
  gstin          text,
  legal_name     text,
  state_code     text,   -- 2-digit code matching place_of_supply
  filing_period  text not null default 'monthly'
                 check (filing_period in ('monthly','quarterly')),
  updated_at     timestamptz not null default now()
);

alter table org_gst_settings enable row level security;

create policy gst_sel on org_gst_settings for select using (is_org_member(org_id));
create policy gst_ins on org_gst_settings for insert with check (is_org_member(org_id));
create policy gst_upd on org_gst_settings for update using (is_org_member(org_id));

-- ----- Chart of accounts (basic) -------------------------------------
create table if not exists accounts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  code       text not null,
  name       text not null,
  type       text not null
             check (type in ('asset','liability','equity','income','expense')),
  is_system  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

-- ----- Journal entries (double-entry skeleton) -----------------------
create table if not exists journal_entries (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  entry_date  date not null default current_date,
  reference   text,
  narration   text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists journal_lines (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references accounts(id),
  debit      numeric(12,2) not null default 0,
  credit     numeric(12,2) not null default 0
);

alter table accounts        enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines   enable row level security;

create policy acc_sel on accounts for select using (is_org_member(org_id));
create policy acc_ins on accounts for insert with check (is_org_member(org_id));
create policy acc_upd on accounts for update using (is_org_member(org_id));

create policy je_sel on journal_entries for select using (is_org_member(org_id));
create policy je_ins on journal_entries for insert with check (is_org_member(org_id));
create policy je_upd on journal_entries for update using (is_org_member(org_id));

create policy jl_sel on journal_lines for select
  using (exists (select 1 from journal_entries e where e.id = entry_id and is_org_member(e.org_id)));
create policy jl_ins on journal_lines for insert
  with check (exists (select 1 from journal_entries e where e.id = entry_id and is_org_member(e.org_id)));

-- ----- Module registration -------------------------------------------
insert into modules (key, name) values ('accounting', 'GST & Accounting')
on conflict (key) do nothing;

insert into entitlements (org_id, module_key, enabled)
select id, 'accounting', true from organizations
on conflict do nothing;

-- Update create_organization RPC to auto-grant all modules including accounting
create or replace function create_organization(p_name text, p_business_type text)
returns uuid language plpgsql security definer as $$
declare new_org uuid;
begin
  insert into organizations (name, business_type)
  values (p_name, coalesce(p_business_type, 'general'))
  returning id into new_org;
  insert into memberships (org_id, user_id, role) values (new_org, auth.uid(), 'owner');
  insert into entitlements (org_id, module_key, enabled)
  select new_org, key, true from modules on conflict do nothing;
  return new_org;
end; $$;
