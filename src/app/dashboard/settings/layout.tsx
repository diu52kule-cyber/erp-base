import Link from 'next/link';

const SETTINGS_NAV = [
  { href: '/dashboard/settings/team', label: 'Team Members' },
  { href: '/dashboard/settings/currencies', label: 'Currencies' },
  { href: '/dashboard/settings/api', label: 'API Keys' },
  { href: '/dashboard/settings/webhooks', label: 'Webhooks' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-8">
      <nav className="w-48 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Settings</p>
        <ul className="space-y-1">
          {SETTINGS_NAV.map((item) => (
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
