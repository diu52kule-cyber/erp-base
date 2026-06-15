-- Phase 19: API Keys & Webhooks
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,
  key_hash     text not null unique,
  created_by   uuid references auth.users(id),
  last_used_at timestamptz,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table api_keys enable row level security;
create policy "org members" on api_keys for all using (is_org_member(org_id));

create table webhooks (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  url        text not null,
  events     text[] not null default '{}',
  secret     text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table webhooks enable row level security;
create policy "org members" on webhooks for all using (is_org_member(org_id));
