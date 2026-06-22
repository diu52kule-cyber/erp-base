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
  ADD COLUMN IF NOT EXISTS loyalty_earn_rate  numeric(5,2) DEFAULT 1,   -- points per ₹10
  ADD COLUMN IF NOT EXISTS loyalty_redeem_rate numeric(5,2) DEFAULT 1;   -- ₹1 per point
