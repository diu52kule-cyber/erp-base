-- 0040_departments_teams.sql
-- Departments, teams, team memberships, comments (polymorphic),
-- job_title on memberships, expanded role set, and teams workspace module.

-- ─── 1. DEPARTMENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage departments"
  ON departments FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ─── 2. TEAMS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  color         text NOT NULL DEFAULT '#0ea5e9',
  focus_area    text, -- e.g. 'engineering', 'sales', 'kitchen', 'design'
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage teams"
  ON teams FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ─── 3. TEAM MEMBERSHIPS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_lead    boolean NOT NULL DEFAULT false,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage team memberships"
  ON team_memberships FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ─── 4. COMMENTS (POLYMORPHIC) ─────────────────────────────────────────────
-- entity_type: 'invoice' | 'deal' | 'purchase_order' | 'task' | 'project' | 'expense_claim' etc.
CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  body        text NOT NULL,
  mentions    text[] NOT NULL DEFAULT '{}',  -- array of user_ids mentioned via @
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_entity ON comments(org_id, entity_type, entity_id);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage comments"
  ON comments FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ─── 5. EXTEND MEMBERSHIPS ─────────────────────────────────────────────────
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS job_title     text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- ─── 6. EXPAND ROLE CONSTRAINT ─────────────────────────────────────────────
-- Drop and recreate the role CHECK to include product-dev + sector-specific roles.
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (role IN (
  -- Core permission tiers
  'owner', 'admin', 'manager', 'staff', 'viewer',
  -- Functional / cross-industry roles
  'accountant', 'hr', 'sales', 'marketing',
  'developer', 'designer', 'support', 'operations', 'cashier',
  -- Product development (software + all sectors with R&D / product)
  'product_manager', 'qa', 'devops', 'data_analyst',
  'content_creator', 'customer_success', 'business_dev',
  -- Sector-specific operational roles
  'warehouse', 'procurement', 'chef', 'store_manager'
));

-- ─── 7. REGISTER TEAMS MODULE ──────────────────────────────────────────────
INSERT INTO modules (key, name, description)
VALUES ('teams', 'Departments & Teams', 'Org structure, team workspaces, and @mentions')
ON CONFLICT (key) DO NOTHING;

-- Grant to all existing orgs
INSERT INTO entitlements (org_id, module_key, enabled)
SELECT id, 'teams', true FROM organizations
ON CONFLICT (org_id, module_key) DO UPDATE SET enabled = true;
