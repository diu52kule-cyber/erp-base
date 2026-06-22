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
