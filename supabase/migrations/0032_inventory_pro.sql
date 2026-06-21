-- =====================================================================
-- 0032_inventory_pro.sql — Section C: Inventory / Products overhaul
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
