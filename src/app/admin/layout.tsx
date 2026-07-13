'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin',           icon: '📊', label: 'Overview',  exact: true },
  { href: '/admin/clients',   icon: '🏢', label: 'Clients',   exact: false },
  { href: '/admin/analytics', icon: '📈', label: 'Analytics', exact: false },
  { href: '/admin/settings',  icon: '⚙️', label: 'Settings',  exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-4 border-b border-neutral-100">
          <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Admin Panel</div>
          <div className="mt-1 text-sm font-semibold text-neutral-800">Gradia</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-neutral-100 space-y-2">
          <Link href="/dashboard" className="block text-xs text-neutral-400 hover:text-neutral-600">← Back to dashboard</Link>
          <AdminLogout />
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map(({ href, icon, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-neutral-900 text-white font-medium'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}>
            <span className="text-lg">{icon}</span> {label}
          </Link>
        );
      })}
    </>
  );
}

function AdminLogout() {
  return (
    <form action="/api/admin/auth/logout" method="POST">
      <button type="submit" className="text-xs text-red-400 hover:text-red-600">Sign out</button>
    </form>
  );
}
