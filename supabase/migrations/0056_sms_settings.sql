-- 0056_sms_settings.sql
-- E3: SMS gateway settings

CREATE TABLE IF NOT EXISTS org_sms_settings (
  org_id          uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  provider        text NOT NULL DEFAULT 'msg91' CHECK (provider IN ('msg91', 'twilio')),
  msg91_authkey   text,
  msg91_sender    text,
  twilio_sid      text,
  twilio_token    text,
  twilio_from     text,
  is_active       boolean NOT NULL DEFAULT false,
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE org_sms_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON org_sms_settings
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- SMS logs for auditing
CREATE TABLE IF NOT EXISTS sms_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_number   text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error       text,
  reference   text,  -- invoice_id, pos_order_id, etc.
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON sms_logs
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_sms_logs_org ON sms_logs(org_id);
