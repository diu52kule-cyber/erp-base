-- =====================================================================
-- HR Pro: leave management, holiday calendar, punch times, overtime,
--         employee loans, expense→payroll reimbursement
-- Run in Supabase SQL Editor
-- =====================================================================

-- ----- Leave Types ---------------------------------------------------
create table if not exists leave_types (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  days_per_year int not null default 0,
  paid         boolean not null default true,
  color        text not null default 'bg-blue-50 text-blue-700',
  created_at   timestamptz not null default now()
);

-- Seed default leave types for existing orgs
insert into leave_types (org_id, name, days_per_year, paid, color)
select
  o.id,
  lt.name,
  lt.days,
  lt.paid,
  lt.color
from organizations o
cross join (values
  ('Annual Leave',    15, true,  'bg-green-50 text-green-700'),
  ('Sick Leave',      12, true,  'bg-red-50 text-red-700'),
  ('Casual Leave',    6,  true,  'bg-blue-50 text-blue-700'),
  ('Unpaid Leave',    0,  false, 'bg-neutral-100 text-neutral-600')
) as lt(name, days, paid, color)
where not exists (
  select 1 from leave_types x where x.org_id = o.id and x.name = lt.name
);

-- ----- Leave Requests ------------------------------------------------
create table if not exists leave_requests (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  leave_type_id   uuid not null references leave_types(id) on delete restrict,
  start_date      date not null,
  end_date        date not null,
  days            numeric(5,1) not null default 1,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  notes           text,
  approved_by     uuid references auth.users(id),
  approved_at     timestamptz,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

-- ----- Holiday Calendar ----------------------------------------------
create table if not exists holidays (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  date         date not null,
  name         text not null,
  is_optional  boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (org_id, date)
);

-- ----- Employee Loans / Advances -------------------------------------
create table if not exists employee_loans (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  employee_id      uuid not null references employees(id) on delete cascade,
  amount           numeric(14,2) not null,
  emi_amount       numeric(14,2) not null,
  disbursed_date   date not null default current_date,
  balance          numeric(14,2) not null,
  status           text not null default 'active'
                   check (status in ('active','closed')),
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

create table if not exists loan_repayments (
  id             uuid primary key default gen_random_uuid(),
  loan_id        uuid not null references employee_loans(id) on delete cascade,
  payroll_run_id uuid references payroll_runs(id) on delete set null,
  amount         numeric(14,2) not null,
  paid_date      date not null default current_date,
  created_at     timestamptz not null default now()
);

-- ----- Attendance: punch times + overtime ----------------------------
alter table attendance add column if not exists check_in      timestamptz;
alter table attendance add column if not exists check_out     timestamptz;
alter table attendance add column if not exists overtime_hours numeric(4,2) not null default 0;

-- ----- Expense claims: reimbursement flag ----------------------------
alter table expense_claims add column if not exists reimburse_in_payroll boolean not null default false;
alter table expense_claims add column if not exists payroll_run_id        uuid references payroll_runs(id) on delete set null;

-- ----- Payroll entries: reimbursement + loan columns ----------------
alter table payroll_entries add column if not exists overtime_pay      numeric(12,2) not null default 0;
alter table payroll_entries add column if not exists loan_deduction     numeric(12,2) not null default 0;
alter table payroll_entries add column if not exists reimbursement      numeric(12,2) not null default 0;

-- ----- RLS -----------------------------------------------------------
alter table leave_types    enable row level security;
alter table leave_requests enable row level security;
alter table holidays       enable row level security;
alter table employee_loans enable row level security;
alter table loan_repayments enable row level security;

create policy lt_all  on leave_types    for all using (is_org_member(org_id));
create policy lr_sel  on leave_requests for select using (is_org_member(org_id));
create policy lr_ins  on leave_requests for insert with check (is_org_member(org_id));
create policy lr_upd  on leave_requests for update using (is_org_member(org_id));
create policy lr_del  on leave_requests for delete using (is_org_member(org_id));
create policy hol_all on holidays       for all using (is_org_member(org_id));
create policy el_sel  on employee_loans for select using (is_org_member(org_id));
create policy el_ins  on employee_loans for insert with check (is_org_member(org_id));
create policy el_upd  on employee_loans for update using (is_org_member(org_id));
create policy lrep_sel on loan_repayments for select
  using (exists (select 1 from employee_loans l where l.id = loan_id and is_org_member(l.org_id)));
create policy lrep_ins on loan_repayments for insert
  with check (exists (select 1 from employee_loans l where l.id = loan_id and is_org_member(l.org_id)));
