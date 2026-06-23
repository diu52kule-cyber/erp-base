-- Link HR employees to Supabase auth users.
-- An employee with user_id has a login account; without one they are HR-record-only.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Convenience: given a user_id, find their employee record in the same org.
CREATE OR REPLACE FUNCTION get_employee_by_user(p_org_id uuid, p_user_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM employees WHERE org_id = p_org_id AND user_id = p_user_id LIMIT 1;
$$;
