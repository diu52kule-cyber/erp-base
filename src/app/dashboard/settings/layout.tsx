import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import type { OrgRole } from '@/lib/types/roles';

type NavItem = { href: string; label: string; roles: OrgRole[] | 'all' };

const SETTINGS_NAV: NavItem[] = [
  { href: '/dashboard/settings/preferences', label: 'Preferences', roles: 'all' },
  { href: '/dashboard/settings/business',    label: 'Business type', roles: ['owner', 'admin'] },
  { href: '/dashboard/settings/team',        label: 'Team Members',  roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/settings/departments', label: 'Departments',   roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/settings/invoice',      label: 'Invoice settings', roles: ['owner', 'admin', 'manager', 'accountant'] },
  { href: '/dashboard/settings/doc-numbers', label: 'Doc Numbering',   roles: ['owner', 'admin'] },
  { href: '/dashboard/settings/currencies',  label: 'Currencies',   roles: ['owner', 'admin', 'manager', 'accountant'] },
  { href: '/dashboard/settings/api',         label: 'API Keys',     roles: ['owner', 'admin'] },
  { href: '/dashboard/settings/webhooks',    label: 'Webhooks',     roles: ['owner', 'admin'] },
  { href: '/dashboard/settings/outlets',      label: 'Outlets',      roles: ['owner', 'admin'] },
  { href: '/dashboard/settings/automations',  label: 'Automations',  roles: ['owner', 'admin'] },
  { href: '/dashboard/settings/audit',       label: 'Audit Log',    roles: ['owner', 'admin', 'manager'] },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  const role = (ctx?.org?.role ?? 'staff') as OrgRole;
  const visible = SETTINGS_NAV.filter((i) => i.roles === 'all' || i.roles.includes(role));

  return (
    <div className="flex gap-8">
      <nav className="w-48 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Settings</p>
        <ul className="space-y-1">
          {visible.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
