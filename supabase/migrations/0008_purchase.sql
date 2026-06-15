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
