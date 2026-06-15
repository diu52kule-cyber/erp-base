-- =====================================================================
-- Phase 5: Subscription Manager + grant reports/import modules
-- =====================================================================
create table if not exists subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(12,2) not null default 0,
  billing_cycle text not null default 'monthly'
                check (billing_cycle in ('monthly','quarterly','annual')),
  features      text[] not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists customer_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  plan_id          uuid references subscription_plans(id) on delete set null,
  customer_name    text not null,
  customer_email   text,
  status           text not null default 'active'
                   check (status in ('active','cancelled','expired','trial')),
  starts_at        date not null default current_date,
  ends_at          date,
  next_billing_at  date,
  notes            text,
  created_at       timestamptz not null default now()
);

alter table subscription_plans     enable row level security;
alter table customer_subscriptions enable row level security;

create policy sp_select on subscription_plans     for select using (is_org_member(org_id));
create policy sp_insert on subscription_plans     for insert with check (is_org_member(org_id));
create policy sp_update on subscription_plans     for update using (is_org_member(org_id));
create policy sp_delete on subscription_plans     for delete using (is_org_member(org_id));

create policy cs_select on customer_subscriptions for select using (is_org_member(org_id));
create policy cs_insert on customer_subscriptions for insert with check (is_org_member(org_id));
create policy cs_update on customer_subscriptions for update using (is_org_member(org_id));
create policy cs_delete on customer_subscriptions for delete using (is_org_member(org_id));

insert into modules (key, name) values
  ('subscriptions', 'Subscription Manager'),
  ('reports',       'Reports'),
  ('import',        'Data Import')
on conflict (key) do nothing;

insert into entitlements (org_id, module_key, enabled)
select id, m.key, true from organizations cross join
  (values ('subscriptions'),('reports'),('import')) as m(key)
on conflict do nothing;

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
