-- Phase 11: Payroll Compliance (PF / ESI / PT / TDS)

-- Statutory settings per org
create table if not exists statutory_settings (
  org_id          uuid primary key references organizations(id) on delete cascade,
  pf_enabled      boolean not null default true,
  esi_enabled     boolean not null default true,
  pt_enabled      boolean not null default false,
  pt_state        text    not null default 'MH',
  tds_enabled     boolean not null default false,
  updated_at      timestamptz not null default now()
);
alter table statutory_settings enable row level security;
create policy "org members manage statutory_settings"
  on statutory_settings for all
  using (is_org_member(org_id));

-- Extend payroll_entries with per-deduction columns
alter table payroll_entries
  add column if not exists basic_salary    numeric(12,2) not null default 0,
  add column if not exists pf_employee     numeric(12,2) not null default 0,
  add column if not exists pf_employer     numeric(12,2) not null default 0,
  add column if not exists esi_employee    numeric(12,2) not null default 0,
  add column if not exists esi_employer    numeric(12,2) not null default 0,
  add column if not exists professional_tax numeric(12,2) not null default 0,
  add column if not exists tds             numeric(12,2) not null default 0;

-- Extend employees with a basic_salary_pct (percentage of CTC that is basic; default 50%)
alter table employees
  add column if not exists basic_pct numeric(5,2) not null default 50;
