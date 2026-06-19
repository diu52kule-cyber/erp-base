-- Phase 23: expand the role set companies can assign.
-- Widen the role CHECK constraints on memberships and org_invites.

do $$
declare
  roles text := $r$'owner','admin','manager','accountant','hr','sales','marketing','developer','designer','support','operations','cashier','staff','viewer'$r$;
begin
  execute 'alter table memberships drop constraint if exists memberships_role_check';
  execute format('alter table memberships add constraint memberships_role_check check (role in (%s))', roles);

  execute 'alter table org_invites drop constraint if exists org_invites_role_check';
  execute format('alter table org_invites add constraint org_invites_role_check check (role in (%s))', roles);
end $$;
