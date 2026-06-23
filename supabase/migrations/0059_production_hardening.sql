-- ============================================================
-- 0059 Production Hardening
-- ============================================================

-- ── 1. Atomic document-number sequences ─────────────────────
CREATE TABLE IF NOT EXISTS doc_sequences (
  org_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prefix   text NOT NULL,
  year     text NOT NULL,
  last_seq integer NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, prefix, year)
);
ALTER TABLE doc_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_seq_org" ON doc_sequences FOR ALL USING (is_org_member(org_id));

-- Seed sequences from existing invoices so numbering continues correctly
INSERT INTO doc_sequences (org_id, prefix, year, last_seq)
SELECT
  org_id,
  CASE
    WHEN invoice_number ~ '^QUO-[0-9]{4}-' THEN 'QUO'
    WHEN invoice_number ~ '^PI-[0-9]{4}-'  THEN 'PI'
    WHEN invoice_number ~ '^DC-[0-9]{4}-'  THEN 'DC'
    WHEN invoice_number ~ '^CN-[0-9]{4}-'  THEN 'CN'
    ELSE 'INV'
  END AS prefix,
  SUBSTRING(invoice_number FROM '[0-9]{4}') AS year,
  MAX(CAST(NULLIF(REGEXP_REPLACE(invoice_number, '^[A-Z]+-[0-9]{4}-0*', ''), '') AS INTEGER)) AS last_seq
FROM invoices
WHERE invoice_number IS NOT NULL
  AND invoice_number ~ '^(INV|QUO|PI|DC|CN)-[0-9]{4}-[0-9]+'
GROUP BY org_id, prefix, year
ON CONFLICT (org_id, prefix, year) DO UPDATE
  SET last_seq = GREATEST(doc_sequences.last_seq, EXCLUDED.last_seq);

-- Seed from purchase orders
INSERT INTO doc_sequences (org_id, prefix, year, last_seq)
SELECT
  org_id,
  'PO' AS prefix,
  SUBSTRING(po_number FROM '[0-9]{4}') AS year,
  MAX(CAST(NULLIF(REGEXP_REPLACE(po_number, '^PO-[0-9]{4}-0*', ''), '') AS INTEGER)) AS last_seq
FROM purchase_orders
WHERE po_number IS NOT NULL AND po_number ~ '^PO-[0-9]{4}-[0-9]+'
GROUP BY org_id, year
ON CONFLICT (org_id, prefix, year) DO UPDATE
  SET last_seq = GREATEST(doc_sequences.last_seq, EXCLUDED.last_seq);

-- ── 2. Atomic next_document_number (replaces SELECT MAX+1) ──
CREATE OR REPLACE FUNCTION next_document_number(p_org_id uuid, p_doc_type text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER VOLATILE AS $$
DECLARE
  v_seq     integer;
  v_year    text;
  v_prefix  text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_prefix := CASE p_doc_type
    WHEN 'quotation'        THEN 'QUO'
    WHEN 'proforma'         THEN 'PI'
    WHEN 'delivery_challan' THEN 'DC'
    WHEN 'credit_note'      THEN 'CN'
    ELSE 'INV'
  END;

  -- Try to read custom prefix from org_doc_settings if table exists
  BEGIN
    EXECUTE format(
      'SELECT prefix FROM org_doc_settings WHERE org_id = $1 AND doc_type = $2 AND prefix IS NOT NULL'
    ) INTO v_prefix USING p_org_id, p_doc_type;
    IF v_prefix IS NULL THEN
      v_prefix := CASE p_doc_type
        WHEN 'quotation' THEN 'QUO' WHEN 'proforma' THEN 'PI'
        WHEN 'delivery_challan' THEN 'DC' WHEN 'credit_note' THEN 'CN'
        ELSE 'INV' END;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- Atomic upsert — guaranteed no duplicate
  INSERT INTO doc_sequences (org_id, prefix, year, last_seq)
  VALUES (p_org_id, v_prefix, v_year, 1)
  ON CONFLICT (org_id, prefix, year)
  DO UPDATE SET last_seq = doc_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_prefix || '-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END; $$;
GRANT EXECUTE ON FUNCTION next_document_number(uuid, text) TO authenticated;

-- ── 3. Atomic next_po_number ────────────────────────────────
CREATE OR REPLACE FUNCTION next_po_number(p_org_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER VOLATILE AS $$
DECLARE
  v_seq  integer;
  v_year text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  INSERT INTO doc_sequences (org_id, prefix, year, last_seq)
  VALUES (p_org_id, 'PO', v_year, 1)
  ON CONFLICT (org_id, prefix, year)
  DO UPDATE SET last_seq = doc_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN 'PO-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END; $$;
GRANT EXECUTE ON FUNCTION next_po_number(uuid) TO authenticated;

-- ── 4. Atomic next_grn_number ───────────────────────────────
CREATE OR REPLACE FUNCTION next_grn_number(p_org_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER VOLATILE AS $$
DECLARE
  v_seq  integer;
  v_year text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  INSERT INTO doc_sequences (org_id, prefix, year, last_seq)
  VALUES (p_org_id, 'GRN', v_year, 1)
  ON CONFLICT (org_id, prefix, year)
  DO UPDATE SET last_seq = doc_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;
  RETURN 'GRN-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END; $$;
GRANT EXECUTE ON FUNCTION next_grn_number(uuid) TO authenticated;

-- ── 5. Atomic stock adjustment (replaces read-modify-write) ─
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id uuid,
  p_org_id     uuid,
  p_delta      numeric
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_qty numeric;
BEGIN
  UPDATE products
  SET stock_qty = ROUND((COALESCE(stock_qty, 0) + p_delta)::numeric, 3)
  WHERE id = p_product_id AND org_id = p_org_id
  RETURNING stock_qty INTO v_qty;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  RETURN v_qty;
END; $$;
GRANT EXECUTE ON FUNCTION adjust_stock(uuid, uuid, numeric) TO authenticated;

-- ── 6. Audit log trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id    uuid;
  v_entity_id uuid;
  v_old       jsonb;
  v_new       jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.org_id; v_entity_id := OLD.id;
    v_old := to_jsonb(OLD); v_new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_org_id := NEW.org_id; v_entity_id := NEW.id;
    v_old := NULL; v_new := to_jsonb(NEW);
  ELSE
    v_org_id := NEW.org_id; v_entity_id := NEW.id;
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_log (org_id, user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (v_org_id, auth.uid(), TG_OP, TG_TABLE_NAME, v_entity_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;

-- Apply to key financial tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['invoices','payments','purchase_orders','expense_claims','journal_entries']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS _audit_%1$I ON %1$I;
       CREATE TRIGGER _audit_%1$I
       AFTER INSERT OR UPDATE OR DELETE ON %1$I
       FOR EACH ROW EXECUTE FUNCTION log_audit_event();',
      t
    );
  END LOOP;
END $$;

-- payroll_runs (may not exist yet — wrap in exception)
DO $$
BEGIN
  EXECUTE '
    DROP TRIGGER IF EXISTS _audit_payroll_runs ON payroll_runs;
    CREATE TRIGGER _audit_payroll_runs
    AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();
  ';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 7. org_is_active helper for trial-lock ───────────────────
CREATE OR REPLACE FUNCTION org_is_active(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_plans
    WHERE org_id = p_org_id
      AND status IN ('active', 'trial')
      AND (status = 'active' OR next_billing_date IS NULL OR next_billing_date >= CURRENT_DATE)
  );
$$;
GRANT EXECUTE ON FUNCTION org_is_active(uuid) TO authenticated, anon;

-- ── 8. Rate-limit table (auth endpoint protection) ───────────
CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  count        integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
-- No RLS — only accessed via service role in API routes

-- ── 9. Composite indexes for common query patterns ───────────
CREATE INDEX IF NOT EXISTS idx_invoices_org_created    ON invoices        (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status     ON invoices        (org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_doctype    ON invoices        (org_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_contacts_org_created    ON contacts        (org_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_org_type       ON contacts        (org_id, type) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_org_created    ON products        (org_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_org_created    ON payments        (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_org           ON employees       (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created   ON audit_log       (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org     ON purchase_orders (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_org_assignee      ON tasks           (org_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications   (user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_org      ON backup_history  (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_org_stage         ON deals           (org_id, stage) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_claims_org      ON expense_claims  (org_id, status, created_at DESC);
