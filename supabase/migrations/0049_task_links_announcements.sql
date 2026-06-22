-- 0049_task_links_announcements.sql
-- C4: Linked records (task → any entity) + C8: Announcement board

CREATE TABLE IF NOT EXISTS task_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  entity_type text NOT NULL,  -- 'invoice', 'deal', 'contact', 'purchase_order', 'project', 'meeting'
  entity_id   uuid NOT NULL,
  label       text,           -- optional display label override
  created_at  timestamptz DEFAULT now(),
  UNIQUE (task_id, entity_type, entity_id)
);

ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON task_links
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_task_links_task   ON task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_entity ON task_links(entity_type, entity_id);

-- C8: Announcements per team
CREATE TABLE IF NOT EXISTS announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id     uuid REFERENCES teams(id) ON DELETE CASCADE,  -- null = org-wide
  title       text NOT NULL,
  body        text,
  pinned      boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON announcements
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_announcements_org  ON announcements(org_id);
CREATE INDEX IF NOT EXISTS idx_announcements_team ON announcements(team_id);
