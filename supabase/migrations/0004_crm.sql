-- =====================================================================
-- Phase 3: CRM — Contacts + Deals pipeline
-- =====================================================================

create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  type        text not null default 'lead'
              check (type in ('lead','customer','vendor')),
  company     text,
  gstin       text,
  address     text,
  tags        text[] not null default '{}',
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists deals (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  contact_id     uuid references contacts(id) on delete set null,
  title          text not null,
  value          numeric(14,2) not null default 0,
  stage          text not null default 'lead'
                 check (stage in ('lead','contacted','proposal','negotiation','won','lost')),
  expected_close date,
  notes          text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

create trigger deals_updated_at
  before update on deals
  for each row execute function update_updated_at();

alter table contacts enable row level security;
alter table deals    enable row level security;

create policy contacts_select on contacts for select using (is_org_member(org_id));
create policy contacts_insert on contacts for insert with check (is_org_member(org_id));
create policy contacts_update on contacts for update using (is_org_member(org_id));
create policy contacts_delete on contacts for delete using (is_org_member(org_id));

create policy deals_select on deals for select using (is_org_member(org_id));
create policy deals_insert on deals for insert with check (is_org_member(org_id));
create policy deals_update on deals for update using (is_org_member(org_id));
create policy deals_delete on deals for delete using (is_org_member(org_id));

-- Grant CRM to all existing orgs
insert into entitlements (org_id, module_key, enabled)
select id, 'crm', true from organizations
on conflict do nothing;

-- Auto-grant CRM to new orgs
create or replace function create_organization(p_name text, p_business_type text)
returns uuid language plpgsql security definer as $$
declare new_org uuid;
begin
  insert into organizations (name, business_type)
  values (p_name, coalesce(p_business_type, 'general'))
  returning id into new_org;

  insert into memberships (org_id, user_id, role)
  values (new_org, auth.uid(), 'owner');

  insert into entitlements (org_id, module_key, enabled)
  select new_org, key, true from modules
  where key in ('billing', 'payments', 'inventory', 'crm')
  on conflict do nothing;

  return new_org;
end; $$;
