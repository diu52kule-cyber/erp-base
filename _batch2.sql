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

-- Phase 24: product barcodes (for POS scanning + printable labels)
alter table products add column if not exists barcode text;
create index if not exists products_barcode_idx on products (org_id, barcode);

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

-- Phase 26b: link invoices to a CRM contact so they can post to the party ledger.
alter table invoices add column if not exists customer_id uuid references contacts(id) on delete set null;
create index if not exists invoices_customer_idx on invoices (org_id, customer_id);

-- 0029_payment_methods.sql
-- Widen the payments.method CHECK constraint to support card payments and
-- "credit / udhaar" (a sale recorded on the customer's account, not received).
-- Credit entries are NOT marked as completed receipts â€” they keep the invoice
-- outstanding and drive the customer's credit ledger receivable instead.

alter table payments drop constraint if exists payments_method_check;

alter table payments
  add constraint payments_method_check
  check (method in ('cash','upi','card','bank_transfer','cheque','razorpay','credit'));

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
