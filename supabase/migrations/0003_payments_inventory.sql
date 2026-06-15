-- =====================================================================
-- Phase 2: Payments + Inventory
-- =====================================================================

-- ----- PAYMENTS -------------------------------------------------------

create table if not exists payments (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organizations(id) on delete cascade,
  invoice_id         uuid references invoices(id) on delete set null,
  amount             numeric(12,2) not null,
  currency           text not null default 'INR',
  method             text not null default 'cash'
                     check (method in ('cash','upi','bank_transfer','cheque','razorpay')),
  status             text not null default 'completed'
                     check (status in ('pending','completed','failed','refunded')),
  gateway_order_id   text,
  gateway_payment_id text,
  reference_number   text,
  notes              text,
  paid_at            timestamptz not null default now(),
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now()
);

alter table payments enable row level security;

drop policy if exists pay_member_select on payments;
create policy pay_member_select on payments
  for select using (is_org_member(org_id));

drop policy if exists pay_member_insert on payments;
create policy pay_member_insert on payments
  for insert with check (is_org_member(org_id));

drop policy if exists pay_member_update on payments;
create policy pay_member_update on payments
  for update using (is_org_member(org_id));

-- ----- INVENTORY ------------------------------------------------------

create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations(id) on delete cascade,
  name                text not null,
  sku                 text,
  description         text,
  unit                text not null default 'pcs',
  selling_price       numeric(12,2) not null default 0,
  gst_rate            numeric(5,2) not null default 18
                      check (gst_rate in (0, 5, 12, 18, 28)),
  stock_qty           numeric(10,3) not null default 0,
  low_stock_threshold numeric(10,3) not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, sku)
);

create table if not exists stock_movements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  type        text not null check (type in ('in','out','adjustment')),
  quantity    numeric(10,3) not null,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

alter table products        enable row level security;
alter table stock_movements enable row level security;

drop policy if exists prod_member_select on products;
create policy prod_member_select on products
  for select using (is_org_member(org_id));

drop policy if exists prod_member_insert on products;
create policy prod_member_insert on products
  for insert with check (is_org_member(org_id));

drop policy if exists prod_member_update on products;
create policy prod_member_update on products
  for update using (is_org_member(org_id));

drop policy if exists prod_member_delete on products;
create policy prod_member_delete on products
  for delete using (is_org_member(org_id));

drop policy if exists stock_member_select on stock_movements;
create policy stock_member_select on stock_movements
  for select using (is_org_member(org_id));

drop policy if exists stock_member_insert on stock_movements;
create policy stock_member_insert on stock_movements
  for insert with check (is_org_member(org_id));

-- ----- ENTITLEMENTS ---------------------------------------------------
-- Enable payments + inventory for all existing orgs.
-- (New orgs via the updated create_organization RPC get them automatically.)

insert into entitlements (org_id, module_key, enabled)
select id, 'payments', true from organizations
on conflict do nothing;

insert into entitlements (org_id, module_key, enabled)
select id, 'inventory', true from organizations
on conflict do nothing;

-- Update create_organization to auto-grant payments + inventory to new orgs.
create or replace function create_organization(p_name text, p_business_type text)
returns uuid language plpgsql security definer as $$
declare new_org uuid;
begin
  insert into organizations (name, business_type)
  values (p_name, coalesce(p_business_type, 'general'))
  returning id into new_org;

  insert into memberships (org_id, user_id, role)
  values (new_org, auth.uid(), 'owner');

  insert into entitlements (org_id, module_key, enabled)
  select new_org, key, true from modules
  where key in ('billing', 'payments', 'inventory')
  on conflict do nothing;

  return new_org;
end; $$;
