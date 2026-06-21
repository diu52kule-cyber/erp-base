-- =====================================================================
-- 0033_pos_pro.sql — Section D: POS overhaul
-- Run in Supabase SQL Editor after 0032_inventory_pro.sql
--
-- Adds: order_type (sale/refund), customer link, bill + line discounts,
-- split tender, variance reason on sessions, and cash in/out movements.
-- =====================================================================

-- ----- Widen payment_method to include 'split' -----------------------
do $$ begin
  alter table pos_orders drop constraint pos_orders_payment_method_check;
exception when undefined_object then null;
end $$;
alter table pos_orders add constraint pos_orders_payment_method_check
  check (payment_method in ('cash','upi','card','split'));

-- ----- Extend pos_orders ---------------------------------------------
alter table pos_orders
  add column if not exists order_type           text not null default 'sale'
    check (order_type in ('sale','refund')),
  add column if not exists customer_id          uuid references contacts(id) on delete set null,
  add column if not exists discount_type        text check (discount_type in ('percent','flat')),
  add column if not exists discount_value       numeric(12,2) not null default 0,
  add column if not exists discount_amount      numeric(12,2) not null default 0,
  add column if not exists split_tenders        jsonb,
  add column if not exists refund_of_order_id   uuid references pos_orders(id) on delete set null;

-- ----- Per-line discount on pos_order_lines --------------------------
alter table pos_order_lines
  add column if not exists discount_pct    numeric(5,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0;

-- ----- Extend pos_sessions -------------------------------------------
alter table pos_sessions
  add column if not exists variance_reason text,
  add column if not exists notes           text;

-- ----- Cash in/out movements -----------------------------------------
create table if not exists pos_cash_movements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  session_id  uuid not null references pos_sessions(id) on delete cascade,
  type        text not null check (type in ('in','out')),
  amount      numeric(12,2) not null check (amount > 0),
  reason      text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index if not exists pcm_session_idx on pos_cash_movements (session_id);

alter table pos_cash_movements enable row level security;

drop policy if exists pcm_sel on pos_cash_movements;
create policy pcm_sel on pos_cash_movements for select using (is_org_member(org_id));
drop policy if exists pcm_ins on pos_cash_movements;
create policy pcm_ins on pos_cash_movements for insert with check (is_org_member(org_id));
