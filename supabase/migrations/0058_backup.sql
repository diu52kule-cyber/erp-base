-- Backup settings per org (one row per org)
CREATE TABLE IF NOT EXISTS org_backup_settings (
  org_id          uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  frequency       text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'off')),
  last_backup_at  timestamptz,
  last_backup_size bigint,
  last_backup_file_id text,
  drive_connected boolean NOT NULL DEFAULT false,
  drive_email     text,
  drive_folder_id text,
  access_token    text,
  refresh_token   text,
  token_expiry    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE org_backup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_settings_select" ON org_backup_settings
  FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "backup_settings_insert" ON org_backup_settings
  FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "backup_settings_update" ON org_backup_settings
  FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "backup_settings_delete" ON org_backup_settings
  FOR DELETE USING (is_org_member(org_id));

-- Backup run log
CREATE TABLE IF NOT EXISTS backup_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  file_name     text,
  file_size     bigint,
  drive_file_id text,
  error_message text
);

ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_history_select" ON backup_history
  FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "backup_history_insert" ON backup_history
  FOR INSERT WITH CHECK (is_org_member(org_id));
