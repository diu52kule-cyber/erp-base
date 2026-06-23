-- 0054_kds_status.sql
-- G5: Kitchen Display System — kds_status on pos_orders

ALTER TABLE pos_orders
  ADD COLUMN IF NOT EXISTS kds_status text NOT NULL DEFAULT 'new'
  CHECK (kds_status IN ('new', 'preparing', 'ready', 'served'));

CREATE INDEX IF NOT EXISTS idx_pos_orders_kds ON pos_orders(org_id, kds_status) WHERE kds_status != 'served';