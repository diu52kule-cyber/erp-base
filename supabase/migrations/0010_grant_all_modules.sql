-- Grant every module to every existing organisation (backfill).
-- create_organization RPC already does this for new orgs via `select key from modules`.
insert into entitlements (org_id, module_key, enabled)
select o.id, m.key, true
from organizations o
cross join modules m
on conflict (org_id, module_key) do update set enabled = true;
