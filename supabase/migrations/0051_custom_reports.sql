-- 0051_custom_reports.sql
-- G1: Custom report builder

CREATE TABLE IF NOT EXISTS custom_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  source      text NOT NULL,  -- 'invoices', 'contacts', 'products', 'deals', 'employees', 'expenses'
  columns     jsonb NOT NULL DEFAULT '[]',       -- array of { key, label, type }
  filters     jsonb NOT NULL DEFAULT '[]',       -- array of { field, op, value }
  sort_by     text,
  sort_dir    text DEFAULT 'desc',
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON custom_reports
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_custom_reports_org ON custom_reports(org_id);
