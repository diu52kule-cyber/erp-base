-- 0048_workflow_automations.sql
-- C5: Workflow automations / rules engine

CREATE TABLE IF NOT EXISTS workflow_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  trigger_type    text NOT NULL, -- 'deal_won', 'invoice_overdue', 'stock_low', 'deal_stage_change'
  trigger_condition jsonb DEFAULT '{}',
  action_type     text NOT NULL, -- 'create_invoice_draft', 'create_task', 'create_po', 'send_notification'
  action_config   jsonb DEFAULT '{}',
  run_count       integer NOT NULL DEFAULT 0,
  last_run_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON workflow_rules
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_workflow_rules_org ON workflow_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger ON workflow_rules(trigger_type);

-- Log of automation executions
CREATE TABLE IF NOT EXISTS workflow_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id     uuid NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
  trigger_data jsonb DEFAULT '{}',
  result      text NOT NULL DEFAULT 'success', -- 'success', 'error'
  error_msg   text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON workflow_runs
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_workflow_runs_rule ON workflow_runs(rule_id);
