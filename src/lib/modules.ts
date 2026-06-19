export type ModuleCategory = "business" | "workspace";

export type ModuleDef = {
  key: string;
  name: string;
  href: string;
  icon: string;
  category: ModuleCategory;
};

export const MODULES: ModuleDef[] = [
  // ── Business / operations ──
  { key: "billing",       name: "Billing & Invoicing",   href: "/dashboard/billing",       icon: "🧾", category: "business" },
  { key: "payments",      name: "Payments",              href: "/dashboard/payments",      icon: "💳", category: "business" },
  { key: "inventory",     name: "Inventory",             href: "/dashboard/inventory",     icon: "📦", category: "business" },
  { key: "pos",           name: "Point of Sale",         href: "/dashboard/pos",           icon: "🛒", category: "business" },
  { key: "purchase",      name: "Purchase Orders",       href: "/dashboard/purchase",      icon: "📥", category: "business" },
  { key: "crm",           name: "CRM",                   href: "/dashboard/crm",           icon: "🤝", category: "business" },
  { key: "hr",            name: "HR",                    href: "/dashboard/hr",            icon: "👥", category: "business" },
  { key: "subscriptions", name: "Subscriptions",         href: "/dashboard/subscriptions", icon: "🔄", category: "business" },
  { key: "expenses",      name: "Expenses",              href: "/dashboard/expenses",      icon: "🧮", category: "business" },
  { key: "accounting",    name: "GST & Accounting",      href: "/dashboard/accounting",    icon: "📈", category: "business" },
  { key: "reports",       name: "Reports",               href: "/dashboard/reports",       icon: "📉", category: "business" },
  { key: "import",        name: "Data Import",           href: "/dashboard/import",        icon: "⬆️", category: "business" },

  // ── Workspace / Startup OS ──
  { key: "projects",  name: "Projects",         href: "/dashboard/projects",  icon: "📊", category: "workspace" },
  { key: "docs",      name: "Docs & Knowledge", href: "/dashboard/docs",      icon: "📚", category: "workspace" },
  { key: "tasks",     name: "Tasks & Sprints",  href: "/dashboard/tasks",     icon: "✅", category: "workspace" },
  { key: "goals",     name: "Goals & OKRs",     href: "/dashboard/goals",     icon: "🎯", category: "workspace" },
  { key: "features",  name: "Product Pipeline", href: "/dashboard/features",  icon: "🚀", category: "workspace" },
  { key: "meetings",  name: "Meetings",         href: "/dashboard/meetings",  icon: "📝", category: "workspace" },
  { key: "issues",    name: "Issues & Bugs",    href: "/dashboard/issues",    icon: "🐞", category: "workspace" },
  { key: "releases",  name: "Releases",         href: "/dashboard/releases",  icon: "🏷️", category: "workspace" },
  { key: "decisions", name: "Decision Log",     href: "/dashboard/decisions", icon: "⚖️", category: "workspace" },
  { key: "checkins",  name: "Daily Check-ins",  href: "/dashboard/checkins",  icon: "☀️", category: "workspace" },
  { key: "assistant", name: "AI Assistant",     href: "/dashboard/assistant", icon: "✨", category: "workspace" },
];

export const ALL_MODULE_KEYS = MODULES.map((m) => m.key);
export const WORKSPACE_MODULE_KEYS = MODULES.filter((m) => m.category === "workspace").map((m) => m.key);
export const BUSINESS_MODULE_KEYS  = MODULES.filter((m) => m.category === "business").map((m) => m.key);

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  business: "Business",
  workspace: "Workspace",
};

// Smart presets: which modules are enabled by default for each business type.
// (Admin can always toggle more on per-client from the admin panel.)
const TEAM_BASICS = ["docs", "tasks", "checkins"]; // light collaboration for any team

export const BUSINESS_PRESETS: Record<string, string[]> = {
  cafe:       ["billing", "payments", "pos", "inventory", "purchase", "expenses", "accounting", "reports", ...TEAM_BASICS],
  shop:       ["billing", "payments", "pos", "inventory", "purchase", "crm", "accounting", "reports", ...TEAM_BASICS],
  freelancer: ["billing", "payments", "projects", "expenses", "crm", "accounting", "reports",
               "docs", "tasks", "goals", "meetings", "decisions", "checkins", "assistant"],
  startup:    ["billing", "payments", "crm", "hr", "subscriptions", "projects", "expenses", "accounting", "reports",
               ...WORKSPACE_MODULE_KEYS],
  mall:       ["billing", "payments", "pos", "inventory", "purchase", "hr", "accounting", "reports", "import", ...TEAM_BASICS],
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
    { label: "Daily check-in", href: "/dashboard/checkins", icon: "☀️" },
  ],
  shop: [
    { label: "Open POS register", href: "/dashboard/pos", icon: "🛒" },
    { label: "Add a product", href: "/dashboard/inventory/new", icon: "📦" },
    { label: "New purchase order", href: "/dashboard/purchase/new", icon: "📥" },
    { label: "Add a customer", href: "/dashboard/crm/contacts/new", icon: "🤝" },
  ],
  freelancer: [
    { label: "New invoice", href: "/dashboard/billing/new", icon: "🧾" },
    { label: "New task", href: "/dashboard/tasks", icon: "✅" },
    { label: "Write a doc", href: "/dashboard/docs", icon: "📚" },
    { label: "Daily check-in", href: "/dashboard/checkins", icon: "☀️" },
  ],
  startup: [
    { label: "New task", href: "/dashboard/tasks", icon: "✅" },
    { label: "Set a goal", href: "/dashboard/goals", icon: "🎯" },
    { label: "Log a meeting", href: "/dashboard/meetings", icon: "📝" },
    { label: "Ask AI", href: "/dashboard/assistant", icon: "✨" },
  ],
  mall: [
    { label: "Open POS register", href: "/dashboard/pos", icon: "🛒" },
    { label: "New purchase order", href: "/dashboard/purchase/new", icon: "📥" },
    { label: "Add an employee", href: "/dashboard/hr/employees/new", icon: "👥" },
    { label: "Daily check-in", href: "/dashboard/checkins", icon: "☀️" },
  ],
  general: [
    { label: "New invoice", href: "/dashboard/billing/new", icon: "🧾" },
    { label: "New task", href: "/dashboard/tasks", icon: "✅" },
    { label: "Write a doc", href: "/dashboard/docs", icon: "📚" },
    { label: "View reports", href: "/dashboard/reports", icon: "📈" },
  ],
};

export function quickActionsFor(businessType: string | null | undefined): QuickAction[] {
  return BUSINESS_QUICK_ACTIONS[businessType ?? "general"] ?? BUSINESS_QUICK_ACTIONS.general;
}
