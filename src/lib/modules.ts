export type ModuleDef = {
  key: string;
  name: string;
  href: string;
  icon: string;
};

export const MODULES: ModuleDef[] = [
  { key: "billing",       name: "Billing & Invoicing",   href: "/dashboard/billing",       icon: "🧾" },
  { key: "payments",      name: "Payments",              href: "/dashboard/payments",      icon: "💳" },
  { key: "inventory",     name: "Inventory",             href: "/dashboard/inventory",     icon: "📦" },
  { key: "pos",           name: "Point of Sale",         href: "/dashboard/pos",           icon: "🛒" },
  { key: "purchase",      name: "Purchase Orders",       href: "/dashboard/purchase",      icon: "📥" },
  { key: "crm",           name: "CRM",                   href: "/dashboard/crm",           icon: "🤝" },
  { key: "hr",            name: "HR",                    href: "/dashboard/hr",            icon: "👥" },
  { key: "subscriptions", name: "Subscriptions",         href: "/dashboard/subscriptions", icon: "🔄" },
  { key: "projects",      name: "Projects",              href: "/dashboard/projects",      icon: "📋" },
  { key: "expenses",      name: "Expenses",              href: "/dashboard/expenses",      icon: "🧮" },
  { key: "accounting",    name: "GST & Accounting",      href: "/dashboard/accounting",    icon: "📊" },
  { key: "reports",       name: "Reports",               href: "/dashboard/reports",       icon: "📈" },
  { key: "import",        name: "Data Import",           href: "/dashboard/import",        icon: "⬆️" },
];

export const ALL_MODULE_KEYS = MODULES.map((m) => m.key);

// Smart presets: which modules are enabled by default for each business type.
// (Admin can always toggle more on per-client from the admin panel.)
export const BUSINESS_PRESETS: Record<string, string[]> = {
  cafe:       ["billing", "payments", "pos", "inventory", "purchase", "expenses", "accounting", "reports"],
  shop:       ["billing", "payments", "pos", "inventory", "purchase", "crm", "accounting", "reports"],
  freelancer: ["billing", "payments", "projects", "expenses", "crm", "accounting", "reports"],
  startup:    ["billing", "payments", "crm", "hr", "subscriptions", "projects", "expenses", "accounting", "reports"],
  mall:       ["billing", "payments", "pos", "inventory", "purchase", "hr", "accounting", "reports", "import"],
  general:    ALL_MODULE_KEYS,
};

export function presetFor(businessType: string | null | undefined): string[] {
  return BUSINESS_PRESETS[businessType ?? "general"] ?? ALL_MODULE_KEYS;
}

// Quick actions surfaced on the tailored dashboard home, per business type.
export type QuickAction = { label: string; href: string; icon: string };

export const BUSINESS_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  cafe: [
    { label: "Open POS register", href: "/dashboard/pos", icon: "🛒" },
    { label: "Add a product", href: "/dashboard/inventory/new", icon: "📦" },
    { label: "New invoice", href: "/dashboard/billing/new", icon: "🧾" },
    { label: "Record an expense", href: "/dashboard/expenses", icon: "🧮" },
  ],
  shop: [
    { label: "Open POS register", href: "/dashboard/pos", icon: "🛒" },
    { label: "Add a product", href: "/dashboard/inventory/new", icon: "📦" },
    { label: "New purchase order", href: "/dashboard/purchase/new", icon: "📥" },
    { label: "Add a customer", href: "/dashboard/crm/contacts/new", icon: "🤝" },
  ],
  freelancer: [
    { label: "New invoice", href: "/dashboard/billing/new", icon: "🧾" },
    { label: "Start a project", href: "/dashboard/projects/new", icon: "📋" },
    { label: "Log an expense", href: "/dashboard/expenses", icon: "🧮" },
    { label: "Add a client", href: "/dashboard/crm/contacts/new", icon: "🤝" },
  ],
  startup: [
    { label: "Add a lead", href: "/dashboard/crm/contacts/new", icon: "🤝" },
    { label: "New subscription", href: "/dashboard/subscriptions/new", icon: "🔄" },
    { label: "Add an employee", href: "/dashboard/hr/employees/new", icon: "👥" },
    { label: "New invoice", href: "/dashboard/billing/new", icon: "🧾" },
  ],
  mall: [
    { label: "Open POS register", href: "/dashboard/pos", icon: "🛒" },
    { label: "New purchase order", href: "/dashboard/purchase/new", icon: "📥" },
    { label: "Add an employee", href: "/dashboard/hr/employees/new", icon: "👥" },
    { label: "Import data", href: "/dashboard/import", icon: "⬆️" },
  ],
  general: [
    { label: "New invoice", href: "/dashboard/billing/new", icon: "🧾" },
    { label: "Add a product", href: "/dashboard/inventory/new", icon: "📦" },
    { label: "Add a contact", href: "/dashboard/crm/contacts/new", icon: "🤝" },
    { label: "View reports", href: "/dashboard/reports", icon: "📈" },
  ],
};

export function quickActionsFor(businessType: string | null | undefined): QuickAction[] {
  return BUSINESS_QUICK_ACTIONS[businessType ?? "general"] ?? BUSINESS_QUICK_ACTIONS.general;
}
