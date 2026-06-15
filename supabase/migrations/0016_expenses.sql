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
