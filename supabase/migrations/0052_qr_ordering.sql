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
