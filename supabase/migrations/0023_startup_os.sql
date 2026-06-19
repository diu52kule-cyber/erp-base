-- Phase 22: Startup Operating System
-- Docs, Tasks & Sprints, Goals/OKRs, Meetings, Issues, Releases, Decisions,
-- Daily Check-ins, Product Feature pipeline. All tenant-scoped with RLS.

-- ── Docs / Knowledge Base ──────────────────────────────────────────
create table if not exists docs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  parent_id   uuid references docs(id) on delete cascade,
  title       text not null default 'Untitled',
  content     text default '',
  doc_type    text not null default 'doc',          -- doc/prd/sop/meeting/api/onboarding/vision/roadmap/postmortem
  icon        text default '📄',
  status      text not null default 'draft' check (status in ('draft','published','archived')),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists doc_versions (
  id         uuid primary key default gen_random_uuid(),
  doc_id     uuid not null references docs(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  title      text,
  content    text,
  edited_by  uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ── Sprints ────────────────────────────────────────────────────────
create table if not exists sprints (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,
  goal       text,
  start_date date,
  end_date   date,
  status     text not null default 'planned' check (status in ('planned','active','completed')),
  created_at timestamptz not null default now()
);

-- ── Product feature pipeline ───────────────────────────────────────
create table if not exists features (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  title       text not null,
  description text,
  owner_id    uuid references auth.users(id),
  stage       text not null default 'idea'
                check (stage in ('idea','research','prd','design','dev','qa','launch','feedback')),
  prd_doc_id  uuid references docs(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── Goals / OKRs ───────────────────────────────────────────────────
create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  parent_id   uuid references goals(id) on delete cascade,
  title       text not null,
  description text,
  owner_id    uuid references auth.users(id),
  level       text not null default 'company' check (level in ('company','team','individual')),
  quarter     text,
  progress    int  not null default 0 check (progress between 0 and 100),
  status      text not null default 'on_track' check (status in ('on_track','at_risk','off_track','done')),
  created_at  timestamptz not null default now()
);

create table if not exists key_results (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references goals(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  title      text not null,
  target     numeric(14,2) not null default 100,
  current    numeric(14,2) not null default 0,
  unit       text,
  created_at timestamptz not null default now()
);

-- ── Meetings + action items ────────────────────────────────────────
create table if not exists meetings (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  title        text not null,
  meeting_date date not null default current_date,
  agenda       text,
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create table if not exists action_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  meeting_id  uuid not null references meetings(id) on delete cascade,
  text        text not null,
  assignee_id uuid references auth.users(id),
  task_id     uuid,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Issue / bug tracker ────────────────────────────────────────────
create table if not exists issues (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  title       text not null,
  description text,
  severity    text not null default 'medium' check (severity in ('critical','high','medium','low')),
  status      text not null default 'open'   check (status in ('open','in_progress','resolved','closed')),
  module      text,
  assignee_id uuid references auth.users(id),
  reporter_id uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ── Releases ───────────────────────────────────────────────────────
create table if not exists releases (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  version     text not null,
  title       text,
  notes       text,
  status      text not null default 'planned' check (status in ('planned','released','rolled_back')),
  released_at date,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ── Decision log ───────────────────────────────────────────────────
create table if not exists decisions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  title        text not null,
  context      text,
  decision     text,
  alternatives text,
  owner_id     uuid references auth.users(id),
  decided_on   date not null default current_date,
  created_at   timestamptz not null default now()
);

-- ── Daily check-ins (accountability) ───────────────────────────────
create table if not exists checkins (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  user_id      uuid not null references auth.users(id),
  checkin_date date not null default current_date,
  yesterday    text,
  today        text,
  blockers     text,
  created_at   timestamptz not null default now(),
  unique (org_id, user_id, checkin_date)
);

-- ── Extend tasks into full work items (shared with Projects module) ──
alter table tasks alter column project_id drop not null;
alter table tasks add column if not exists sprint_id   uuid references sprints(id)  on delete set null;
alter table tasks add column if not exists feature_id  uuid references features(id) on delete set null;
alter table tasks add column if not exists reporter_id uuid references auth.users(id);
alter table tasks add column if not exists priority    text not null default 'medium';
alter table tasks add column if not exists labels      text[] default '{}';
alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks add  constraint tasks_priority_check check (priority in ('low','medium','high','urgent'));
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add  constraint tasks_status_check
  check (status in ('backlog','todo','in_progress','review','done','blocked'));

-- link meeting action items to the task they generate
alter table action_items drop constraint if exists action_items_task_fk;
alter table action_items add  constraint action_items_task_fk
  foreign key (task_id) references tasks(id) on delete set null;

-- ── RLS ────────────────────────────────────────────────────────────
alter table docs          enable row level security;
alter table doc_versions  enable row level security;
alter table sprints       enable row level security;
alter table features      enable row level security;
alter table goals         enable row level security;
alter table key_results   enable row level security;
alter table meetings      enable row level security;
alter table action_items  enable row level security;
alter table issues        enable row level security;
alter table releases      enable row level security;
alter table decisions     enable row level security;
alter table checkins      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['docs','doc_versions','sprints','features','goals','key_results',
                           'meetings','action_items','issues','releases','decisions','checkins']
  loop
    execute format('drop policy if exists "org members" on %I;', t);
    execute format('create policy "org members" on %I for all using (is_org_member(org_id));', t);
  end loop;
end $$;

-- ── Module catalog + grant to all existing orgs ────────────────────
insert into modules (key, name, description) values
  ('docs',      'Docs & Knowledge Base', 'Nested pages, templates (PRD/SOP), version history'),
  ('tasks',     'Tasks & Sprints',       'Kanban/sprint board, assignees, priorities'),
  ('goals',     'Goals & OKRs',          'Company → team → individual objectives'),
  ('meetings',  'Meetings',              'Agenda, notes, action items → tasks'),
  ('issues',    'Issues & Bugs',         'Severity, status, assignment'),
  ('releases',  'Releases',              'Version log, ship notes, rollback'),
  ('decisions', 'Decision Log',          'Why decisions were made'),
  ('checkins',  'Daily Check-ins',       'Standups + accountability'),
  ('features',  'Product Pipeline',      'Idea → Research → PRD → Dev → Launch'),
  ('assistant', 'AI Assistant',          'Ask questions across your workspace')
on conflict (key) do nothing;

insert into entitlements (org_id, module_key, enabled)
select o.id, m.key, true
from organizations o
cross join (values ('docs'),('tasks'),('goals'),('meetings'),('issues'),
                   ('releases'),('decisions'),('checkins'),('features'),('assistant')) as m(key)
on conflict (org_id, module_key) do nothing;
