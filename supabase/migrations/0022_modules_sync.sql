-- Phase 21 fix: sync the module catalog with the app MODULES registry.
-- The catalog was missing 'purchase' and 'accounting', which breaks the
-- entitlements FK (entitlements.module_key -> modules.key) when seeding presets.
insert into modules (key, name, description) values
  ('purchase',   'Purchase Orders',  'Vendor purchase orders, GRN, vendor bills'),
  ('accounting', 'GST & Accounting', 'GSTR-1/3B filing, GST settings, HSN codes')
on conflict (key) do nothing;

-- Backfill: existing orgs keep full access (they had all modules before DB gating).
-- New orgs created after this point receive presets via the onboarding flow.
insert into entitlements (org_id, module_key, enabled)
select o.id, m.key, true
from organizations o cross join modules m
on conflict (org_id, module_key) do nothing;
