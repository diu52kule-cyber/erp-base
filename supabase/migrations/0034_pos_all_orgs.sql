-- 0034_pos_all_orgs.sql
-- Grant POS entitlement to all existing orgs that don't already have it.
-- New orgs receive it from the updated presets in modules.ts.
insert into entitlements (org_id, module_key, enabled)
select o.id, 'pos', true
from organizations o
where not exists (
  select 1 from entitlements e where e.org_id = o.id and e.module_key = 'pos'
)
on conflict (org_id, module_key) do update set enabled = true;
