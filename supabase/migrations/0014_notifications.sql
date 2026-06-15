-- Phase 15: Notifications & Audit Log
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  entity_type text,
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "own notifications" on notifications for all using (auth.uid() = user_id);
create index notifications_user_unread on notifications (user_id, read_at) where read_at is null;

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid references auth.users(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "org members read audit" on audit_log for select using (is_org_member(org_id));
create index audit_log_entity_idx on audit_log (org_id, entity_type, entity_id);
