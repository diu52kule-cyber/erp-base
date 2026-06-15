export type ModuleDef = {
  key: string;
  name: string;
  href: string;
};

export const MODULES: ModuleDef[] = [
  { key: "billing",       name: "Billing & Invoicing",   href: "/dashboard/billing" },
  { key: "payments",      name: "Payments",              href: "/dashboard/payments" },
  { key: "inventory",     name: "Inventory",             href: "/dashboard/inventory" },
  { key: "pos",           name: "Point of Sale",         href: "/dashboard/pos" },
  { key: "purchase",      name: "Purchase Orders",       href: "/dashboard/purchase" },
  { key: "crm",           name: "CRM",                   href: "/dashboard/crm" },
  { key: "hr",            name: "HR",                    href: "/dashboard/hr" },
  { key: "subscriptions", name: "Subscriptions",         href: "/dashboard/subscriptions" },
  { key: "projects",      name: "Projects",              href: "/dashboard/projects" },
  { key: "expenses",      name: "Expenses",              href: "/dashboard/expenses" },
  { key: "accounting",    name: "GST & Accounting",      href: "/dashboard/accounting" },
  { key: "reports",       name: "Reports",               href: "/dashboard/reports" },
  { key: "import",        name: "Data Import",           href: "/dashboard/import" },
];
