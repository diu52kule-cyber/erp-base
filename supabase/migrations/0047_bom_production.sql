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
