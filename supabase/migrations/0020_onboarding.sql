-- Onboarding extras: richer org profile collected during setup
alter table organizations add column if not exists city  text;
alter table organizations add column if not exists phone text;

-- Ensure org_plans trial row is created when org is created
-- (safe to run even if trigger already exists from 0019)
create or replace function seed_org_plan()
returns trigger language plpgsql security definer as $$
declare
  trial_end date := (current_date + interval '7 days')::date;
begin
  insert into org_plans (org_id, plan_name, status, amount, next_billing_date)
  values (new.id, 'trial', 'trial', 0, trial_end)
  on conflict (org_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_org_created_seed_plan on organizations;
create trigger on_org_created_seed_plan
  after insert on organizations
  for each row execute function seed_org_plan();
