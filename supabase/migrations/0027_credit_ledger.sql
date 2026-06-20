-- Phase 26: Customer credit ledger ("party ledger" / udhaar)
-- Every credit given or payment received is a signed entry:
--   amount > 0  → customer owes more (credit/sale given)
--   amount < 0  → customer paid (receivable reduced)
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
