-- Phase 25: RLS role enforcement (real, DB-level access control by role).
-- Replaces the permissive "any org member" policies on tenant tables with
-- role-aware policies. Owner/Admin/Manager always have full access (safety net),
-- so an org owner can never lock themselves out.

-- 1. Role → module mapping (mirrors ROLE_MODULES in src/lib/types/roles.ts).
create table if not exists role_modules (
  role       text not null,
  module_key text not null,
  primary key (role, module_key)
);

insert into role_modules (role, module_key) values
  ('accountant','billing'),('accountant','payments'),('accountant','accounting'),('accountant','reports'),('accountant','expenses'),('accountant','purchase'),('accountant','subscriptions'),('accountant','import'),('accountant','docs'),('accountant','tasks'),('accountant','checkins'),('accountant','decisions'),('accountant','assistant'),
  ('hr','hr'),('hr','reports'),('hr','expenses'),('hr','import'),('hr','docs'),('hr','tasks'),('hr','goals'),('hr','meetings'),('hr','checkins'),('hr','decisions'),('hr','assistant'),
  ('sales','crm'),('sales','billing'),('sales','payments'),('sales','pos'),('sales','subscriptions'),('sales','reports'),('sales','docs'),('sales','tasks'),('sales','meetings'),('sales','checkins'),('sales','assistant'),
  ('marketing','crm'),('marketing','reports'),('marketing','docs'),('marketing','tasks'),('marketing','goals'),('marketing','meetings'),('marketing','checkins'),('marketing','assistant'),
  ('developer','projects'),('developer','tasks'),('developer','issues'),('developer','features'),('developer','releases'),('developer','docs'),('developer','decisions'),('developer','checkins'),('developer','assistant'),
  ('designer','projects'),('designer','tasks'),('designer','features'),('designer','docs'),('designer','meetings'),('designer','checkins'),('designer','assistant'),
  ('support','crm'),('support','issues'),('support','docs'),('support','tasks'),('support','checkins'),('support','assistant'),
  ('operations','inventory'),('operations','purchase'),('operations','pos'),('operations','projects'),('operations','reports'),('operations','tasks'),('operations','checkins'),('operations','assistant'),
  ('cashier','pos'),('cashier','inventory'),('cashier','checkins'),
  ('staff','pos'),('staff','inventory'),('staff','projects'),('staff','tasks'),('staff','issues'),('staff','features'),('staff','docs'),('staff','meetings'),('staff','checkins'),('staff','assistant'),
  ('viewer','reports'),('viewer','docs')
on conflict do nothing;

alter table role_modules enable row level security;
drop policy if exists role_modules_read on role_modules;
create policy role_modules_read on role_modules for select to authenticated using (true);

-- 2. Helper: does the current user's role allow this module in this org?
create or replace function has_module_access(p_org_id uuid, p_module text)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from memberships m
    where m.org_id = p_org_id and m.user_id = auth.uid()
      and ( m.role in ('owner','admin','manager')
         or exists (select 1 from role_modules rm where rm.role = m.role and rm.module_key = p_module) )
  );
$$;

-- 3. Replace policies on each tenant table with a role-aware one.
--    Drops ALL existing policies on the table first so no permissive policy lingers.
do $$
declare r record; pol record;
begin
  for r in select * from (values
    ('invoices','billing'),('invoice_items','billing'),('payments','billing'),('accounting_settings','accounting'),
    ('products','inventory'),('stock_movements','inventory'),
    ('pos_sessions','pos'),('pos_orders','pos'),('pos_order_lines','pos'),
    ('contacts','crm'),('deals','crm'),
    ('employees','hr'),('attendance','hr'),('payroll_runs','hr'),('payroll_entries','hr'),('statutory_settings','hr'),
    ('subscription_plans','subscriptions'),('customer_subscriptions','subscriptions'),
    ('projects','projects'),('time_entries','projects'),
    ('expense_categories','expenses'),('expense_claims','expenses'),
    ('docs','docs'),('doc_versions','docs'),
    ('tasks','tasks'),('sprints','tasks'),
    ('goals','goals'),('key_results','goals'),
    ('meetings','meetings'),('action_items','meetings'),
    ('issues','issues'),('releases','releases'),('decisions','decisions'),
    ('checkins','checkins'),('features','features')
  ) as t(tbl, module)
  loop
    -- skip tables that don't exist in this database
    if to_regclass('public.' || r.tbl) is null then continue; end if;
    for pol in select policyname from pg_policies where schemaname='public' and tablename=r.tbl loop
      execute format('drop policy %I on %I;', pol.policyname, r.tbl);
    end loop;
    execute format(
      'create policy "role access" on %I for all using (has_module_access(org_id, %L)) with check (has_module_access(org_id, %L));',
      r.tbl, r.module, r.module
    );
  end loop;
end $$;
