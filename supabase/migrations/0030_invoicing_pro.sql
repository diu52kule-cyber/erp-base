-- =====================================================================
-- 0030_invoicing_pro.sql  —  Professional invoicing overhaul (section A)
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

create trigger recurring_invoices_updated_at
  before update on recurring_invoices
  for each row execute function update_updated_at();
