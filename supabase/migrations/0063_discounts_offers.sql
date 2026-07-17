-- 0063 — Product discounts + offers
--
-- A per-product default discount, and an offers table for promotions
-- (percent / flat / BOGO / combo) that can be product-specific or store-wide
-- and printed on barcode labels.

alter table products
  add column if not exists discount_pct numeric(5,2) not null default 0;

create table if not exists offers (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  product_id  uuid references products(id) on delete cascade,   -- null = store-wide
  title       text not null,
  offer_type  text not null default 'percent' check (offer_type in ('percent','flat','bogo','combo')),
  value       numeric(12,2) not null default 0,                 -- percent or flat amount
  label_text  text,                                             -- short text printed on labels
  description text,
  active      boolean not null default true,
  starts_on   date,
  ends_on     date,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

alter table offers enable row level security;
create index if not exists offers_org_idx on offers(org_id);
create index if not exists offers_product_idx on offers(product_id);

drop policy if exists offers_sel on offers;
create policy offers_sel on offers for select using (is_org_member(org_id));
drop policy if exists offers_ins on offers;
create policy offers_ins on offers for insert with check (is_org_member(org_id));
drop policy if exists offers_upd on offers;
create policy offers_upd on offers for update using (is_org_member(org_id));
drop policy if exists offers_del on offers;
create policy offers_del on offers for delete using (is_org_member(org_id));
