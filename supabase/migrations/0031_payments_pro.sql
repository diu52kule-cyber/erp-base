-- =====================================================================
-- 0031_payments_pro.sql — Section B: Payments & Receivables
-- Run in Supabase SQL Editor after 0030_invoicing_pro.sql
--
-- Adds: 'partial' + 'refunded' invoice statuses, advance payments with
-- contact picker, refund tracking, multi-invoice payment allocations,
-- and overdue reminder timestamp.
-- =====================================================================

-- ----- Widen invoice status to include partial + refunded -------------
do $$ begin
  alter table invoices drop constraint invoices_status_check;
exception when undefined_object then null;
end $$;
alter table invoices add constraint invoices_status_check
  check (status in ('draft','sent','partial','paid','refunded','cancelled'));

-- ----- Overdue reminder tracking -------------------------------------
alter table invoices
  add column if not exists last_reminder_sent_at timestamptz;

-- ----- Extend payments table -----------------------------------------
alter table payments
  add column if not exists contact_id          uuid references contacts(id) on delete set null,
  add column if not exists payment_type        text not null default 'invoice'
    check (payment_type in ('invoice','advance','refund')),
  add column if not exists refund_of_payment_id uuid references payments(id) on delete set null;

-- ----- Multi-invoice payment allocations -----------------------------
create table if not exists payment_allocations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  payment_id  uuid not null references payments(id) on delete cascade,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  created_at  timestamptz not null default now(),
  unique (payment_id, invoice_id)
);

create index if not exists pa_invoice_idx on payment_allocations (org_id, invoice_id);
create index if not exists pa_payment_idx on payment_allocations (payment_id);

alter table payment_allocations enable row level security;

drop policy if exists pa_sel on payment_allocations;
create policy pa_sel on payment_allocations for select using (is_org_member(org_id));
drop policy if exists pa_ins on payment_allocations;
create policy pa_ins on payment_allocations for insert with check (is_org_member(org_id));
drop policy if exists pa_del on payment_allocations;
create policy pa_del on payment_allocations for delete using (is_org_member(org_id));
