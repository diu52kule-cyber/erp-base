-- 0046_employee_self_service.sql
-- D14: Employee self-service portal token

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS self_service_token uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS self_service_enabled boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_self_service_token
  ON employees(self_service_token) WHERE self_service_token IS NOT NULL;
