-- =====================================================================
-- Phase 10: User Roles & Team Invites
-- Run in Supabase SQL Editor after 0008_purchase.sql
-- =====================================================================

-- Add role constraint to memberships (owner | manager | staff | accountant | hr)
alter table memberships drop constraint if exists memberships_role_check;
alter table memberships add constraint memberships_role_check
  check (role in ('owner','manager','staff','accountant','hr'));

-- Org invite tokens — valid for 7 days, single-use
create table if not exists org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        text not null default 'staff'
              check (role in ('owner','manager','staff','accountant','hr')),
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid references auth.users(id),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table org_invites enable row level security;

-- Members can see and manage their org's invites
create policy inv_select on org_invites for select using (is_org_member(org_id));
create policy inv_insert on org_invites for insert with check (is_org_member(org_id));
create policy inv_update on org_invites for update using (is_org_member(org_id));
create policy inv_delete on org_invites for delete using (is_org_member(org_id));

-- Allow members to update/delete other memberships (for role changes and removal)
-- The existing policy only allows self-insert; add update/delete for owners
drop policy if exists mem_member_update on memberships;
create policy mem_member_update on memberships
  for update using (is_org_member(org_id));

drop policy if exists mem_member_delete on memberships;
create policy mem_member_delete on memberships
  for delete using (is_org_member(org_id) and user_id != auth.uid());
