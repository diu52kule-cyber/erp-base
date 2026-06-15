-- =====================================================================
-- Phase 1: Billing module — invoices and line items
-- Run in Supabase SQL Editor after 0001_init.sql
-- =====================================================================

create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  invoice_number  text not null,
  customer_name   text not null,
  customer_email  text,
  customer_gstin  text,
  billing_address text,
  status          text not null default 'draft'
                  check (status in ('draft','sent','paid','cancelled')),
  issue_date      date not null default current_date,
  due_date        date,
  notes           text,
  subtotal        numeric(12,2) not null default 0,
  gst_amount      numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, invoice_number)
);

create table if not exists invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices(id) on delete cascade,
  org_id       uuid not null references organizations(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,3) not null default 1,
  unit_price   numeric(12,2) not null,
  gst_rate     numeric(5,2) not null default 0
               check (gst_rate in (0, 5, 12, 18, 28)),
  amount       numeric(12,2) not null,
  gst_amount   numeric(12,2) not null default 0,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Auto-update invoices.updated_at on any change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger invoices_updated_at
  before update on invoices
  for each row execute function update_updated_at();

-- Generate the next sequential invoice number for an org in the current year.
-- Uses security definer to bypass RLS for counting; still scoped to p_org_id.
create or replace function next_invoice_number(p_org_id uuid)
returns text language plpgsql security definer stable as $$
declare
  seq      integer;
  year_str text;
begin
  year_str := to_char(now(), 'YYYY');

  select coalesce(
    max(
      case when invoice_number ~ ('^INV-' || year_str || '-[0-9]+$')
      then cast(regexp_replace(invoice_number, '^INV-[0-9]{4}-', '') as integer)
      else null end
    ), 0
  ) + 1
  into seq
  from invoices
  where org_id = p_org_id;

  return 'INV-' || year_str || '-' || lpad(seq::text, 4, '0');
end; $$;

grant execute on function next_invoice_number(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table invoices      enable row level security;
alter table invoice_items enable row level security;

drop policy if exists inv_member_select on invoices;
create policy inv_member_select on invoices
  for select using (is_org_member(org_id));

drop policy if exists inv_member_insert on invoices;
create policy inv_member_insert on invoices
  for insert with check (is_org_member(org_id));

drop policy if exists inv_member_update on invoices;
create policy inv_member_update on invoices
  for update using (is_org_member(org_id));

drop policy if exists inv_member_delete on invoices;
create policy inv_member_delete on invoices
  for delete using (is_org_member(org_id));

drop policy if exists item_member_select on invoice_items;
create policy item_member_select on invoice_items
  for select using (is_org_member(org_id));

drop policy if exists item_member_insert on invoice_items;
create policy item_member_insert on invoice_items
  for insert with check (is_org_member(org_id));

drop policy if exists item_member_update on invoice_items;
create policy item_member_update on invoice_items
  for update using (is_org_member(org_id));

drop policy if exists item_member_delete on invoice_items;
create policy item_member_delete on invoice_items
  for delete using (is_org_member(org_id));
