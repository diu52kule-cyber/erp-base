export type OrgRole =
  // Core permission tiers
  | 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'
  // Functional cross-industry
  | 'accountant' | 'hr' | 'sales' | 'marketing'
  | 'developer' | 'designer' | 'support' | 'operations' | 'cashier'
  // Product development (software + all sectors)
  | 'product_manager' | 'qa' | 'devops' | 'data_analyst'
  | 'content_creator' | 'customer_success' | 'business_dev'
  // Sector-specific operational
  | 'warehouse' | 'procurement' | 'chef' | 'store_manager';

export const ORG_ROLES: OrgRole[] = [
  // Core
  'owner', 'admin', 'manager',
  // Functional
  'accountant', 'hr', 'sales', 'marketing',
  'developer', 'designer', 'support', 'operations', 'cashier',
  // Product / tech
  'product_manager', 'qa', 'devops', 'data_analyst',
  'content_creator', 'customer_success', 'business_dev',
  // Sector-specific
  'warehouse', 'procurement', 'chef', 'store_manager',
  // Access tiers
  'staff', 'viewer',
];

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner:            'Owner',
  admin:            'Admin',
  manager:          'Manager',
  accountant:       'Accountant',
  hr:               'HR',
  sales:            'Sales',
  marketing:        'Marketing',
  developer:        'Developer',
  designer:         'Designer',
  support:          'Support',
  operations:       'Operations',
  cashier:          'Cashier',
  staff:            'Staff',
  viewer:           'Viewer',
  product_manager:  'Product Manager',
  qa:               'QA / Tester',
  devops:           'DevOps / Infra',
  data_analyst:     'Data Analyst',
  content_creator:  'Content Creator',
  customer_success: 'Customer Success',
  business_dev:     'Business Dev',
  warehouse:        'Warehouse',
  procurement:      'Procurement',
  chef:             'Chef / Kitchen',
  store_manager:    'Store Manager',
};

export const ROLE_COLORS: Record<OrgRole, string> = {
  owner:            'bg-purple-50 text-purple-700',
  admin:            'bg-red-50 text-red-700',
  manager:          'bg-blue-50 text-blue-700',
  accountant:       'bg-green-50 text-green-700',
  hr:               'bg-amber-50 text-amber-700',
  sales:            'bg-orange-50 text-orange-700',
  marketing:        'bg-indigo-50 text-indigo-700',
  developer:        'bg-blue-50 text-blue-700',
  designer:         'bg-purple-50 text-purple-700',
  support:          'bg-yellow-50 text-yellow-700',
  operations:       'bg-amber-50 text-amber-700',
  cashier:          'bg-green-50 text-green-700',
  staff:            'bg-neutral-100 text-neutral-600',
  viewer:           'bg-neutral-100 text-neutral-600',
  product_manager:  'bg-rose-50 text-rose-700',
  qa:               'bg-teal-50 text-teal-700',
  devops:           'bg-slate-100 text-slate-700',
  data_analyst:     'bg-cyan-50 text-cyan-700',
  content_creator:  'bg-pink-50 text-pink-700',
  customer_success: 'bg-emerald-50 text-emerald-700',
  business_dev:     'bg-violet-50 text-violet-700',
  warehouse:        'bg-stone-100 text-stone-700',
  procurement:      'bg-lime-50 text-lime-700',
  chef:             'bg-orange-50 text-orange-700',
  store_manager:    'bg-sky-50 text-sky-700',
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner:            'Full access to every module, the team, billing, and all settings.',
  admin:            'Full access to all modules and team management (not billing ownership).',
  manager:          'Full access to all modules; runs day-to-day operations.',
  accountant:       'Finance & books: billing, payments, GST/accounting, purchases, expenses, reports.',
  hr:               'People ops: employees, attendance, payroll, expenses, onboarding docs, meetings.',
  sales:            'Revenue: CRM, billing, payments, POS, subscriptions, tasks, meetings.',
  marketing:        'Growth: CRM, reports, docs, goals, meetings.',
  developer:        'Engineering: projects, tasks, issues, features, releases, docs, decisions.',
  designer:         'Design: projects, tasks, features, docs, meetings.',
  support:          'Customer support: CRM, issues, docs, tasks.',
  operations:       'Ops: inventory, purchases, POS, projects, reports, tasks.',
  cashier:          'Front counter: POS, inventory only.',
  staff:            'General staff: POS, inventory, projects, tasks, docs, meetings.',
  viewer:           'Read-only: reports and docs.',
  product_manager:  'Product: roadmap (features), goals/OKRs, projects, tasks, issues, releases, meetings, decisions, docs. Spans software, F&B, manufacturing, retail, and education product roles.',
  qa:               'Quality assurance: issues, tasks, releases, projects, docs. Covers QA engineers, QC inspectors, and food safety roles.',
  devops:           'Infrastructure & releases: issues, releases, projects, tasks, docs. Covers DevOps, SRE, IT ops, and plant maintenance.',
  data_analyst:     'Analytics: reports, accounting, docs, tasks, goals. Covers data scientists, BI analysts, and research roles.',
  content_creator:  'Content & brand: docs, tasks, goals, meetings, CRM. Covers copywriters, video editors, social media managers, and curriculum developers.',
  customer_success: 'CS & retention: CRM, issues, tasks, meetings, docs, subscriptions. Covers CSMs, account managers, and patient-care coordinators.',
  business_dev:     'Growth & deals: CRM, billing, subscriptions, tasks, meetings, docs. Covers BD managers, partnership leads, and franchise development roles.',
  warehouse:        'Warehouse & stock: inventory, purchases, tasks. Covers warehouse staff, stockroom associates, and cold-chain operators.',
  procurement:      'Purchasing: purchases, inventory, reports, tasks. Covers procurement officers, buyers, and raw-material sourcing.',
  chef:             'Kitchen & menu: inventory, tasks, docs, expenses. Covers head chefs, sous chefs, R&D kitchen roles, and baristas.',
  store_manager:    'Retail & store: POS, inventory, billing, payments, reports, tasks. Covers store managers, branch managers, and outlet supervisors.',
};

export const ROLE_MODULES: Record<OrgRole, string[] | 'all'> = {
  owner:   'all',
  admin:   'all',
  manager: 'all',
  accountant: [
    'billing', 'payments', 'ledger', 'accounting', 'reports', 'expenses', 'purchase', 'subscriptions', 'import',
    'docs', 'tasks', 'checkins', 'decisions', 'assistant', 'teams',
  ],
  hr: [
    'hr', 'reports', 'expenses', 'import',
    'docs', 'tasks', 'goals', 'meetings', 'checkins', 'decisions', 'assistant', 'teams',
  ],
  sales: [
    'crm', 'billing', 'payments', 'ledger', 'pos', 'subscriptions', 'reports',
    'docs', 'tasks', 'meetings', 'checkins', 'assistant', 'teams',
  ],
  marketing: [
    'crm', 'reports',
    'docs', 'tasks', 'goals', 'meetings', 'checkins', 'assistant', 'teams',
  ],
  developer: [
    'projects', 'tasks', 'issues', 'features', 'releases', 'docs', 'decisions', 'checkins', 'assistant', 'teams',
  ],
  designer: [
    'projects', 'tasks', 'features', 'docs', 'meetings', 'checkins', 'assistant', 'teams',
  ],
  support: [
    'crm', 'issues', 'docs', 'tasks', 'checkins', 'assistant', 'teams',
  ],
  operations: [
    'inventory', 'purchase', 'pos', 'projects', 'reports',
    'tasks', 'checkins', 'assistant', 'teams',
  ],
  cashier: [
    'pos', 'inventory', 'checkins',
  ],
  staff: [
    'pos', 'inventory',
    'projects', 'tasks', 'issues', 'features', 'docs', 'meetings', 'checkins', 'assistant', 'teams',
  ],
  viewer: [
    'reports', 'docs',
  ],
  // ── Product development roles ──────────────────────────────────────────
  product_manager: [
    'features', 'goals', 'projects', 'tasks', 'issues', 'releases', 'meetings', 'decisions', 'docs', 'checkins', 'assistant', 'teams',
    'reports', // need visibility into business metrics
  ],
  qa: [
    'issues', 'tasks', 'releases', 'projects', 'docs', 'checkins', 'assistant', 'teams',
  ],
  devops: [
    'issues', 'releases', 'projects', 'tasks', 'docs', 'checkins', 'assistant', 'teams',
  ],
  data_analyst: [
    'reports', 'accounting', 'docs', 'tasks', 'goals', 'checkins', 'assistant', 'teams',
  ],
  content_creator: [
    'docs', 'tasks', 'goals', 'meetings', 'checkins', 'crm', 'assistant', 'teams',
  ],
  customer_success: [
    'crm', 'issues', 'tasks', 'meetings', 'checkins', 'docs', 'subscriptions', 'assistant', 'teams',
  ],
  business_dev: [
    'crm', 'billing', 'subscriptions', 'tasks', 'meetings', 'docs', 'goals', 'checkins', 'assistant', 'teams',
  ],
  // ── Sector-specific operational roles ─────────────────────────────────
  warehouse: [
    'inventory', 'purchase', 'tasks', 'checkins', 'teams',
  ],
  procurement: [
    'purchase', 'inventory', 'reports', 'tasks', 'checkins', 'teams',
  ],
  chef: [
    'inventory', 'tasks', 'docs', 'expenses', 'checkins', 'meetings', 'teams',
  ],
  store_manager: [
    'pos', 'inventory', 'billing', 'payments', 'reports', 'tasks', 'checkins', 'expenses', 'assistant', 'teams',
  ],
};

export function allowedModulesForRole(role: OrgRole | string): Set<string> | null {
  const allowed = ROLE_MODULES[role as OrgRole];
  if (!allowed || allowed === 'all') return null;
  return new Set(allowed);
}

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

// Roles grouped by category — useful for role picker UIs
export const ROLE_GROUPS: { label: string; roles: OrgRole[] }[] = [
  { label: 'Leadership',      roles: ['owner', 'admin', 'manager'] },
  { label: 'Business',        roles: ['accountant', 'hr', 'sales', 'marketing', 'operations', 'support'] },
  { label: 'Product & Tech',  roles: ['product_manager', 'developer', 'designer', 'qa', 'devops', 'data_analyst'] },
  { label: 'Growth',          roles: ['customer_success', 'business_dev', 'content_creator'] },
  { label: 'Retail & Ops',    roles: ['store_manager', 'cashier', 'warehouse', 'procurement'] },
  { label: 'Food & Beverage', roles: ['chef'] },
  { label: 'Access',          roles: ['staff', 'viewer'] },
];
