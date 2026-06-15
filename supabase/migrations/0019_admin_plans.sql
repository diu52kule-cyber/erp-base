-- Phase 20: Admin — org subscription plans (platform-level, managed by SaaS operator)
create table if not exists org_plans (
  org_id          uuid primary key references organizations(id) on delete cascade,
  plan_name       text not null default 'starter'
                    check (plan_name in ('trial','starter','growth','scale','custom','suspended')),
  status          text not null default 'trial'
                    check (status in ('trial','active','suspended','cancelled')),
  amount          numeric(10,2) not null default 0,
  billing_period  text not null default 'monthly'
                    check (billing_period in ('monthly','yearly')),
  next_billing_date date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Seed a default plan row for every existing org
insert into org_plans (org_id, plan_name, status, amount)
select id, 'trial', 'trial', 0 from organizations
on conflict (org_id) do nothing;

-- Auto-seed plan row when a new org is created (trigger)
create or replace function seed_org_plan()
returns trigger language plpgsql security definer as $$
begin
  insert into org_plans (org_id, plan_name, status, amount)
  values (new.id, 'trial', 'trial', 0)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_org_created_seed_plan on organizations;
create trigger on_org_created_seed_plan
  after insert on organizations
  for each row execute function seed_org_plan();
