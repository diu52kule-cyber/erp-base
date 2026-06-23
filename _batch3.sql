-- Phase 39: Soft-delete (archive) support
-- archived_at being set = archived; null = active

alter table contacts  add column if not exists archived_at timestamptz;
alter table products  add column if not exists archived_at timestamptz;
alter table deals     add column if not exists archived_at timestamptz;

create index if not exists contacts_active_idx on contacts (org_id) where archived_at is null;
create index if not exists products_active_idx on products (org_id) where archived_at is null;
create index if not exists deals_active_idx    on deals    (org_id) where archived_at is null;

-- 0040_departments_teams.sql
-- Departments, teams, team memberships, comments (polymorphic),
-- job_title on memberships, expanded role set, and teams workspace module.

-- â”€â”€â”€ 1. DEPARTMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 2. TEAMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 3. TEAM MEMBERSHIPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 4. COMMENTS (POLYMORPHIC) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 5. EXTEND MEMBERSHIPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS job_title     text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- â”€â”€â”€ 6. EXPAND ROLE CONSTRAINT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 7. REGISTER TEAMS MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO modules (key, name, description)
VALUES ('teams', 'Departments & Teams', 'Org structure, team workspaces, and @mentions')
ON CONFLICT (key) DO NOTHING;

-- Grant to all existing orgs
INSERT INTO entitlements (org_id, module_key, enabled)
SELECT id, 'teams', true FROM organizations
ON CONFLICT (org_id, module_key) DO UPDATE SET enabled = true;

-- 0041_credit_limit.sql
-- Adds credit_limit to contacts and stock_qty to products select (already exists).
-- credit_limit: optional cap on outstanding balance for this customer.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) DEFAULT NULL;

-- 0042_archive_reminders.sql
-- Soft-delete for employees; reminder tracking on invoices.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_employees_active
  ON employees(org_id) WHERE archived_at IS NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- 0043_doc_settings_variants.sql
-- B6: per-org document number customization
-- D3: product variants (size / colour / flavour)

-- B6 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_doc_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doc_type    text NOT NULL,           -- invoice | purchase_order | quotation | credit_note
  prefix      text NOT NULL DEFAULT '', -- e.g. "INV" or "PO"
  start_number int  NOT NULL DEFAULT 1,
  fy_reset    boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, doc_type)
);
ALTER TABLE org_doc_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON org_doc_settings
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- D3 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        text NOT NULL,           -- e.g. "Red / Large"
  attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "color": "Red", "size": "L" }
  sku         text,
  price       numeric(12,2),           -- NULL = inherit from parent product
  stock_qty   numeric(12,3) NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON product_variants
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_org    ON product_variants(org_id);

-- 0044_pos_tables_loyalty.sql
-- D8: POS table management
-- D11: Customer loyalty program

-- D8 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pos_tables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,            -- e.g. "Table 1", "Counter", "T3"
  status      text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied')),
  current_order_id uuid,                -- set when occupied (informational)
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE pos_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON pos_tables
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_pos_tables_org ON pos_tables(org_id);

-- D11 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  points          int  NOT NULL DEFAULT 0,
  lifetime_points int  NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (org_id, contact_id)
);
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON loyalty_accounts
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_loyalty_org     ON loyalty_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_contact ON loyalty_accounts(contact_id);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id     uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  points         int  NOT NULL,         -- positive = earn, negative = redeem
  type           text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  reference_id   uuid,                  -- pos_order.id or invoice.id
  reference_type text,                  -- 'pos_order' | 'invoice'
  notes          text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON loyalty_transactions
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_org     ON loyalty_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_contact ON loyalty_transactions(contact_id);

-- Org loyalty settings (earn rate + min redemption)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS loyalty_earn_rate  numeric(5,2) DEFAULT 1,   -- points per â‚¹10
  ADD COLUMN IF NOT EXISTS loyalty_redeem_rate numeric(5,2) DEFAULT 1;   -- â‚¹1 per point

-- 0045_opening_balances_shifts.sql
-- D5: Account opening balances + FY close
-- D13: Employee shift scheduling

-- D5 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_opening_balances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  fy          text NOT NULL,    -- e.g. "2024" (FY 2024-25 starts Apr 2024)
  amount      numeric(14,2) NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, account_id, fy)
);
ALTER TABLE account_opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON account_opening_balances
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- Track FY closures
CREATE TABLE IF NOT EXISTS fy_closures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fy              text NOT NULL,
  closed_at       timestamptz DEFAULT now(),
  closed_by       uuid,
  retained_earnings_amount numeric(14,2) DEFAULT 0,
  UNIQUE (org_id, fy)
);
ALTER TABLE fy_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON fy_closures
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- D13 -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        date NOT NULL,
  start_time  time NOT NULL,      -- e.g. '09:00'
  end_time    time NOT NULL,      -- e.g. '17:00'
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, employee_id, date)   -- one shift per employee per day
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON shifts
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_shifts_org_date ON shifts(org_id, date);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);

-- 0046_employee_self_service.sql
-- D14: Employee self-service portal token

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS self_service_token uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS self_service_enabled boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_self_service_token
  ON employees(self_service_token) WHERE self_service_token IS NOT NULL;

-- 0047_bom_production.sql
-- D7: Bill of Materials + production orders

CREATE TABLE IF NOT EXISTS bill_of_materials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,  -- finished good / recipe
  component_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,  -- raw material / ingredient
  qty          numeric(12,3) NOT NULL DEFAULT 1,
  unit         text,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (org_id, product_id, component_id)
);
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON bill_of_materials
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_bom_product   ON bill_of_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_component ON bill_of_materials(component_id);

-- Production orders (consume BOM ingredients, produce finished goods)
CREATE TABLE IF NOT EXISTS production_orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_to_produce numeric(12,3) NOT NULL DEFAULT 1,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  planned_date date,
  completed_at timestamptz,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON production_orders
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_production_org ON production_orders(org_id);

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

-- 0049_task_links_announcements.sql
-- C4: Linked records (task â†’ any entity) + C8: Announcement board

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

-- 0050_comment_reactions.sql
-- C10: Reactions on comments

CREATE TABLE IF NOT EXISTS comment_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (emoji IN ('ðŸ‘', 'âœ…', 'ðŸ‘€', 'â¤ï¸', 'ðŸŽ‰')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON comment_reactions
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);

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

-- 0052_qr_ordering.sql
-- D10: QR code customer ordering

-- Add qr_token to pos_tables for unique QR link per table
ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS qr_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_tables_qr_token ON pos_tables(qr_token) WHERE qr_token IS NOT NULL;

-- Customer QR orders
CREATE TABLE IF NOT EXISTS pos_qr_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_id     uuid REFERENCES pos_tables(id) ON DELETE SET NULL,
  table_name   text,
  customer_name text,
  items        jsonb NOT NULL DEFAULT '[]',  -- array of { product_id, name, qty, price }
  total        numeric(12,2) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'completed')),
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE pos_qr_orders ENABLE ROW LEVEL SECURITY;

-- Public read for pending status update (customer can view own order by ID)
-- Staff can view all orders for their org
CREATE POLICY "org members can manage" ON pos_qr_orders
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- Allow public insert (customer placing order)
CREATE POLICY "public can insert" ON pos_qr_orders
  FOR INSERT WITH CHECK (true);

-- Allow public select by id (customer tracking their order)
CREATE POLICY "public can select own" ON pos_qr_orders
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_qr_orders_org    ON pos_qr_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_qr_orders_table  ON pos_qr_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_qr_orders_status ON pos_qr_orders(status);

-- 0053_guest_access.sql
-- C9: Guest access â€” memberships.is_guest + per-guest module whitelist

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_modules text[] DEFAULT '{}';

-- Also add guest support to the invite table so the link carries guest info
ALTER TABLE org_invites
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_modules text[] DEFAULT '{}';

-- Index for fast guest lookups
CREATE INDEX IF NOT EXISTS idx_memberships_guest ON memberships(org_id) WHERE is_guest = true;

-- 0054_kds_status.sql
-- G5: Kitchen Display System â€” kds_status on pos_orders

ALTER TABLE pos_orders
  ADD COLUMN IF NOT EXISTS kds_status text NOT NULL DEFAULT 'new'
  CHECK (kds_status IN ('new', 'preparing', 'ready', 'served'));

CREATE INDEX IF NOT EXISTS idx_pos_orders_kds ON pos_orders(org_id, kds_status) WHERE kds_status != 'served';
-- 0055_outlets.sql
-- F2: Multi-outlet support

CREATE TABLE IF NOT EXISTS outlets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text,
  phone       text,
  code        text,   -- short code, e.g. "MUM-1", "DEL-2"
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON outlets
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_outlets_org ON outlets(org_id);

-- Add outlet_id to key transactional tables (nullable â€” existing data has no outlet)
ALTER TABLE invoices       ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);
ALTER TABLE pos_sessions   ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);
ALTER TABLE pos_orders     ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id);

-- Inter-outlet stock transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_outlet_id  uuid NOT NULL REFERENCES outlets(id),
  to_outlet_id    uuid NOT NULL REFERENCES outlets(id),
  product_id      uuid NOT NULL REFERENCES products(id),
  quantity        numeric(12,4) NOT NULL CHECK (quantity > 0),
  notes           text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by      uuid REFERENCES auth.users(id),
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON stock_transfers
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE INDEX IF NOT EXISTS idx_stock_transfers_org     ON stock_transfers(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from    ON stock_transfers(from_outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to      ON stock_transfers(to_outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_product ON stock_transfers(product_id);

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

-- Phase workspace v2: sub-tasks, task dependencies, KR confidence,
-- checkin mood, meeting attendees/recurring, issue env/priority/due_date, release_items

-- â”€â”€ Tasks: subtasks + dependencies + estimates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€ Key Results: confidence score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table key_results add column if not exists confidence text not null default 'on_track'
  check (confidence in ('on_track','at_risk','off_track'));

-- â”€â”€ Check-ins: mood/energy signal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table checkins add column if not exists mood int check (mood between 1 and 5);

-- â”€â”€ Meetings: attendees + recurring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table meetings add column if not exists attendees jsonb default '[]';
alter table meetings add column if not exists is_recurring boolean not null default false;
alter table meetings add column if not exists recurrence_rule text; -- daily/weekly/biweekly/monthly

-- â”€â”€ Issues: environment, priority, due_date â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table issues add column if not exists environment text not null default 'all'
  check (environment in ('all','production','staging','dev'));
alter table issues add column if not exists priority text not null default 'medium'
  check (priority in ('critical','high','medium','low'));
alter table issues add column if not exists due_date date;

-- â”€â”€ Releases: linked items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
