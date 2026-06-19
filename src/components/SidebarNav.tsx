'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { key: string; name: string; href: string; icon: string };
type Group = { cat: string; label: string; items: Item[] };

function linkCls(active: boolean) {
  return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
    active
      ? 'bg-neutral-900 text-white font-medium'
      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
  }`;
}

export default function SidebarNav({ groups }: { groups: Group[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      <Link href="/dashboard" className={linkCls(isActive('/dashboard'))}>
        <span className="text-base leading-none">🏠</span>
        <span>Overview</span>
      </Link>
      {groups.map((g) => (
        <div key={g.cat} className="mt-4">
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            {g.label}
          </div>
          {g.items.map((m) => (
            <Link key={m.key} href={m.href} className={linkCls(isActive(m.href))}>
              <span className="text-base leading-none">{m.icon}</span>
              <span>{m.name}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
