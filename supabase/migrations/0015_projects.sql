-- Phase 16: Projects & Timesheet
create table projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  client_id   uuid references contacts(id) on delete set null,
  budget      numeric(12,2),
  deadline    date,
  status      text not null default 'active' check (status in ('active','on_hold','completed','cancelled')),
  description text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  assignee_id uuid references auth.users(id),
  due_date    date,
  status      text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table time_entries (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  task_id     uuid references tasks(id) on delete set null,
  user_id     uuid references auth.users(id),
  date        date not null,
  minutes     int not null check (minutes > 0),
  description text,
  billable    boolean not null default true,
  billed      boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table projects enable row level security;
alter table tasks enable row level security;
alter table time_entries enable row level security;
create policy "org members" on projects for all using (is_org_member(org_id));
create policy "org members" on tasks for all using (is_org_member(org_id));
create policy "org members" on time_entries for all using (is_org_member(org_id));

insert into modules (key, name) values ('projects', 'Projects') on conflict do nothing;
insert into entitlements (org_id, module_key, enabled)
  select id, 'projects', true from organizations on conflict do nothing;
