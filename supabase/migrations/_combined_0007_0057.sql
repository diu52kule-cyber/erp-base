-- ===== 0007_accounting.sql =====
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


-- ===== 0008_purchase.sql =====
-- =====================================================================
-- Phase 9: Purchase Orders & Vendor Management
-- Run in Supabase SQL Editor after 0007_accounting.sql
-- =====================================================================

-- ----- Purchase Orders -----------------------------------------------
create table if not exists purchase_orders (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations(id) on delete cascade,
  po_number         text not null,
  vendor_id         uuid references contacts(id) on delete set null,
  vendor_name       text not null,
  vendor_gstin      text,
  billing_address   text,
  status            text not null default 'draft'
                    check (status in ('draft','sent','partial','received','billed','cancelled')),
  issue_date        date not null default current_date,
  expected_delivery date,
  notes             text,
  subtotal          numeric(12,2) not null default 0,
  gst_amount        numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, po_number)
);

-- ----- PO Line Items -------------------------------------------------
create table if not exists po_lines (
  id            uuid primary key default gen_random_uuid(),
  po_id         uuid not null references purchase_orders(id) on delete cascade,
  org_id        uuid not null references organizations(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  description   text not null,
  quantity      numeric(10,3) not null default 1,
  received_qty  numeric(10,3) not null default 0,
  unit_price    numeric(12,2) not null default 0,
  gst_rate      numeric(5,2) not null default 0
                check (gst_rate in (0, 5, 12, 18, 28)),
  amount        numeric(12,2) not null default 0,
  gst_amount    numeric(12,2) not null default 0,
  sort_order    integer not null default 0
);

-- ----- Goods Receipt Notes -------------------------------------------
create table if not exists goods_receipt_notes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  po_id         uuid not null references purchase_orders(id) on delete cascade,
  grn_number    text not null,
  received_date date not null default current_date,
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  unique (org_id, grn_number)
);

create table if not exists grn_lines (
  id               uuid primary key default gen_random_uuid(),
  grn_id           uuid not null references goods_receipt_notes(id) on delete cascade,
  po_line_id       uuid not null references po_lines(id) on delete cascade,
  quantity_received numeric(10,3) not null default 0
);

-- ----- Vendor Bills --------------------------------------------------
create table if not exists vendor_bills (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  po_id         uuid references purchase_orders(id) on delete set null,
  bill_number   text,
  vendor_name   text not null,
  vendor_gstin  text,
  bill_date     date not null default current_date,
  due_date      date,
  subtotal      numeric(12,2) not null default 0,
  gst_amount    numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  status        text not null default 'received'
                check (status in ('received','paid','cancelled')),
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- ----- Triggers ------------------------------------------------------
create trigger po_updated_at
  before update on purchase_orders
  for each row execute function update_updated_at();

-- ----- PO number generator ------------------------------------------
create or replace function next_po_number(p_org_id uuid)
returns text language plpgsql security definer stable as $$
declare
  seq      integer;
  year_str text;
begin
  year_str := to_char(now(), 'YYYY');
  select coalesce(
    max(
      case when po_number ~ ('^PO-' || year_str || '-[0-9]+$')
      then cast(regexp_replace(po_number, '^PO-[0-9]{4}-', '') as integer)
      else null end
    ), 0
  ) + 1
  into seq
  from purchase_orders
  where org_id = p_org_id;
  return 'PO-' || year_str || '-' || lpad(seq::text, 4, '0');
end; $$;

create or replace function next_grn_number(p_org_id uuid)
returns text language plpgsql security definer stable as $$
declare
  seq      integer;
  year_str text;
begin
  year_str := to_char(now(), 'YYYY');
  select coalesce(
    max(
      case when grn_number ~ ('^GRN-' || year_str || '-[0-9]+$')
      then cast(regexp_replace(grn_number, '^GRN-[0-9]{4}-', '') as integer)
      else null end
    ), 0
  ) + 1
  into seq
  from goods_receipt_notes
  where org_id = p_org_id;
  return 'GRN-' || year_str || '-' || lpad(seq::text, 4, '0');
end; $$;

grant execute on function next_po_number(uuid) to authenticated;
grant execute on function next_grn_number(uuid) to authenticated;

-- ----- RLS -----------------------------------------------------------
alter table purchase_orders      enable row level security;
alter table po_lines             enable row level security;
alter table goods_receipt_notes  enable row level security;
alter table grn_lines            enable row level security;
alter table vendor_bills         enable row level security;

create policy po_sel  on purchase_orders for select using (is_org_member(org_id));
create policy po_ins  on purchase_orders for insert with check (is_org_member(org_id));
create policy po_upd  on purchase_orders for update using (is_org_member(org_id));
create policy po_del  on purchase_orders for delete using (is_org_member(org_id));

create policy pol_sel on po_lines for select using (is_org_member(org_id));
create policy pol_ins on po_lines for insert with check (is_org_member(org_id));
create policy pol_upd on po_lines for update using (is_org_member(org_id));
create policy pol_del on po_lines for delete using (is_org_member(org_id));

create policy grn_sel on goods_receipt_notes for select using (is_org_member(org_id));
create policy grn_ins on goods_receipt_notes for insert with check (is_org_member(org_id));

create policy grnl_sel on grn_lines for select
  using (exists (select 1 from goods_receipt_notes g where g.id = grn_id and is_org_member(g.org_id)));
create policy grnl_ins on grn_lines for insert
  with check (exists (select 1 from goods_receipt_notes g where g.id = grn_id and is_org_member(g.org_id)));

create policy vb_sel  on vendor_bills for select using (is_org_member(org_id));
create policy vb_ins  on vendor_bills for insert with check (is_org_member(org_id));
create policy vb_upd  on vendor_bills for update using (is_org_member(org_id));

-- ----- Module registration -------------------------------------------
insert into modules (key, name) values ('purchase', 'Purchase Orders')
on conflict (key) do nothing;

insert into entitlements (org_id, module_key, enabled)
select id, 'purchase', true from organizations
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


-- ===== 0009_roles.sql =====
-- =====================================================================
-- Phase 10: User Roles & Team Invites
-- Run in Supabase SQL Editor after 0008_purchase.sql
-- =====================================================================

-- Add role constraint to memberships (owner | manager | staff | accountant | hr)
alter table memberships drop constraint if exists memberships_role_check;
alter table memberships add constraint memberships_role_check
  check (role in ('owner','manager','staff','accountant','hr'));

-- Org invite tokens â€” valid for 7 days, single-use
create table if not exists org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'staff'
              check (role in ('owner','manager','staff','accountant','hr')),
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid references auth.users(id),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table org_invites enable row level security;

-- Members can see and manage their org's invites
create policy inv_select on org_invites for select using (is_org_member(org_id));
create policy inv_insert on org_invites for insert with check (is_org_member(org_id));
create policy inv_update on org_invites for update using (is_org_member(org_id));
create policy inv_delete on org_invites for delete using (is_org_member(org_id));

-- Allow members to update/delete other memberships (for role changes and removal)
-- The existing policy only allows self-insert; add update/delete for owners
drop policy if exists mem_member_update on memberships;
create policy mem_member_update on memberships
  for update using (is_org_member(org_id));

drop policy if exists mem_member_delete on memberships;
create policy mem_member_delete on memberships
  for delete using (is_org_member(org_id) and user_id != auth.uid());


-- ===== 0010_grant_all_modules.sql =====
-- Grant every module to every existing organisation (backfill).
-- create_organization RPC already does this for new orgs via `select key from modules`.
insert into entitlements (org_id, module_key, enabled)
select o.id, m.key, true
from organizations o
cross join modules m
on conflict (org_id, module_key) do update set enabled = true;


-- ===== 0011_payroll_compliance.sql =====
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


-- ===== 0012_attachments.sql =====
-- Phase 12: File attachments
create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  entity_type  text not null check (entity_type in ('invoice','employee','purchase_order')),
  entity_id    uuid not null,
  file_name    text not null,
  storage_path text not null,
  mime_type    text not null default 'application/octet-stream',
  size_bytes   bigint not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

alter table attachments enable row level security;

create policy "org members manage attachments"
  on attachments for all
  using (is_org_member(org_id));

create index attachments_entity_idx on attachments (org_id, entity_type, entity_id);

-- Note: create a private Supabase Storage bucket named "attachments"
-- with RLS policy: authenticated users whose org_id matches can read/write.
-- Run in Storage dashboard or via CLI:
--   supabase storage create-bucket attachments --private


-- ===== 0013_pos.sql =====
-- Phase 13: Point of Sale
create table pos_sessions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  opened_by      uuid references auth.users(id),
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz,
  opening_float  numeric(12,2) not null default 0,
  closing_cash   numeric(12,2),
  total_sales    numeric(12,2) not null default 0,
  order_count    int not null default 0,
  status         text not null default 'open' check (status in ('open','closed'))
);

create table pos_orders (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  session_id      uuid references pos_sessions(id),
  order_number    text not null,
  table_label     text,
  customer_name   text,
  subtotal        numeric(12,2) not null default 0,
  gst_amount      numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  payment_method  text not null default 'cash' check (payment_method in ('cash','upi','card')),
  amount_tendered numeric(12,2),
  change_amount   numeric(12,2) not null default 0,
  status          text not null default 'completed' check (status in ('open','completed','cancelled')),
  invoice_id      uuid references invoices(id),
  created_at      timestamptz not null default now()
);

create table pos_order_lines (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references pos_orders(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  product_id  uuid references products(id),
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null,
  gst_rate    numeric(5,2) not null default 0,
  gst_amount  numeric(12,2) not null default 0,
  amount      numeric(12,2) not null
);

alter table pos_sessions enable row level security;
alter table pos_orders enable row level security;
alter table pos_order_lines enable row level security;
create policy "org members" on pos_sessions for all using (is_org_member(org_id));
create policy "org members" on pos_orders for all using (is_org_member(org_id));
create policy "org members" on pos_order_lines for all using (is_org_member(org_id));

create index pos_orders_session_idx on pos_orders (session_id);

create or replace function next_pos_order_number(p_org_id uuid) returns text language plpgsql as $$
declare n int; y text;
begin
  y := to_char(now(), 'YYYY');
  select coalesce(max(cast(split_part(order_number,'-',3) as int)),0)+1 into n
  from pos_orders where org_id=p_org_id and extract(year from created_at)=extract(year from now());
  return 'POS-'||y||'-'||lpad(n::text,4,'0');
end; $$;

insert into modules (key, name) values ('pos', 'Point of Sale') on conflict do nothing;
insert into entitlements (org_id, module_key, enabled)
  select id, 'pos', true from organizations on conflict do nothing;

create or replace function create_organization(p_name text, p_business_type text)
returns uuid language plpgsql security definer as $$
declare new_org uuid;
begin
  insert into organizations (name, business_type) values (p_name, coalesce(p_business_type,'general')) returning id into new_org;
  insert into memberships (org_id, user_id, role) values (new_org, auth.uid(), 'owner');
  insert into entitlements (org_id, module_key, enabled) select new_org, key, true from modules on conflict do nothing;
  return new_org;
end; $$;


-- ===== 0014_notifications.sql =====
-- Phase 15: Notifications & Audit Log
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  entity_type text,
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "own notifications" on notifications for all using (auth.uid() = user_id);
create index notifications_user_unread on notifications (user_id, read_at) where read_at is null;

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid references auth.users(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "org members read audit" on audit_log for select using (is_org_member(org_id));
create index audit_log_entity_idx on audit_log (org_id, entity_type, entity_id);


-- ===== 0015_projects.sql =====
-- Phase 16: Projects & Timesheet
create table projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  client_id   uuid references contacts(id) on delete set null,
  budget      numeric(12,2),
  deadline    date,
  status      text not null default 'active' check (status in ('active','on_hold','completed','cancelled')),
  description text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  assignee_id uuid references auth.users(id),
  due_date    date,
  status      text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table time_entries (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  task_id     uuid references tasks(id) on delete set null,
  user_id     uuid references auth.users(id),
  date        date not null,
  minutes     int not null check (minutes > 0),
  description text,
  billable    boolean not null default true,
  billed      boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table projects enable row level security;
alter table tasks enable row level security;
alter table time_entries enable row level security;
create policy "org members" on projects for all using (is_org_member(org_id));
create policy "org members" on tasks for all using (is_org_member(org_id));
create policy "org members" on time_entries for all using (is_org_member(org_id));

insert into modules (key, name) values ('projects', 'Projects') on conflict do nothing;
insert into entitlements (org_id, module_key, enabled)
  select id, 'projects', true from organizations on conflict do nothing;


-- ===== 0016_expenses.sql =====
-- Phase 17: Expense Management
create table expense_categories (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  account_code text,
  created_at   timestamptz not null default now()
);

create table expense_claims (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  user_id      uuid references auth.users(id),
  category_id  uuid references expense_categories(id) on delete set null,
  date         date not null,
  amount       numeric(12,2) not null,
  description  text not null,
  status       text not null default 'draft' check (status in ('draft','submitted','approved','rejected','reimbursed')),
  receipt_path text,
  notes        text,
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table expense_categories enable row level security;
alter table expense_claims enable row level security;
create policy "org members" on expense_categories for all using (is_org_member(org_id));
create policy "org members" on expense_claims for all using (is_org_member(org_id));

-- Seed default categories
create or replace function seed_expense_categories(p_org_id uuid) returns void language plpgsql as $$
begin
  insert into expense_categories (org_id, name, account_code) values
    (p_org_id, 'Travel', 'EXP-TRV'),
    (p_org_id, 'Food & Entertainment', 'EXP-FNE'),
    (p_org_id, 'Office Supplies', 'EXP-OFC'),
    (p_org_id, 'Software & Subscriptions', 'EXP-SWS'),
    (p_org_id, 'Utilities', 'EXP-UTL'),
    (p_org_id, 'Miscellaneous', 'EXP-MSC')
  on conflict do nothing;
end; $$;

insert into modules (key, name) values ('expenses', 'Expenses') on conflict do nothing;
insert into entitlements (org_id, module_key, enabled)
  select id, 'expenses', true from organizations on conflict do nothing;


-- ===== 0017_currencies.sql =====
-- Phase 18: Multi-currency
create table currencies (
  code                text primary key,
  name                text not null,
  symbol              text not null,
  exchange_rate_to_inr numeric(12,4) not null default 1,
  updated_at          timestamptz not null default now()
);

insert into currencies (code, name, symbol, exchange_rate_to_inr) values
  ('INR', 'Indian Rupee',       'â‚¹',    1.0),
  ('USD', 'US Dollar',          '$',    84.0),
  ('EUR', 'Euro',               'â‚¬',    91.0),
  ('GBP', 'British Pound',      'Â£',   107.0),
  ('AED', 'UAE Dirham',         'Ø¯.Ø¥',  22.9),
  ('SGD', 'Singapore Dollar',   'S$',   62.5),
  ('AUD', 'Australian Dollar',  'A$',   54.0),
  ('CAD', 'Canadian Dollar',    'C$',   61.5),
  ('JPY', 'Japanese Yen',       'Â¥',    0.56),
  ('CNY', 'Chinese Yuan',       'Â¥',    11.6)
on conflict do nothing;

alter table invoices
  add column if not exists currency_code text references currencies(code) default 'INR',
  add column if not exists exchange_rate  numeric(12,4) default 1,
  add column if not exists total_inr      numeric(12,2);

create table org_currency_settings (
  org_id           uuid primary key references organizations(id) on delete cascade,
  default_currency text not null references currencies(code) default 'INR',
  updated_at       timestamptz not null default now()
);
alter table org_currency_settings enable row level security;
create policy "org members" on org_currency_settings for all using (is_org_member(org_id));


-- ===== 0018_api_keys.sql =====
-- Phase 19: API Keys & Webhooks
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,
  key_hash     text not null unique,
  created_by   uuid references auth.users(id),
  last_used_at timestamptz,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table api_keys enable row level security;
create policy "org members" on api_keys for all using (is_org_member(org_id));

create table webhooks (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  url        text not null,
  events     text[] not null default '{}',
  secret     text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table webhooks enable row level security;
create policy "org members" on webhooks for all using (is_org_member(org_id));


-- ===== 0019_admin_plans.sql =====
-- Phase 20: Admin â€” org subscription plans (platform-level, managed by SaaS operator)
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


-- ===== 0020_onboarding.sql =====
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


-- ===== 0021_platform_billing.sql =====
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


-- ===== 0022_modules_sync.sql =====
-- Phase 21 fix: sync the module catalog with the app MODULES registry.
-- The catalog was missing 'purchase' and 'accounting', which breaks the
-- entitlements FK (entitlements.module_key -> modules.key) when seeding presets.
insert into modules (key, name, description) values
  ('purchase',   'Purchase Orders',  'Vendor purchase orders, GRN, vendor bills'),
  ('accounting', 'GST & Accounting', 'GSTR-1/3B filing, GST settings, HSN codes')
on conflict (key) do nothing;

-- Backfill: existing orgs keep full access (they had all modules before DB gating).
-- New orgs created after this point receive presets via the onboarding flow.
insert into entitlements (org_id, module_key, enabled)
select o.id, m.key, true
from organizations o cross join modules m
on conflict (org_id, module_key) do nothing;


-- ===== 0023_startup_os.sql =====
-- Phase 22: Startup Operating System
-- Docs, Tasks & Sprints, Goals/OKRs, Meetings, Issues, Releases, Decisions,
-- Daily Check-ins, Product Feature pipeline. All tenant-scoped with RLS.

-- â”€â”€ Docs / Knowledge Base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists docs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  parent_id   uuid references docs(id) on delete cascade,
  title       text not null default 'Untitled',
  content     text default '',
  doc_type    text not null default 'doc',          -- doc/prd/sop/meeting/api/onboarding/vision/roadmap/postmortem
  icon        text default 'ðŸ“„',
  status      text not null default 'draft' check (status in ('draft','published','archived')),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists doc_versions (
  id         uuid primary key default gen_random_uuid(),
  doc_id     uuid not null references docs(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  title      text,
  content    text,
  edited_by  uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- â”€â”€ Sprints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists sprints (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,
  goal       text,
  start_date date,
  end_date   date,
  status     text not null default 'planned' check (status in ('planned','active','completed')),
  created_at timestamptz not null default now()
);

-- â”€â”€ Product feature pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists features (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  title       text not null,
  description text,
  owner_id    uuid references auth.users(id),
  stage       text not null default 'idea'
                check (stage in ('idea','research','prd','design','dev','qa','launch','feedback')),
  prd_doc_id  uuid references docs(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- â”€â”€ Goals / OKRs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  parent_id   uuid references goals(id) on delete cascade,
  title       text not null,
  description text,
  owner_id    uuid references auth.users(id),
  level       text not null default 'company' check (level in ('company','team','individual')),
  quarter     text,
  progress    int  not null default 0 check (progress between 0 and 100),
  status      text not null default 'on_track' check (status in ('on_track','at_risk','off_track','done')),
  created_at  timestamptz not null default now()
);

create table if not exists key_results (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references goals(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  title      text not null,
  target     numeric(14,2) not null default 100,
  current    numeric(14,2) not null default 0,
  unit       text,
  created_at timestamptz not null default now()
);

-- â”€â”€ Meetings + action items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists meetings (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  title        text not null,
  meeting_date date not null default current_date,
  agenda       text,
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create table if not exists action_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  meeting_id  uuid not null references meetings(id) on delete cascade,
  text        text not null,
  assignee_id uuid references auth.users(id),
  task_id     uuid,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- â”€â”€ Issue / bug tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists issues (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  title       text not null,
  description text,
  severity    text not null default 'medium' check (severity in ('critical','high','medium','low')),
  status      text not null default 'open'   check (status in ('open','in_progress','resolved','closed')),
  module      text,
  assignee_id uuid references auth.users(id),
  reporter_id uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- â”€â”€ Releases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists releases (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  version     text not null,
  title       text,
  notes       text,
  status      text not null default 'planned' check (status in ('planned','released','rolled_back')),
  released_at date,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- â”€â”€ Decision log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists decisions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  title        text not null,
  context      text,
  decision     text,
  alternatives text,
  owner_id     uuid references auth.users(id),
  decided_on   date not null default current_date,
  created_at   timestamptz not null default now()
);

-- â”€â”€ Daily check-ins (accountability) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists checkins (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  user_id      uuid not null references auth.users(id),
  checkin_date date not null default current_date,
  yesterday    text,
  today        text,
  blockers     text,
  created_at   timestamptz not null default now(),
  unique (org_id, user_id, checkin_date)
);

-- â”€â”€ Extend tasks into full work items (shared with Projects module) â”€â”€
alter table tasks alter column project_id drop not null;
alter table tasks add column if not exists sprint_id   uuid references sprints(id)  on delete set null;
alter table tasks add column if not exists feature_id  uuid references features(id) on delete set null;
alter table tasks add column if not exists reporter_id uuid references auth.users(id);
alter table tasks add column if not exists priority    text not null default 'medium';
alter table tasks add column if not exists labels      text[] default '{}';
alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks add  constraint tasks_priority_check check (priority in ('low','medium','high','urgent'));
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add  constraint tasks_status_check
  check (status in ('backlog','todo','in_progress','review','done','blocked'));

-- link meeting action items to the task they generate
alter table action_items drop constraint if exists action_items_task_fk;
alter table action_items add  constraint action_items_task_fk
  foreign key (task_id) references tasks(id) on delete set null;

-- â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table docs          enable row level security;
alter table doc_versions  enable row level security;
alter table sprints       enable row level security;
alter table features      enable row level security;
alter table goals         enable row level security;
alter table key_results   enable row level security;
alter table meetings      enable row level security;
alter table action_items  enable row level security;
alter table issues        enable row level security;
alter table releases      enable row level security;
alter table decisions     enable row level security;
alter table checkins      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['docs','doc_versions','sprints','features','goals','key_results',
                           'meetings','action_items','issues','releases','decisions','checkins']
  loop
    execute format('drop policy if exists "org members" on %I;', t);
    execute format('create policy "org members" on %I for all using (is_org_member(org_id));', t);
  end loop;
end $$;

-- â”€â”€ Module catalog + grant to all existing orgs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
insert into modules (key, name, description) values
  ('docs',      'Docs & Knowledge Base', 'Nested pages, templates (PRD/SOP), version history'),
  ('tasks',     'Tasks & Sprints',       'Kanban/sprint board, assignees, priorities'),
  ('goals',     'Goals & OKRs',          'Company â†’ team â†’ individual objectives'),
  ('meetings',  'Meetings',              'Agenda, notes, action items â†’ tasks'),
  ('issues',    'Issues & Bugs',         'Severity, status, assignment'),
  ('releases',  'Releases',              'Version log, ship notes, rollback'),
  ('decisions', 'Decision Log',          'Why decisions were made'),
  ('checkins',  'Daily Check-ins',       'Standups + accountability'),
  ('features',  'Product Pipeline',      'Idea â†’ Research â†’ PRD â†’ Dev â†’ Launch'),
  ('assistant', 'AI Assistant',          'Ask questions across your workspace')
on conflict (key) do nothing;

insert into entitlements (org_id, module_key, enabled)
select o.id, m.key, true
from organizations o
cross join (values ('docs'),('tasks'),('goals'),('meetings'),('issues'),
                   ('releases'),('decisions'),('checkins'),('features'),('assistant')) as m(key)
on conflict (org_id, module_key) do nothing;


-- ===== 0024_more_roles.sql =====
-- Phase 23: expand the role set companies can assign.
-- Widen the role CHECK constraints on memberships and org_invites.

do $$
declare
  roles text := $r$'owner','admin','manager','accountant','hr','sales','marketing','developer','designer','support','operations','cashier','staff','viewer'$r$;
begin
  execute 'alter table memberships drop constraint if exists memberships_role_check';
  execute format('alter table memberships add constraint memberships_role_check check (role in (%s))', roles);

  execute 'alter table org_invites drop constraint if exists org_invites_role_check';
  execute format('alter table org_invites add constraint org_invites_role_check check (role in (%s))', roles);
end $$;


-- ===== 0025_product_barcode.sql =====
-- Phase 24: product barcodes (for POS scanning + printable labels)
alter table products add column if not exists barcode text;
create index if not exists products_barcode_idx on products (org_id, barcode);


-- ===== 0026_rls_by_role.sql =====
-- Phase 25: RLS role enforcement (real, DB-level access control by role).
-- Replaces the permissive "any org member" policies on tenant tables with
-- role-aware policies. Owner/Admin/Manager always have full access (safety net),
-- so an org owner can never lock themselves out.

-- 1. Role â†’ module mapping (mirrors ROLE_MODULES in src/lib/types/roles.ts).
create table if not exists role_modules (
  role       text not null,
  module_key text not null,
  primary key (role, module_key)
);

insert into role_modules (role, module_key) values
  ('accountant','billing'),('accountant','payments'),('accountant','accounting'),('accountant','reports'),('accountant','expenses'),('accountant','purchase'),('accountant','subscriptions'),('accountant','import'),('accountant','docs'),('accountant','tasks'),('accountant','checkins'),('accountant','decisions'),('accountant','assistant'),
  ('hr','hr'),('hr','reports'),('hr','expenses'),('hr','import'),('hr','docs'),('hr','tasks'),('hr','goals'),('hr','meetings'),('hr','checkins'),('hr','decisions'),('hr','assistant'),
  ('sales','crm'),('sales','billing'),('sales','payments'),('sales','pos'),('sales','subscriptions'),('sales','reports'),('sales','docs'),('sales','tasks'),('sales','meetings'),('sales','checkins'),('sales','assistant'),
  ('marketing','crm'),('marketing','reports'),('marketing','docs'),('marketing','tasks'),('marketing','goals'),('marketing','meetings'),('marketing','checkins'),('marketing','assistant'),
  ('developer','projects'),('developer','tasks'),('developer','issues'),('developer','features'),('developer','releases'),('developer','docs'),('developer','decisions'),('developer','checkins'),('developer','assistant'),
  ('designer','projects'),('designer','tasks'),('designer','features'),('designer','docs'),('designer','meetings'),('designer','checkins'),('designer','assistant'),
  ('support','crm'),('support','issues'),('support','docs'),('support','tasks'),('support','checkins'),('support','assistant'),
  ('operations','inventory'),('operations','purchase'),('operations','pos'),('operations','projects'),('operations','reports'),('operations','tasks'),('operations','checkins'),('operations','assistant'),
  ('cashier','pos'),('cashier','inventory'),('cashier','checkins'),
  ('staff','pos'),('staff','inventory'),('staff','projects'),('staff','tasks'),('staff','issues'),('staff','features'),('staff','docs'),('staff','meetings'),('staff','checkins'),('staff','assistant'),
  ('viewer','reports'),('viewer','docs')
on conflict do nothing;

alter table role_modules enable row level security;
drop policy if exists role_modules_read on role_modules;
create policy role_modules_read on role_modules for select to authenticated using (true);

-- 2. Helper: does the current user's role allow this module in this org?
create or replace function has_module_access(p_org_id uuid, p_module text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from memberships m
    where m.org_id = p_org_id and m.user_id = auth.uid()
      and ( m.role in ('owner','admin','manager')
         or exists (select 1 from role_modules rm where rm.role = m.role and rm.module_key = p_module) )
  );
$$;

-- 3. Replace policies on each tenant table with a role-aware one.
--    Drops ALL existing policies on the table first so no permissive policy lingers.
do $$
declare r record; pol record;
begin
  for r in select * from (values
    ('invoices','billing'),('invoice_items','billing'),('payments','billing'),('accounting_settings','accounting'),
    ('products','inventory'),('stock_movements','inventory'),
    ('pos_sessions','pos'),('pos_orders','pos'),('pos_order_lines','pos'),
    ('contacts','crm'),('deals','crm'),
    ('employees','hr'),('attendance','hr'),('payroll_runs','hr'),('payroll_entries','hr'),('statutory_settings','hr'),
    ('subscription_plans','subscriptions'),('customer_subscriptions','subscriptions'),
    ('projects','projects'),('time_entries','projects'),
    ('expense_categories','expenses'),('expense_claims','expenses'),
    ('docs','docs'),('doc_versions','docs'),
    ('tasks','tasks'),('sprints','tasks'),
    ('goals','goals'),('key_results','goals'),
    ('meetings','meetings'),('action_items','meetings'),
    ('issues','issues'),('releases','releases'),('decisions','decisions'),
    ('checkins','checkins'),('features','features')
  ) as t(tbl, module)
  loop
    -- skip tables that don't exist in this database
    if to_regclass('public.' || r.tbl) is null then continue; end if;
    for pol in select policyname from pg_policies where schemaname='public' and tablename=r.tbl loop
      execute format('drop policy %I on %I;', pol.policyname, r.tbl);
    end loop;
    execute format(
      'create policy "role access" on %I for all using (has_module_access(org_id, %L)) with check (has_module_access(org_id, %L));',
      r.tbl, r.module, r.module
    );
  end loop;
end $$;


-- ===== 0027_credit_ledger.sql =====
-- Phase 26: Customer credit ledger ("party ledger" / udhaar)
-- Every credit given or payment received is a signed entry:
--   amount > 0  â†’ customer owes more (credit/sale given)
--   amount < 0  â†’ customer paid (receivable reduced)
-- A customer's balance = sum(amount). Positive = receivable (they owe us).

create table if not exists ledger_entries (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  contact_id     uuid not null references contacts(id) on delete cascade,
  entry_date     date not null default current_date,
  type           text not null default 'credit' check (type in ('credit','payment','opening','adjustment')),
  amount         numeric(14,2) not null,        -- signed (see note above)
  note           text,
  reference_type text,                           -- e.g. 'invoice','payment'
  reference_id   uuid,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists ledger_entries_contact_idx on ledger_entries (org_id, contact_id, entry_date);

alter table ledger_entries enable row level security;
drop policy if exists "org members" on ledger_entries;
create policy "org members" on ledger_entries for all using (is_org_member(org_id));

-- Optional per-customer credit limit
alter table contacts add column if not exists credit_limit numeric(14,2);

-- Register the module + grant to existing orgs
insert into modules (key, name, description) values
  ('ledger', 'Credit & Ledger', 'Customer credit (udhaar), payments, per-party ledger & receivables')
on conflict (key) do nothing;

insert into entitlements (org_id, module_key, enabled)
select id, 'ledger', true from organizations
on conflict (org_id, module_key) do nothing;


-- ===== 0028_invoice_customer_link.sql =====
-- Phase 26b: link invoices to a CRM contact so they can post to the party ledger.
alter table invoices add column if not exists customer_id uuid references contacts(id) on delete set null;
create index if not exists invoices_customer_idx on invoices (org_id, customer_id);


-- ===== 0029_payment_methods.sql =====
-- 0029_payment_methods.sql
-- Widen the payments.method CHECK constraint to support card payments and
-- "credit / udhaar" (a sale recorded on the customer's account, not received).
-- Credit entries are NOT marked as completed receipts â€” they keep the invoice
-- outstanding and drive the customer's credit ledger receivable instead.

alter table payments drop constraint if exists payments_method_check;

alter table payments
  add constraint payments_method_check
  check (method in ('cash','upi','card','bank_transfer','cheque','razorpay','credit'));


-- ===== 0030_invoicing_pro.sql =====
-- =====================================================================
-- 0030_invoicing_pro.sql  â€”  Professional invoicing overhaul (section A)
-- Run in Supabase SQL Editor after 0029_payment_methods.sql
--
-- Adds: document types (quotation / proforma / delivery challan / credit
-- note) on the invoices table, line + bill discounts, round-off, partial
-- payment tracking (amount_paid), multi-currency, terms, source-document
-- links, org invoice settings (bank / UPI / logo / T&C), recurring
-- invoices, and a generalized document-number generator.
-- =====================================================================

-- ----- Invoice header: new columns -----------------------------------
alter table invoices
  add column if not exists doc_type        text not null default 'invoice'
    check (doc_type in ('invoice','quotation','proforma','delivery_challan','credit_note')),
  add column if not exists currency         text not null default 'INR',
  add column if not exists exchange_rate    numeric(14,6) not null default 1,
  add column if not exists discount_type    text check (discount_type in ('percent','amount')),
  add column if not exists discount_value   numeric(12,2) not null default 0,
  add column if not exists discount_amount  numeric(12,2) not null default 0,
  add column if not exists round_off        numeric(12,2) not null default 0,
  add column if not exists amount_paid       numeric(12,2) not null default 0,
  add column if not exists terms             text,
  add column if not exists reference_no      text,
  add column if not exists source_doc_id     uuid references invoices(id) on delete set null;

create index if not exists invoices_doc_type_idx on invoices (org_id, doc_type, created_at desc);

-- ----- Invoice line items: per-line discount -------------------------
alter table invoice_items
  add column if not exists discount_type   text check (discount_type in ('percent','amount')),
  add column if not exists discount_value  numeric(12,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0;

-- ----- Generalized document numbering --------------------------------
-- INV- / QUO- / PI- / DC- / CN- per org per calendar year.
create or replace function next_document_number(p_org_id uuid, p_doc_type text)
returns text language plpgsql security definer stable as $$
declare
  seq      integer;
  year_str text;
  prefix   text;
begin
  year_str := to_char(now(), 'YYYY');
  prefix := case p_doc_type
    when 'quotation'        then 'QUO'
    when 'proforma'         then 'PI'
    when 'delivery_challan' then 'DC'
    when 'credit_note'      then 'CN'
    else 'INV'
  end;

  select coalesce(
    max(
      case when invoice_number ~ ('^' || prefix || '-' || year_str || '-[0-9]+$')
      then cast(regexp_replace(invoice_number, '^' || prefix || '-[0-9]{4}-', '') as integer)
      else null end
    ), 0
  ) + 1
  into seq
  from invoices
  where org_id = p_org_id
    and coalesce(doc_type, 'invoice') = p_doc_type;

  return prefix || '-' || year_str || '-' || lpad(seq::text, 4, '0');
end; $$;

grant execute on function next_document_number(uuid, text) to authenticated;

-- ----- Org invoice settings (bank / UPI / logo / T&C) ----------------
create table if not exists org_invoice_settings (
  org_id           uuid primary key references organizations(id) on delete cascade,
  bank_name        text,
  account_name     text,
  account_number   text,
  ifsc             text,
  branch           text,
  upi_id           text,
  logo_url         text,
  signature_url    text,
  default_terms    text,
  default_notes    text,
  default_due_days integer not null default 0,
  show_bank        boolean not null default true,
  show_upi_qr      boolean not null default true,
  enable_round_off boolean not null default true,
  updated_at       timestamptz not null default now()
);

alter table org_invoice_settings enable row level security;

drop policy if exists ois_sel on org_invoice_settings;
create policy ois_sel on org_invoice_settings for select using (is_org_member(org_id));
drop policy if exists ois_ins on org_invoice_settings;
create policy ois_ins on org_invoice_settings for insert with check (is_org_member(org_id));
drop policy if exists ois_upd on org_invoice_settings;
create policy ois_upd on org_invoice_settings for update using (is_org_member(org_id));

-- ----- Recurring invoices --------------------------------------------
create table if not exists recurring_invoices (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  title            text,
  customer_id      uuid references contacts(id) on delete set null,
  customer_name    text not null,
  customer_email   text,
  customer_gstin   text,
  billing_address  text,
  place_of_supply  text,
  currency         text not null default 'INR',
  notes            text,
  terms            text,
  discount_type    text check (discount_type in ('percent','amount')),
  discount_value   numeric(12,2) not null default 0,
  items            jsonb not null default '[]'::jsonb,
  frequency        text not null default 'monthly'
                   check (frequency in ('daily','weekly','monthly','quarterly','yearly')),
  interval_count   integer not null default 1,
  start_date       date not null default current_date,
  next_run_date    date not null default current_date,
  end_date         date,
  last_run_date    date,
  status           text not null default 'active'
                   check (status in ('active','paused','ended')),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists recurring_due_idx on recurring_invoices (status, next_run_date);

alter table recurring_invoices enable row level security;

drop policy if exists ri_sel on recurring_invoices;
create policy ri_sel on recurring_invoices for select using (is_org_member(org_id));
drop policy if exists ri_ins on recurring_invoices;
create policy ri_ins on recurring_invoices for insert with check (is_org_member(org_id));
drop policy if exists ri_upd on recurring_invoices;
create policy ri_upd on recurring_invoices for update using (is_org_member(org_id));
drop policy if exists ri_del on recurring_invoices;
create policy ri_del on recurring_invoices for delete using (is_org_member(org_id));

drop trigger if exists recurring_invoices_updated_at on recurring_invoices;
create trigger recurring_invoices_updated_at
  before update on recurring_invoices
  for each row execute function update_updated_at();


-- ===== 0031_payments_pro.sql =====
-- =====================================================================
-- 0031_payments_pro.sql â€” Section B: Payments & Receivables
-- Run in Supabase SQL Editor after 0030_invoicing_pro.sql
--
-- Adds: 'partial' + 'refunded' invoice statuses, advance payments with
-- contact picker, refund tracking, multi-invoice payment allocations,
-- and overdue reminder timestamp.
-- =====================================================================

-- ----- Widen invoice status to include partial + refunded -------------
do $$ begin
  alter table invoices drop constraint invoices_status_check;
exception when undefined_object then null;
end $$;
alter table invoices add constraint invoices_status_check
  check (status in ('draft','sent','partial','paid','refunded','cancelled'));

-- ----- Overdue reminder tracking -------------------------------------
alter table invoices
  add column if not exists last_reminder_sent_at timestamptz;

-- ----- Extend payments table -----------------------------------------
alter table payments
  add column if not exists contact_id          uuid references contacts(id) on delete set null,
  add column if not exists payment_type        text not null default 'invoice'
    check (payment_type in ('invoice','advance','refund')),
  add column if not exists refund_of_payment_id uuid references payments(id) on delete set null;

-- ----- Multi-invoice payment allocations -----------------------------
create table if not exists payment_allocations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  payment_id  uuid not null references payments(id) on delete cascade,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  created_at  timestamptz not null default now(),
  unique (payment_id, invoice_id)
);

create index if not exists pa_invoice_idx on payment_allocations (org_id, invoice_id);
create index if not exists pa_payment_idx on payment_allocations (payment_id);

alter table payment_allocations enable row level security;

drop policy if exists pa_sel on payment_allocations;
create policy pa_sel on payment_allocations for select using (is_org_member(org_id));
drop policy if exists pa_ins on payment_allocations;
create policy pa_ins on payment_allocations for insert with check (is_org_member(org_id));
drop policy if exists pa_del on payment_allocations;
create policy pa_del on payment_allocations for delete using (is_org_member(org_id));


-- ===== 0032_inventory_pro.sql =====
-- =====================================================================
-- 0032_inventory_pro.sql â€” Section C: Inventory / Products overhaul
-- Run in Supabase SQL Editor after 0031_payments_pro.sql
--
-- Adds: cost price, category, brand, tax-inclusive flag, reorder qty,
-- HSN code to products; product_batches table for batch/expiry tracking.
-- =====================================================================

-- ----- Extend products table -----------------------------------------
alter table products
  add column if not exists cost_price     numeric(12,2) not null default 0,
  add column if not exists category       text,
  add column if not exists brand          text,
  add column if not exists tax_inclusive  boolean not null default false,
  add column if not exists reorder_qty    numeric(12,3) not null default 0,
  add column if not exists hsn_code       text;

create index if not exists products_category_idx on products (org_id, category);

-- ----- Product batches (batch / lot / expiry tracking) ---------------
create table if not exists product_batches (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  batch_no      text not null,
  expiry_date   date,
  qty           numeric(12,3) not null default 0,
  cost_price    numeric(12,2),
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists pb_product_idx  on product_batches (product_id);
create index if not exists pb_expiry_idx   on product_batches (org_id, expiry_date) where expiry_date is not null;

alter table product_batches enable row level security;

drop policy if exists pb_sel on product_batches;
create policy pb_sel on product_batches for select using (is_org_member(org_id));
drop policy if exists pb_ins on product_batches;
create policy pb_ins on product_batches for insert with check (is_org_member(org_id));
drop policy if exists pb_upd on product_batches;
create policy pb_upd on product_batches for update using (is_org_member(org_id));
drop policy if exists pb_del on product_batches;
create policy pb_del on product_batches for delete using (is_org_member(org_id));


-- ===== 0033_pos_pro.sql =====
-- =====================================================================
-- 0033_pos_pro.sql â€” Section D: POS overhaul
-- Run in Supabase SQL Editor after 0032_inventory_pro.sql
--
-- Adds: order_type (sale/refund), customer link, bill + line discounts,
-- split tender, variance reason on sessions, and cash in/out movements.
-- =====================================================================

-- ----- Widen payment_method to include 'split' -----------------------
do $$ begin
  alter table pos_orders drop constraint pos_orders_payment_method_check;
exception when undefined_object then null;
end $$;
alter table pos_orders add constraint pos_orders_payment_method_check
  check (payment_method in ('cash','upi','card','split'));

-- ----- Extend pos_orders ---------------------------------------------
alter table pos_orders
  add column if not exists order_type           text not null default 'sale'
    check (order_type in ('sale','refund')),
  add column if not exists customer_id          uuid references contacts(id) on delete set null,
  add column if not exists discount_type        text check (discount_type in ('percent','flat')),
  add column if not exists discount_value       numeric(12,2) not null default 0,
  add column if not exists discount_amount      numeric(12,2) not null default 0,
  add column if not exists split_tenders        jsonb,
  add column if not exists refund_of_order_id   uuid references pos_orders(id) on delete set null;

-- ----- Per-line discount on pos_order_lines --------------------------
alter table pos_order_lines
  add column if not exists discount_pct    numeric(5,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0;

-- ----- Extend pos_sessions -------------------------------------------
alter table pos_sessions
  add column if not exists variance_reason text,
  add column if not exists notes           text;

-- ----- Cash in/out movements -----------------------------------------
create table if not exists pos_cash_movements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  session_id  uuid not null references pos_sessions(id) on delete cascade,
  type        text not null check (type in ('in','out')),
  amount      numeric(12,2) not null check (amount > 0),
  reason      text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index if not exists pcm_session_idx on pos_cash_movements (session_id);

alter table pos_cash_movements enable row level security;

drop policy if exists pcm_sel on pos_cash_movements;
create policy pcm_sel on pos_cash_movements for select using (is_org_member(org_id));
drop policy if exists pcm_ins on pos_cash_movements;
create policy pcm_ins on pos_cash_movements for insert with check (is_org_member(org_id));


-- ===== 0034_pos_all_orgs.sql =====
-- 0034_pos_all_orgs.sql
-- Grant POS entitlement to all existing orgs that don't already have it.
-- New orgs receive it from the updated presets in modules.ts.
insert into entitlements (org_id, module_key, enabled)
select o.id, 'pos', true
from organizations o
where not exists (
  select 1 from entitlements e where e.org_id = o.id and e.module_key = 'pos'
)
on conflict (org_id, module_key) do update set enabled = true;

-- ===== 0035_purchase_pro.sql =====
-- =====================================================================
-- Phase: Purchases Pro â€” purchase returns (debit notes), vendor advances,
-- landed costs
-- Run in Supabase SQL Editor
-- =====================================================================

-- ----- Purchase Returns (Debit Notes) --------------------------------
create table if not exists purchase_returns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  po_id         uuid references purchase_orders(id) on delete set null,
  return_number text not null,
  vendor_name   text not null,
  return_date   date not null default current_date,
  reason        text,
  notes         text,
  status        text not null default 'draft'
                check (status in ('draft','sent','completed')),
  subtotal      numeric(14,2) not null default 0,
  gst_amount    numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  unique (org_id, return_number)
);

create table if not exists purchase_return_lines (
  id          uuid primary key default gen_random_uuid(),
  return_id   uuid not null references purchase_returns(id) on delete cascade,
  po_line_id  uuid references po_lines(id) on delete set null,
  product_id  uuid references products(id) on delete set null,
  description text not null,
  quantity    numeric(12,3) not null,
  unit_price  numeric(14,2) not null,
  gst_rate    numeric(5,2) not null default 0,
  amount      numeric(14,2) not null
);

-- ----- Vendor Advances -----------------------------------------------
create table if not exists vendor_advances (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  vendor_name      text not null,
  vendor_id        uuid references contacts(id) on delete set null,
  amount           numeric(14,2) not null,
  method           text not null default 'bank_transfer'
                   check (method in ('cash','upi','card','bank_transfer','cheque')),
  reference_number text,
  advance_date     date not null default current_date,
  notes            text,
  status           text not null default 'paid'
                   check (status in ('paid','adjusted','refunded')),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

-- ----- Landed Costs --------------------------------------------------
create table if not exists landed_costs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  grn_id      uuid references goods_receipt_notes(id) on delete cascade,
  po_id       uuid references purchase_orders(id) on delete set null,
  cost_type   text not null
              check (cost_type in ('freight','duty','customs','insurance','other')),
  amount      numeric(14,2) not null,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ----- Return number generator ---------------------------------------
create or replace function next_return_number(p_org_id uuid)
returns text language plpgsql security definer as $$
declare
  yr text := to_char(current_date, 'YYYY');
  n  int;
begin
  select coalesce(
    max(case when return_number ~ ('^DR-' || yr || '-[0-9]+$')
        then cast(regexp_replace(return_number, '^DR-[0-9]{4}-', '') as int)
        else null end), 0
  ) + 1 into n
  from purchase_returns where org_id = p_org_id;
  return 'DR-' || yr || '-' || lpad(n::text, 4, '0');
end; $$;

grant execute on function next_return_number(uuid) to authenticated;

-- ----- RLS -----------------------------------------------------------
alter table purchase_returns      enable row level security;
alter table purchase_return_lines enable row level security;
alter table vendor_advances       enable row level security;
alter table landed_costs          enable row level security;

create policy pr_sel  on purchase_returns for select using (is_org_member(org_id));
create policy pr_ins  on purchase_returns for insert with check (is_org_member(org_id));
create policy pr_upd  on purchase_returns for update using (is_org_member(org_id));

create policy prl_sel on purchase_return_lines for select
  using (exists (select 1 from purchase_returns r where r.id = return_id and is_org_member(r.org_id)));
create policy prl_ins on purchase_return_lines for insert
  with check (exists (select 1 from purchase_returns r where r.id = return_id and is_org_member(r.org_id)));

create policy va_sel  on vendor_advances for select using (is_org_member(org_id));
create policy va_ins  on vendor_advances for insert with check (is_org_member(org_id));
create policy va_upd  on vendor_advances for update using (is_org_member(org_id));

create policy lc_sel  on landed_costs for select using (is_org_member(org_id));
create policy lc_ins  on landed_costs for insert with check (is_org_member(org_id));


-- ===== 0036_crm_pro.sql =====
-- =====================================================================
-- Phase: CRM Pro â€” activity timeline, lead source, opening balance
-- Run in Supabase SQL Editor after 0035
-- =====================================================================

-- Add columns to contacts (tags already exists from 0004)
alter table contacts add column if not exists lead_source      text;
alter table contacts add column if not exists opening_balance  numeric(14,2) not null default 0;

-- ----- Contact Activities (timeline + reminders) ---------------------
create table if not exists contact_activities (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  contact_id   uuid not null references contacts(id) on delete cascade,
  type         text not null
               check (type in ('note','call','email','whatsapp','meeting','task')),
  body         text not null,
  due_date     timestamptz,
  completed_at timestamptz,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists ca_contact_idx on contact_activities (org_id, contact_id, created_at desc);

alter table contact_activities enable row level security;

create policy ca_sel on contact_activities for select using (is_org_member(org_id));
create policy ca_ins on contact_activities for insert with check (is_org_member(org_id));
create policy ca_upd on contact_activities for update using (is_org_member(org_id));
create policy ca_del on contact_activities for delete using (is_org_member(org_id));
 

-- ===== 0037_hr_pro.sql =====
-- =====================================================================
-- HR Pro: leave management, holiday calendar, punch times, overtime,
--         employee loans, expenseâ†’payroll reimbursement
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


-- ===== 0038_accounting_core.sql =====
-- Phase 38: Double-entry accounting core
-- Chart of Accounts, Journal Entries, TDS tracking

create table if not exists chart_of_accounts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  code       text not null,
  name       text not null,
  type       text not null check (type in ('asset','liability','equity','income','expense')),
  sub_type   text,
  is_system  boolean not null default false,
  parent_id  uuid references chart_of_accounts(id),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists journal_entries (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  entry_date   date not null default current_date,
  reference    text,
  narration    text,
  auto_posted  boolean not null default false,
  source_type  text, -- 'invoice','payment','purchase','expense'
  source_id    uuid,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create table if not exists journal_entry_lines (
  id          uuid primary key default gen_random_uuid(),
  journal_id  uuid not null references journal_entries(id) on delete cascade,
  account_id  uuid not null references chart_of_accounts(id),
  debit       numeric(14,2) not null default 0,
  credit      numeric(14,2) not null default 0,
  description text,
  created_at  timestamptz not null default now(),
  constraint jel_nonzero check (debit >= 0 and credit >= 0 and (debit > 0 or credit > 0))
);

create table if not exists tds_entries (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  entry_date     date not null default current_date,
  party_name     text not null,
  section        text not null default '194J',
  gross_amount   numeric(14,2) not null,
  tds_rate       numeric(5,2) not null default 10,
  tds_amount     numeric(14,2) not null,
  type           text not null default 'payable' check (type in ('payable','receivable')),
  status         text not null default 'pending' check (status in ('pending','deposited')),
  challan_no     text,
  deposited_date date,
  notes          text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists coa_org_idx    on chart_of_accounts (org_id);
create index if not exists je_org_date    on journal_entries (org_id, entry_date);
create index if not exists jel_journal    on journal_entry_lines (journal_id);
create index if not exists jel_account    on journal_entry_lines (account_id);
create index if not exists tds_org_date   on tds_entries (org_id, entry_date);

alter table chart_of_accounts  enable row level security;
alter table journal_entries     enable row level security;
alter table journal_entry_lines enable row level security;
alter table tds_entries         enable row level security;

drop policy if exists "org members" on chart_of_accounts;
drop policy if exists "org members" on journal_entries;
drop policy if exists "org members" on journal_entry_lines;
drop policy if exists "org members" on tds_entries;

create policy "org members" on chart_of_accounts  for all using (is_org_member(org_id));
create policy "org members" on journal_entries     for all using (is_org_member(org_id));
create policy "org members" on journal_entry_lines for all using (
  exists (select 1 from journal_entries je where je.id = journal_id and is_org_member(je.org_id))
);
create policy "org members" on tds_entries for all using (is_org_member(org_id));

-- Seed default Chart of Accounts for all existing orgs
insert into chart_of_accounts (org_id, code, name, type, sub_type, is_system)
select o.id, coa.code, coa.name, coa.type, coa.sub_type, true
from organizations o
cross join (values
  ('1000', 'Cash in Hand',           'asset',     'current_asset'),
  ('1010', 'Bank Account',           'asset',     'current_asset'),
  ('1100', 'Accounts Receivable',    'asset',     'current_asset'),
  ('1200', 'Inventory / Stock',      'asset',     'current_asset'),
  ('1300', 'Input GST (ITC)',        'asset',     'current_asset'),
  ('1400', 'TDS Receivable',         'asset',     'current_asset'),
  ('1500', 'Fixed Assets',           'asset',     'fixed_asset'),
  ('2000', 'Accounts Payable',       'liability', 'current_liability'),
  ('2100', 'Output GST Payable',     'liability', 'current_liability'),
  ('2200', 'TDS Payable',            'liability', 'current_liability'),
  ('2300', 'Salary Payable',         'liability', 'current_liability'),
  ('2400', 'PF & ESI Payable',       'liability', 'current_liability'),
  ('2500', 'Loans & Borrowings',     'liability', 'long_term_liability'),
  ('3000', 'Owner Capital',          'equity',    'capital'),
  ('3100', 'Retained Earnings',      'equity',    'retained'),
  ('4000', 'Sales Revenue',          'income',    'operating'),
  ('4100', 'Service Revenue',        'income',    'operating'),
  ('4200', 'Other Income',           'income',    'other'),
  ('5000', 'Cost of Goods Sold',     'expense',   'cogs'),
  ('5100', 'Salaries & Wages',       'expense',   'operating'),
  ('5200', 'Rent',                   'expense',   'operating'),
  ('5300', 'Office Expenses',        'expense',   'operating'),
  ('5400', 'Marketing & Advertising','expense',   'operating'),
  ('5500', 'Travel & Conveyance',    'expense',   'operating'),
  ('5600', 'Professional Fees',      'expense',   'operating'),
  ('5700', 'Bank Charges',           'expense',   'operating'),
  ('5800', 'Depreciation',           'expense',   'operating'),
  ('5900', 'Miscellaneous Expenses', 'expense',   'other')
) as coa(code, name, type, sub_type)
on conflict (org_id, code) do nothing;

-- Register financial_reports module and grant to all orgs
insert into modules (key, name, description) values
  ('financial_reports', 'Financial Reports', 'Trial Balance, P&L, Balance Sheet, Journal Entries, TDS Ledger')
on conflict (key) do nothing;

insert into entitlements (org_id, module_key, enabled)
select id, 'financial_reports', true from organizations
on conflict (org_id, module_key) do nothing;


-- ===== 0039_soft_delete.sql =====
-- Phase 39: Soft-delete (archive) support
-- archived_at being set = archived; null = active

alter table contacts  add column if not exists archived_at timestamptz;
alter table products  add column if not exists archived_at timestamptz;
alter table deals     add column if not exists archived_at timestamptz;

create index if not exists contacts_active_idx on contacts (org_id) where archived_at is null;
create index if not exists products_active_idx on products (org_id) where archived_at is null;
create index if not exists deals_active_idx    on deals    (org_id) where archived_at is null;


-- ===== 0040_departments_teams.sql =====
-- 0040_departments_teams.sql
-- Departments, teams, team memberships, comments (polymorphic),
-- job_title on memberships, expanded role set, and teams workspace module.

-- â”€â”€â”€ 1. DEPARTMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage departments"
  ON departments FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- â”€â”€â”€ 2. TEAMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  color         text NOT NULL DEFAULT '#0ea5e9',
  focus_area    text, -- e.g. 'engineering', 'sales', 'kitchen', 'design'
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage teams"
  ON teams FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- â”€â”€â”€ 3. TEAM MEMBERSHIPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS team_memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_lead    boolean NOT NULL DEFAULT false,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage team memberships"
  ON team_memberships FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- â”€â”€â”€ 4. COMMENTS (POLYMORPHIC) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- entity_type: 'invoice' | 'deal' | 'purchase_order' | 'task' | 'project' | 'expense_claim' etc.
CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  body        text NOT NULL,
  mentions    text[] NOT NULL DEFAULT '{}',  -- array of user_ids mentioned via @
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_entity ON comments(org_id, entity_type, entity_id);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage comments"
  ON comments FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- â”€â”€â”€ 5. EXTEND MEMBERSHIPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS job_title     text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- â”€â”€â”€ 6. EXPAND ROLE CONSTRAINT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Drop and recreate the role CHECK to include product-dev + sector-specific roles.
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (role IN (
  -- Core permission tiers
  'owner', 'admin', 'manager', 'staff', 'viewer',
  -- Functional / cross-industry roles
  'accountant', 'hr', 'sales', 'marketing',
  'developer', 'designer', 'support', 'operations', 'cashier',
  -- Product development (software + all sectors with R&D / product)
  'product_manager', 'qa', 'devops', 'data_analyst',
  'content_creator', 'customer_success', 'business_dev',
  -- Sector-specific operational roles
  'warehouse', 'procurement', 'chef', 'store_manager'
));

-- â”€â”€â”€ 7. REGISTER TEAMS MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO modules (key, name, description)
VALUES ('teams', 'Departments & Teams', 'Org structure, team workspaces, and @mentions')
ON CONFLICT (key) DO NOTHING;

-- Grant to all existing orgs
INSERT INTO entitlements (org_id, module_key, enabled)
SELECT id, 'teams', true FROM organizations
ON CONFLICT (org_id, module_key) DO UPDATE SET enabled = true;


-- ===== 0041_credit_limit.sql =====
-- 0041_credit_limit.sql
-- Adds credit_limit to contacts and stock_qty to products select (already exists).
-- credit_limit: optional cap on outstanding balance for this customer.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) DEFAULT NULL;


-- ===== 0042_archive_reminders.sql =====
-- 0042_archive_reminders.sql
-- Soft-delete for employees; reminder tracking on invoices.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_employees_active
  ON employees(org_id) WHERE archived_at IS NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;


-- ===== 0043_doc_settings_variants.sql =====
-- 0043_doc_settings_variants.sql
-- B6: per-org document number customization
-- D3: product variants (size / colour / flavour)

-- B6 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_doc_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doc_type    text NOT NULL,           -- invoice | purchase_order | quotation | credit_note
  prefix      text NOT NULL DEFAULT '', -- e.g. "INV" or "PO"
  start_number int  NOT NULL DEFAULT 1,
  fy_reset    boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, doc_type)
);
ALTER TABLE org_doc_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON org_doc_settings
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- D3 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        text NOT NULL,           -- e.g. "Red / Large"
  attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "color": "Red", "size": "L" }
  sku         text,
  price       numeric(12,2),           -- NULL = inherit from parent product
  stock_qty   numeric(12,3) NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON product_variants
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_org    ON product_variants(org_id);


-- ===== 0044_pos_tables_loyalty.sql =====
-- 0044_pos_tables_loyalty.sql
-- D8: POS table management
-- D11: Customer loyalty program

-- D8 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_tables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,            -- e.g. "Table 1", "Counter", "T3"
  status      text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied')),
  current_order_id uuid,                -- set when occupied (informational)
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE pos_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON pos_tables
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_pos_tables_org ON pos_tables(org_id);

-- D11 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  points          int  NOT NULL DEFAULT 0,
  lifetime_points int  NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (org_id, contact_id)
);
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON loyalty_accounts
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_loyalty_org     ON loyalty_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_contact ON loyalty_accounts(contact_id);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id     uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  points         int  NOT NULL,         -- positive = earn, negative = redeem
  type           text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  reference_id   uuid,                  -- pos_order.id or invoice.id
  reference_type text,                  -- 'pos_order' | 'invoice'
  notes          text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON loyalty_transactions
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_org     ON loyalty_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_contact ON loyalty_transactions(contact_id);

-- Org loyalty settings (earn rate + min redemption)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS loyalty_earn_rate  numeric(5,2) DEFAULT 1,   -- points per â‚¹10
  ADD COLUMN IF NOT EXISTS loyalty_redeem_rate numeric(5,2) DEFAULT 1;   -- â‚¹1 per point


-- ===== 0045_opening_balances_shifts.sql =====
-- 0045_opening_balances_shifts.sql
-- D5: Account opening balances + FY close
-- D13: Employee shift scheduling

-- D5 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_opening_balances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  fy          text NOT NULL,    -- e.g. "2024" (FY 2024-25 starts Apr 2024)
  amount      numeric(14,2) NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, account_id, fy)
);
ALTER TABLE account_opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON account_opening_balances
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- Track FY closures
CREATE TABLE IF NOT EXISTS fy_closures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fy              text NOT NULL,
  closed_at       timestamptz DEFAULT now(),
  closed_by       uuid,
  retained_earnings_amount numeric(14,2) DEFAULT 0,
  UNIQUE (org_id, fy)
);
ALTER TABLE fy_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON fy_closures
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- D13 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        date NOT NULL,
  start_time  time NOT NULL,      -- e.g. '09:00'
  end_time    time NOT NULL,      -- e.g. '17:00'
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, employee_id, date)   -- one shift per employee per day
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON shifts
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_shifts_org_date ON shifts(org_id, date);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);


-- ===== 0046_employee_self_service.sql =====
-- 0046_employee_self_service.sql
-- D14: Employee self-service portal token

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS self_service_token uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS self_service_enabled boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_self_service_token
  ON employees(self_service_token) WHERE self_service_token IS NOT NULL;


-- ===== 0047_bom_production.sql =====
-- 0047_bom_production.sql
-- D7: Bill of Materials + production orders

CREATE TABLE IF NOT EXISTS bill_of_materials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,  -- finished good / recipe
  component_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,  -- raw material / ingredient
  qty          numeric(12,3) NOT NULL DEFAULT 1,
  unit         text,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (org_id, product_id, component_id)
);
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON bill_of_materials
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_bom_product   ON bill_of_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_component ON bill_of_materials(component_id);

-- Production orders (consume BOM ingredients, produce finished goods)
CREATE TABLE IF NOT EXISTS production_orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_to_produce numeric(12,3) NOT NULL DEFAULT 1,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  planned_date date,
  completed_at timestamptz,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON production_orders
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_production_org ON production_orders(org_id);


-- ===== 0048_workflow_automations.sql =====
-- 0048_workflow_automations.sql
-- C5: Workflow automations / rules engine

CREATE TABLE IF NOT EXISTS workflow_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  trigger_type    text NOT NULL, -- 'deal_won', 'invoice_overdue', 'stock_low', 'deal_stage_change'
  trigger_condition jsonb DEFAULT '{}',
  action_type     text NOT NULL, -- 'create_invoice_draft', 'create_task', 'create_po', 'send_notification'
  action_config   jsonb DEFAULT '{}',
  run_count       integer NOT NULL DEFAULT 0,
  last_run_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON workflow_rules
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_workflow_rules_org ON workflow_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger ON workflow_rules(trigger_type);

-- Log of automation executions
CREATE TABLE IF NOT EXISTS workflow_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id     uuid NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
  trigger_data jsonb DEFAULT '{}',
  result      text NOT NULL DEFAULT 'success', -- 'success', 'error'
  error_msg   text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON workflow_runs
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_workflow_runs_rule ON workflow_runs(rule_id);


-- ===== 0049_task_links_announcements.sql =====
-- 0049_task_links_announcements.sql
-- C4: Linked records (task â†’ any entity) + C8: Announcement board

CREATE TABLE IF NOT EXISTS task_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  entity_type text NOT NULL,  -- 'invoice', 'deal', 'contact', 'purchase_order', 'project', 'meeting'
  entity_id   uuid NOT NULL,
  label       text,           -- optional display label override
  created_at  timestamptz DEFAULT now(),
  UNIQUE (task_id, entity_type, entity_id)
);

ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON task_links
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_task_links_task   ON task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_entity ON task_links(entity_type, entity_id);

-- C8: Announcements per team
CREATE TABLE IF NOT EXISTS announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id     uuid REFERENCES teams(id) ON DELETE CASCADE,  -- null = org-wide
  title       text NOT NULL,
  body        text,
  pinned      boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON announcements
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_announcements_org  ON announcements(org_id);
CREATE INDEX IF NOT EXISTS idx_announcements_team ON announcements(team_id);


-- ===== 0050_comment_reactions.sql =====
-- 0050_comment_reactions.sql
-- C10: Reactions on comments

CREATE TABLE IF NOT EXISTS comment_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (emoji IN ('ðŸ‘', 'âœ…', 'ðŸ‘€', 'â¤ï¸', 'ðŸŽ‰')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON comment_reactions
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);


-- ===== 0051_custom_reports.sql =====
-- 0051_custom_reports.sql
-- G1: Custom report builder

CREATE TABLE IF NOT EXISTS custom_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  source      text NOT NULL,  -- 'invoices', 'contacts', 'products', 'deals', 'employees', 'expenses'
  columns     jsonb NOT NULL DEFAULT '[]',       -- array of { key, label, type }
  filters     jsonb NOT NULL DEFAULT '[]',       -- array of { field, op, value }
  sort_by     text,
  sort_dir    text DEFAULT 'desc',
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON custom_reports
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_custom_reports_org ON custom_reports(org_id);


-- ===== 0052_qr_ordering.sql =====
-- 0052_qr_ordering.sql
-- D10: QR code customer ordering

-- Add qr_token to pos_tables for unique QR link per table
ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS qr_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_tables_qr_token ON pos_tables(qr_token) WHERE qr_token IS NOT NULL;

-- Customer QR orders
CREATE TABLE IF NOT EXISTS pos_qr_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_id     uuid REFERENCES pos_tables(id) ON DELETE SET NULL,
  table_name   text,
  customer_name text,
  items        jsonb NOT NULL DEFAULT '[]',  -- array of { product_id, name, qty, price }
  total        numeric(12,2) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'completed')),
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE pos_qr_orders ENABLE ROW LEVEL SECURITY;

-- Public read for pending status update (customer can view own order by ID)
-- Staff can view all orders for their org
CREATE POLICY "org members can manage" ON pos_qr_orders
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- Allow public insert (customer placing order)
CREATE POLICY "public can insert" ON pos_qr_orders
  FOR INSERT WITH CHECK (true);

-- Allow public select by id (customer tracking their order)
CREATE POLICY "public can select own" ON pos_qr_orders
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_qr_orders_org    ON pos_qr_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_qr_orders_table  ON pos_qr_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_qr_orders_status ON pos_qr_orders(status);


-- ===== 0053_guest_access.sql =====
-- 0053_guest_access.sql
-- C9: Guest access â€” memberships.is_guest + per-guest module whitelist

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_modules text[] DEFAULT '{}';

-- Also add guest support to the invite table so the link carries guest info
ALTER TABLE org_invites
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_modules text[] DEFAULT '{}';

-- Index for fast guest lookups
CREATE INDEX IF NOT EXISTS idx_memberships_guest ON memberships(org_id) WHERE is_guest = true;


-- ===== 0054_kds_status.sql =====
-- 0054_kds_status.sql
-- G5: Kitchen Display System â€” kds_status on pos_orders

ALTER TABLE pos_orders
  ADD COLUMN IF NOT EXISTS kds_status text NOT NULL DEFAULT 'new'
  CHECK (kds_status IN ('new', 'preparing', 'ready', 'served'));

CREATE INDEX IF NOT EXISTS idx_pos_orders_kds ON pos_orders(org_id, kds_status) WHERE kds_status != 'served';

-- ===== 0055_outlets.sql =====
-- 0055_outlets.sql
-- F2: Multi-outlet support

CREATE TABLE IF NOT EXISTS outlets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text,
  phone       text,
  code        text,   -- short code, e.g. "MUM-1", "DEL-2"
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON outlets
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_outlets_org ON outlets(org_id);

-- Add outlet_id to key transactional tables (nullable â€” existing data has no outlet)
ALTER TABLE invoices       ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);
ALTER TABLE pos_sessions   ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);
ALTER TABLE pos_orders     ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);

-- Inter-outlet stock transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_outlet_id  uuid NOT NULL REFERENCES outlets(id),
  to_outlet_id    uuid NOT NULL REFERENCES outlets(id),
  product_id      uuid NOT NULL REFERENCES products(id),
  quantity        numeric(12,4) NOT NULL CHECK (quantity > 0),
  notes           text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by      uuid REFERENCES auth.users(id),
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON stock_transfers
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_stock_transfers_org     ON stock_transfers(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from    ON stock_transfers(from_outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to      ON stock_transfers(to_outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_product ON stock_transfers(product_id);


-- ===== 0056_sms_settings.sql =====
-- 0056_sms_settings.sql
-- E3: SMS gateway settings

CREATE TABLE IF NOT EXISTS org_sms_settings (
  org_id          uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  provider        text NOT NULL DEFAULT 'msg91' CHECK (provider IN ('msg91', 'twilio')),
  msg91_authkey   text,
  msg91_sender    text,
  twilio_sid      text,
  twilio_token    text,
  twilio_from     text,
  is_active       boolean NOT NULL DEFAULT false,
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE org_sms_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON org_sms_settings
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- SMS logs for auditing
CREATE TABLE IF NOT EXISTS sms_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_number   text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error       text,
  reference   text,  -- invoice_id, pos_order_id, etc.
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON sms_logs
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_sms_logs_org ON sms_logs(org_id);


-- ===== 0057_workspace_v2.sql =====
-- Phase workspace v2: sub-tasks, task dependencies, KR confidence,
-- checkin mood, meeting attendees/recurring, issue env/priority/due_date, release_items

-- â”€â”€ Tasks: subtasks + dependencies + estimates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table tasks add column if not exists parent_task_id uuid references tasks(id) on delete cascade;
alter table tasks add column if not exists estimated_hours numeric(6,2);

create table if not exists task_dependencies (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  depends_on_id   uuid not null references tasks(id) on delete cascade,
  dep_type        text not null default 'blocks' check (dep_type in ('blocks','relates')),
  created_at      timestamptz not null default now(),
  unique(task_id, depends_on_id)
);
alter table task_dependencies enable row level security;
create policy "org members" on task_dependencies for all using (is_org_member(org_id));

-- â”€â”€ Key Results: confidence score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table key_results add column if not exists confidence text not null default 'on_track'
  check (confidence in ('on_track','at_risk','off_track'));

-- â”€â”€ Check-ins: mood/energy signal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table checkins add column if not exists mood int check (mood between 1 and 5);

-- â”€â”€ Meetings: attendees + recurring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table meetings add column if not exists attendees jsonb default '[]';
alter table meetings add column if not exists is_recurring boolean not null default false;
alter table meetings add column if not exists recurrence_rule text; -- daily/weekly/biweekly/monthly

-- â”€â”€ Issues: environment, priority, due_date â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table issues add column if not exists environment text not null default 'all'
  check (environment in ('all','production','staging','dev'));
alter table issues add column if not exists priority text not null default 'medium'
  check (priority in ('critical','high','medium','low'));
alter table issues add column if not exists due_date date;

-- â”€â”€ Releases: linked items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists release_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  release_id  uuid not null references releases(id) on delete cascade,
  entity_type text not null check (entity_type in ('task','issue')),
  entity_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique(release_id, entity_id)
);
alter table release_items enable row level security;
create policy "org members" on release_items for all using (is_org_member(org_id));
