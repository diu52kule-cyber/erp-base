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
