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

-- Add outlet_id to key transactional tables (nullable — existing data has no outlet)
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
