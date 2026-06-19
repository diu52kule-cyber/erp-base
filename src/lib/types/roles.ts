export type OrgRole =
  | 'owner' | 'admin' | 'manager'
  | 'accountant' | 'hr'
  | 'sales' | 'marketing' | 'developer' | 'designer' | 'support'
  | 'operations' | 'cashier' | 'staff' | 'viewer';

// Order shown in the role picker
export const ORG_ROLES: OrgRole[] = [
  'owner', 'admin', 'manager',
  'accountant', 'hr',
  'sales', 'marketing', 'developer', 'designer', 'support',
  'operations', 'cashier', 'staff', 'viewer',
];

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner:      'Owner',
  admin:      'Admin',
  manager:    'Manager',
  accountant: 'Accountant',
  hr:         'HR',
  sales:      'Sales',
  marketing:  'Marketing',
  developer:  'Developer',
  designer:   'Designer',
  support:    'Support',
  operations: 'Operations',
  cashier:    'Cashier',
  staff:      'Staff',
  viewer:     'Viewer',
};

export const ROLE_COLORS: Record<OrgRole, string> = {
  owner:      'bg-purple-50 text-purple-700',
  admin:      'bg-red-50 text-red-700',
  manager:    'bg-blue-50 text-blue-700',
  accountant: 'bg-green-50 text-green-700',
  hr:         'bg-amber-50 text-amber-700',
  sales:      'bg-orange-50 text-orange-700',
  marketing:  'bg-indigo-50 text-indigo-700',
  developer:  'bg-blue-50 text-blue-700',
  designer:   'bg-purple-50 text-purple-700',
  support:    'bg-yellow-50 text-yellow-700',
  operations: 'bg-amber-50 text-amber-700',
  cashier:    'bg-green-50 text-green-700',
  staff:      'bg-neutral-100 text-neutral-600',
  viewer:     'bg-neutral-100 text-neutral-600',
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner:      'Full access to every module, the team, billing, and all settings.',
  admin:      'Full access to all modules and team management (not billing ownership).',
  manager:    'Full access to all modules; runs day-to-day operations.',
  accountant: 'Finance & books: billing, payments, GST/accounting, purchases, expenses, reports + shared docs & tasks.',
  hr:         'People ops: employees, attendance, payroll, expenses, onboarding docs, meetings & check-ins.',
  sales:      'Revenue: CRM, billing, payments, POS, subscriptions + tasks, meetings & check-ins.',
  marketing:  'Growth: CRM, reports, docs, goals, meetings & check-ins.',
  developer:  'Engineering: projects, tasks, issues, features, releases, docs & decisions.',
  designer:   'Design: projects, tasks, features, docs & meetings.',
  support:    'Customer support: CRM, issues, docs, tasks & check-ins.',
  operations: 'Ops: inventory, purchases, POS, projects, reports, tasks & check-ins.',
  cashier:    'Front counter: POS, inventory & check-ins only.',
  staff:      'Execution: POS, inventory, projects, tasks, issues + team docs, meetings & check-ins.',
  viewer:     'Read-only: reports and docs.',
};

// Role → which module keys that role may access.
// 'all' = every module the org has (owner/admin/manager). Otherwise the role only
// sees the intersection of (org's enabled modules) ∩ (this list).
// Effective access = org's enabled modules ∩ this list, so lists can be broad.
export const ROLE_MODULES: Record<OrgRole, string[] | 'all'> = {
  owner:   'all',
  admin:   'all',
  manager: 'all',
  accountant: [
    'billing', 'payments', 'accounting', 'reports', 'expenses', 'purchase', 'subscriptions', 'import',
    'docs', 'tasks', 'checkins', 'decisions', 'assistant',
  ],
  hr: [
    'hr', 'reports', 'expenses', 'import',
    'docs', 'tasks', 'goals', 'meetings', 'checkins', 'decisions', 'assistant',
  ],
  sales: [
    'crm', 'billing', 'payments', 'pos', 'subscriptions', 'reports',
    'docs', 'tasks', 'meetings', 'checkins', 'assistant',
  ],
  marketing: [
    'crm', 'reports',
    'docs', 'tasks', 'goals', 'meetings', 'checkins', 'assistant',
  ],
  developer: [
    'projects', 'tasks', 'issues', 'features', 'releases', 'docs', 'decisions', 'checkins', 'assistant',
  ],
  designer: [
    'projects', 'tasks', 'features', 'docs', 'meetings', 'checkins', 'assistant',
  ],
  support: [
    'crm', 'issues', 'docs', 'tasks', 'checkins', 'assistant',
  ],
  operations: [
    'inventory', 'purchase', 'pos', 'projects', 'reports',
    'tasks', 'checkins', 'assistant',
  ],
  cashier: [
    'pos', 'inventory', 'checkins',
  ],
  staff: [
    'pos', 'inventory',
    'projects', 'tasks', 'issues', 'features', 'docs', 'meetings', 'checkins', 'assistant',
  ],
  viewer: [
    'reports', 'docs',
  ],
};

// Returns the set of module keys a role may access, or null for unrestricted (all).
export function allowedModulesForRole(role: OrgRole | string): Set<string> | null {
  const allowed = ROLE_MODULES[role as OrgRole];
  if (!allowed || allowed === 'all') return null;
  return new Set(allowed);
}

// Roles that can manage the team (the "admin tier")
const ADMIN_TIER: OrgRole[] = ['owner', 'admin'];

export function canInvite(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager';
}

export function canManageRoles(role: OrgRole): boolean {
  return ADMIN_TIER.includes(role);
}

export function canRemoveMember(role: OrgRole): boolean {
  return ADMIN_TIER.includes(role);
}
