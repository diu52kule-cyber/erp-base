-- =====================================================================
-- Phase: CRM Pro — activity timeline, lead source, opening balance
-- Run in Supabase SQL Editor after 0035
-- =====================================================================

-- Add columns to contacts (tags already exists from 0004)
alter table contacts add column if not exists lead_source      text;
alter table contacts add column if not exists opening_balance  numeric(14,2) not null default 0;

-- ----- Contact Activities (timeline + reminders) ---------------------
create table if not exists contact_activities (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  contact_id   uuid not null references contacts(id) on delete cascade,
  type         text not null
               check (type in ('note','call','email','whatsapp','meeting','task')),
  body         text not null,
  due_date     timestamptz,
  completed_at timestamptz,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists ca_contact_idx on contact_activities (org_id, contact_id, created_at desc);

alter table contact_activities enable row level security;

create policy ca_sel on contact_activities for select using (is_org_member(org_id));
create policy ca_ins on contact_activities for insert with check (is_org_member(org_id));
create policy ca_upd on contact_activities for update using (is_org_member(org_id));
create policy ca_del on contact_activities for delete using (is_org_member(org_id));
 