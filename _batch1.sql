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

-- Grant every module to every existing organisation (backfill).
-- create_organization RPC already does this for new orgs via `select key from modules`.
insert into entitlements (org_id, module_key, enabled)
select o.id, m.key, true
from organizations o
cross join modules m
on conflict (org_id, module_key) do update set enabled = true;

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
