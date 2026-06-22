-- 0042_archive_reminders.sql
-- Soft-delete for employees; reminder tracking on invoices.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_employees_active
  ON employees(org_id) WHERE archived_at IS NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;
