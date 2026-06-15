-- =====================================================================
-- Phase 4: HR — Employees, Attendance, Payroll
-- =====================================================================

create table if not exists employees (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  name             text not null,
  email            text,
  phone            text,
  department       text,
  designation      text,
  employment_type  text not null default 'full-time'
                   check (employment_type in ('full-time','part-time','contract','intern')),
  joining_date     date not null default current_date,
  monthly_salary   numeric(12,2) not null default 0,
  status           text not null default 'active'
                   check (status in ('active','inactive')),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date        date not null,
  status      text not null default 'present'
              check (status in ('present','absent','half-day','leave')),
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (employee_id, date)
);

create table if not exists payroll_runs (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  month            date not null,
  working_days     int not null default 26,
  status           text not null default 'draft'
                   check (status in ('draft','processed')),
  total_gross      numeric(14,2) not null default 0,
  total_net        numeric(14,2) not null default 0,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  unique (org_id, month)
);

create table if not exists payroll_entries (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  run_id          uuid not null references payroll_runs(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  present_days    int not null default 0,
  gross_salary    numeric(12,2) not null default 0,
  deductions      numeric(12,2) not null default 0,
  net_salary      numeric(12,2) not null default 0,
  notes           text,
  unique (run_id, employee_id)
);

create trigger employees_updated_at
  before update on employees
  for each row execute function update_updated_at();

alter table employees       enable row level security;
alter table attendance      enable row level security;
alter table payroll_runs    enable row level security;
alter table payroll_entries enable row level security;

create policy emp_select on employees      for select using (is_org_member(org_id));
create policy emp_insert on employees      for insert with check (is_org_member(org_id));
create policy emp_update on employees      for update using (is_org_member(org_id));
create policy emp_delete on employees      for delete using (is_org_member(org_id));

create policy att_select on attendance     for select using (is_org_member(org_id));
create policy att_insert on attendance     for insert with check (is_org_member(org_id));
create policy att_update on attendance     for update using (is_org_member(org_id));
create policy att_delete on attendance     for delete using (is_org_member(org_id));

create policy pr_select on payroll_runs    for select using (is_org_member(org_id));
create policy pr_insert on payroll_runs    for insert with check (is_org_member(org_id));
create policy pr_update on payroll_runs    for update using (is_org_member(org_id));
create policy pr_delete on payroll_runs    for delete using (is_org_member(org_id));

create policy pe_select on payroll_entries for select using (is_org_member(org_id));
create policy pe_insert on payroll_entries for insert with check (is_org_member(org_id));
create policy pe_update on payroll_entries for update using (is_org_member(org_id));
create policy pe_delete on payroll_entries for delete using (is_org_member(org_id));

-- Grant HR to all existing orgs
insert into entitlements (org_id, module_key, enabled)
select id, 'hr', true from organizations
on conflict do nothing;

-- Auto-grant HR to new orgs
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
  where key in ('billing', 'payments', 'inventory', 'crm', 'hr')
  on conflict do nothing;

  return new_org;
end; $$;
