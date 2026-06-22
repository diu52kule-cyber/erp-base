-- 0053_guest_access.sql
-- C9: Guest access — memberships.is_guest + per-guest module whitelist

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_modules text[] DEFAULT '{}';

-- Also add guest support to the invite table so the link carries guest info
ALTER TABLE org_invites
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_modules text[] DEFAULT '{}';

-- Index for fast guest lookups
CREATE INDEX IF NOT EXISTS idx_memberships_guest ON memberships(org_id) WHERE is_guest = true;
