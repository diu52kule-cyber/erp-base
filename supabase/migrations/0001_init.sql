-- =====================================================================
-- Phase 0: multi-tenant foundation + feature-entitlement engine
-- Run this in your Supabase project: SQL Editor -> paste -> Run
-- =====================================================================

-- Organizations = tenants. Every business that signs up gets one.
create table if not exists organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  business_type text not null default 'general',   -- cafe | shop | mall | startup | freelancer | general
  created_at    timestamptz not null default now()
);

-- Memberships link Supabase auth users to an organization with a role.
create table if not exists memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner',         -- owner | admin | member
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- Catalog of sellable modules (the "features" you switch on per customer).
create table if not exists modules (
  key         text primary key,                     -- billing | payments | inventory | crm | hr | subscriptions
  name        text not null,
  description text
);

-- Which modules each organization currently has enabled.
create table if not exists entitlements (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  module_key text not null references modules(key),
  enabled    boolean not null default true,
  unique (org_id, module_key)
);

-- Helper: is the current logged-in user a member of a given org?
create or replace function is_org_member(target uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target and m.user_id = auth.uid()
  );
$$;

-- Atomic org creation: makes the org, the owner membership, and a default module.
-- security definer lets it bypass RLS for the initial insert safely.
create or replace function create_organization(p_name text, p_business_type text)
returns uuid language plpgsql security definer as $$
declare new_org uuid;
begin
  insert into organizations (name, business_type)
  values (p_name, coalesce(p_business_type, 'general'))
  returning id into new_org;

  insert into memberships (org_id, user_id, role)
  values (new_org, auth.uid(), 'owner');

  -- Phase 0 default: give every new tenant the billing module to start.
  insert into entitlements (org_id, module_key, enabled)
  values (new_org, 'billing', true)
  on conflict do nothing;

  return new_org;
end; $$;

-- ---------------------------------------------------------------------
-- Row-Level Security: a tenant can only ever see its own data.
-- ---------------------------------------------------------------------
alter table organizations enable row level security;
alter table memberships   enable row level security;
alter table entitlements  enable row level security;
alter table modules       enable row level security;

drop policy if exists org_member_select on organizations;
create policy org_member_select on organizations
  for select using (is_org_member(id));

drop policy if exists org_member_update on organizations;
create policy org_member_update on organizations
  for update using (is_org_member(id));

drop policy if exists mem_self_select on memberships;
create policy mem_self_select on memberships
  for select using (user_id = auth.uid() or is_org_member(org_id));

drop policy if exists mem_self_insert on memberships;
create policy mem_self_insert on memberships
  for insert with check (user_id = auth.uid());

drop policy if exists ent_member_select on entitlements;
create policy ent_member_select on entitlements
  for select using (is_org_member(org_id));

drop policy if exists modules_public_select on modules;
create policy modules_public_select on modules
  for select using (true);

-- ---------------------------------------------------------------------
-- Seed the module catalog (these are the features you'll sell).
-- ---------------------------------------------------------------------
insert into modules (key, name, description) values
  ('billing',       'Billing & Invoicing',  'Quotes, invoices, receipts, GST'),
  ('payments',      'Payments',             'Collect payments online'),
  ('inventory',     'Inventory',            'Products and stock control'),
  ('crm',           'CRM',                  'Leads, contacts, pipeline'),
  ('hr',            'HR',                   'Employees, attendance, payroll'),
  ('subscriptions', 'Subscription Manager', 'Plans and recurring billing')
on conflict (key) do nothing;
