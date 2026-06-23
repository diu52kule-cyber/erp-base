-- Phase workspace v2: sub-tasks, task dependencies, KR confidence,
-- checkin mood, meeting attendees/recurring, issue env/priority/due_date, release_items

-- ── Tasks: subtasks + dependencies + estimates ──────────────────────
alter table tasks add column if not exists parent_task_id uuid references tasks(id) on delete cascade;
alter table tasks add column if not exists estimated_hours numeric(6,2);

create table if not exists task_dependencies (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  depends_on_id   uuid not null references tasks(id) on delete cascade,
  dep_type        text not null default 'blocks' check (dep_type in ('blocks','relates')),
  created_at      timestamptz not null default now(),
  unique(task_id, depends_on_id)
);
alter table task_dependencies enable row level security;
create policy "org members" on task_dependencies for all using (is_org_member(org_id));

-- ── Key Results: confidence score ───────────────────────────────────
alter table key_results add column if not exists confidence text not null default 'on_track'
  check (confidence in ('on_track','at_risk','off_track'));

-- ── Check-ins: mood/energy signal ───────────────────────────────────
alter table checkins add column if not exists mood int check (mood between 1 and 5);

-- ── Meetings: attendees + recurring ────────────────────────────────
alter table meetings add column if not exists attendees jsonb default '[]';
alter table meetings add column if not exists is_recurring boolean not null default false;
alter table meetings add column if not exists recurrence_rule text; -- daily/weekly/biweekly/monthly

-- ── Issues: environment, priority, due_date ──────────────────────
alter table issues add column if not exists environment text not null default 'all'
  check (environment in ('all','production','staging','dev'));
alter table issues add column if not exists priority text not null default 'medium'
  check (priority in ('critical','high','medium','low'));
alter table issues add column if not exists due_date date;

-- ── Releases: linked items ───────────────────────────────────────
create table if not exists release_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  release_id  uuid not null references releases(id) on delete cascade,
  entity_type text not null check (entity_type in ('task','issue')),
  entity_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique(release_id, entity_id)
);
alter table release_items enable row level security;
create policy "org members" on release_items for all using (is_org_member(org_id));
