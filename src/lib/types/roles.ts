export type OrgRole = 'owner' | 'manager' | 'staff' | 'accountant' | 'hr';

export const ORG_ROLES: OrgRole[] = ['owner', 'manager', 'accountant', 'hr', 'staff'];

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner:      'Owner',
  manager:    'Manager',
  accountant: 'Accountant',
  hr:         'HR',
  staff:      'Staff',
};

export const ROLE_COLORS: Record<OrgRole, string> = {
  owner:      'bg-purple-50 text-purple-700',
  manager:    'bg-blue-50 text-blue-700',
  accountant: 'bg-green-50 text-green-700',
  hr:         'bg-amber-50 text-amber-700',
  staff:      'bg-neutral-100 text-neutral-600',
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner:      'Full access. Can manage team, billing, and all settings.',
  manager:    'Can view and edit all modules. Cannot delete or manage billing.',
  accountant: 'Access to billing, GST, and reports only.',
  hr:         'Access to HR module (employees, attendance, payroll) only.',
  staff:      'Read-only access to assigned modules.',
};

// Role → which module keys that role may access.
// 'all' = every module the org has (owner/manager). Otherwise the role only
// sees the intersection of (org's enabled modules) ∩ (this list).
// Edit these lists to change what each role can see across the whole app.
export const ROLE_MODULES: Record<OrgRole, string[] | 'all'> = {
  owner:   'all',
  manager: 'all',
  accountant: ['billing', 'payments', 'accounting', 'reports', 'expenses', 'purchase', 'subscriptions'],
  hr:         ['hr', 'reports', 'checkins', 'expenses'],
  staff:      ['pos', 'tasks', 'checkins', 'docs', 'issues', 'projects'],
};

// Returns the set of module keys a role may access, or null for unrestricted (all).
export function allowedModulesForRole(role: OrgRole | string): Set<string> | null {
  const allowed = ROLE_MODULES[role as OrgRole];
  if (!allowed || allowed === 'all') return null;
  return new Set(allowed);
}

// Which roles can invite new members
export function canInvite(role: OrgRole): boolean {
  return role === 'owner' || role === 'manager';
}

// Which roles can change another member's role
export function canManageRoles(role: OrgRole): boolean {
  return role === 'owner';
}

// Which roles can remove members
export function canRemoveMember(role: OrgRole): boolean {
  return role === 'owner';
}
