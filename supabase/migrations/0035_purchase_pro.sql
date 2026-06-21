-- =====================================================================
-- Phase: Purchases Pro — purchase returns (debit notes), vendor advances,
-- landed costs
-- Run in Supabase SQL Editor
-- =====================================================================

-- ----- Purchase Returns (Debit Notes) --------------------------------
create table if not exists purchase_returns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  po_id         uuid references purchase_orders(id) on delete set null,
  return_number text not null,
  vendor_name   text not null,
  return_date   date not null default current_date,
  reason        text,
  notes         text,
  status        text not null default 'draft'
                check (status in ('draft','sent','completed')),
  subtotal      numeric(14,2) not null default 0,
  gst_amount    numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  unique (org_id, return_number)
);

create table if not exists purchase_return_lines (
  id          uuid primary key default gen_random_uuid(),
  return_id   uuid not null references purchase_returns(id) on delete cascade,
  po_line_id  uuid references po_lines(id) on delete set null,
  product_id  uuid references products(id) on delete set null,
  description text not null,
  quantity    numeric(12,3) not null,
  unit_price  numeric(14,2) not null,
  gst_rate    numeric(5,2) not null default 0,
  amount      numeric(14,2) not null
);

-- ----- Vendor Advances -----------------------------------------------
create table if not exists vendor_advances (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  vendor_name      text not null,
  vendor_id        uuid references contacts(id) on delete set null,
  amount           numeric(14,2) not null,
  method           text not null default 'bank_transfer'
                   check (method in ('cash','upi','card','bank_transfer','cheque')),
  reference_number text,
  advance_date     date not null default current_date,
  notes            text,
  status           text not null default 'paid'
                   check (status in ('paid','adjusted','refunded')),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

-- ----- Landed Costs --------------------------------------------------
create table if not exists landed_costs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  grn_id      uuid references goods_receipt_notes(id) on delete cascade,
  po_id       uuid references purchase_orders(id) on delete set null,
  cost_type   text not null
              check (cost_type in ('freight','duty','customs','insurance','other')),
  amount      numeric(14,2) not null,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ----- Return number generator ---------------------------------------
create or replace function next_return_number(p_org_id uuid)
returns text language plpgsql security definer as $$
declare
  yr text := to_char(current_date, 'YYYY');
  n  int;
begin
  select coalesce(
    max(case when return_number ~ ('^DR-' || yr || '-[0-9]+$')
        then cast(regexp_replace(return_number, '^DR-[0-9]{4}-', '') as int)
        else null end), 0
  ) + 1 into n
  from purchase_returns where org_id = p_org_id;
  return 'DR-' || yr || '-' || lpad(n::text, 4, '0');
end; $$;

grant execute on function next_return_number(uuid) to authenticated;

-- ----- RLS -----------------------------------------------------------
alter table purchase_returns      enable row level security;
alter table purchase_return_lines enable row level security;
alter table vendor_advances       enable row level security;
alter table landed_costs          enable row level security;

create policy pr_sel  on purchase_returns for select using (is_org_member(org_id));
create policy pr_ins  on purchase_returns for insert with check (is_org_member(org_id));
create policy pr_upd  on purchase_returns for update using (is_org_member(org_id));

create policy prl_sel on purchase_return_lines for select
  using (exists (select 1 from purchase_returns r where r.id = return_id and is_org_member(r.org_id)));
create policy prl_ins on purchase_return_lines for insert
  with check (exists (select 1 from purchase_returns r where r.id = return_id and is_org_member(r.org_id)));

create policy va_sel  on vendor_advances for select using (is_org_member(org_id));
create policy va_ins  on vendor_advances for insert with check (is_org_member(org_id));
create policy va_upd  on vendor_advances for update using (is_org_member(org_id));

create policy lc_sel  on landed_costs for select using (is_org_member(org_id));
create policy lc_ins  on landed_costs for insert with check (is_org_member(org_id));
