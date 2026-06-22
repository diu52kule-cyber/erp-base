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
