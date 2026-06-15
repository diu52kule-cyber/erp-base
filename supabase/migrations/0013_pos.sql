-- Phase 13: Point of Sale
create table pos_sessions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  opened_by      uuid references auth.users(id),
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz,
  opening_float  numeric(12,2) not null default 0,
  closing_cash   numeric(12,2),
  total_sales    numeric(12,2) not null default 0,
  order_count    int not null default 0,
  status         text not null default 'open' check (status in ('open','closed'))
);

create table pos_orders (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  session_id      uuid references pos_sessions(id),
  order_number    text not null,
  table_label     text,
  customer_name   text,
  subtotal        numeric(12,2) not null default 0,
  gst_amount      numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  payment_method  text not null default 'cash' check (payment_method in ('cash','upi','card')),
  amount_tendered numeric(12,2),
  change_amount   numeric(12,2) not null default 0,
  status          text not null default 'completed' check (status in ('open','completed','cancelled')),
  invoice_id      uuid references invoices(id),
  created_at      timestamptz not null default now()
);

create table pos_order_lines (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references pos_orders(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  product_id  uuid references products(id),
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null,
  gst_rate    numeric(5,2) not null default 0,
  gst_amount  numeric(12,2) not null default 0,
  amount      numeric(12,2) not null
);

alter table pos_sessions enable row level security;
alter table pos_orders enable row level security;
alter table pos_order_lines enable row level security;
create policy "org members" on pos_sessions for all using (is_org_member(org_id));
create policy "org members" on pos_orders for all using (is_org_member(org_id));
create policy "org members" on pos_order_lines for all using (is_org_member(org_id));

create index pos_orders_session_idx on pos_orders (session_id);

create or replace function next_pos_order_number(p_org_id uuid) returns text language plpgsql as $$
declare n int; y text;
begin
  y := to_char(now(), 'YYYY');
  select coalesce(max(cast(split_part(order_number,'-',3) as int)),0)+1 into n
  from pos_orders where org_id=p_org_id and extract(year from created_at)=extract(year from now());
  return 'POS-'||y||'-'||lpad(n::text,4,'0');
end; $$;

insert into modules (key, name) values ('pos', 'Point of Sale') on conflict do nothing;
insert into entitlements (org_id, module_key, enabled)
  select id, 'pos', true from organizations on conflict do nothing;

create or replace function create_organization(p_name text, p_business_type text)
returns uuid language plpgsql security definer as $$
declare new_org uuid;
begin
  insert into organizations (name, business_type) values (p_name, coalesce(p_business_type,'general')) returning id into new_org;
  insert into memberships (org_id, user_id, role) values (new_org, auth.uid(), 'owner');
  insert into entitlements (org_id, module_key, enabled) select new_org, key, true from modules on conflict do nothing;
  return new_org;
end; $$;
