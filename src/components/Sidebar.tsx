'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo, APP_NAME } from '@/components/Brand';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';

type Item = { key: string; name: string; href: string; icon: string };
type Group = { cat: string; label: string; items: Item[] };

export default function Sidebar({
  orgName, businessType, initial, userEmail, roleLabel, roleColor, groups,
}: {
  orgName: string; businessType: string; initial: string;
  userEmail: string; roleLabel: string; roleColor: string; groups: Group[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebar-collapsed') === '1');
      setClosedGroups(JSON.parse(localStorage.getItem('sidebar-groups') || '{}'));
    } catch {}
  }, []);
  // close the mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => { const n = !c; try { localStorage.setItem('sidebar-collapsed', n ? '1' : '0'); } catch {} return n; });
  }
  function toggleGroup(cat: string) {
    setClosedGroups((g) => { const n = { ...g, [cat]: !g[cat] }; try { localStorage.setItem('sidebar-groups', JSON.stringify(n)); } catch {} return n; });
  }
  const openSearch = () => window.dispatchEvent(new Event('open-command'));

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  function navLink(m: Item) {
    const active = isActive(m.href);
    return (
      <Link key={m.key} href={m.href} title={collapsed ? m.name : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${collapsed ? 'md:justify-center md:px-0' : ''} ${
          active ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`}>
        <span className="text-base leading-none">{m.icon}</span>
        <span className={collapsed ? 'md:hidden' : ''}>{m.name}</span>
      </Link>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4 md:hidden">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-md p-1.5 hover:bg-neutral-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Logo className="h-7 w-7" />
        <span className="flex-1 text-sm font-semibold">{APP_NAME}</span>
        <button onClick={openSearch} aria-label="Search" className="rounded-md p-1.5 hover:bg-neutral-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4-4" /></svg>
        </button>
        <NotificationBell />
      </div>

      {/* Backdrop (mobile) */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 md:static md:translate-x-0 md:transition-[width]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'md:w-[68px]' : 'md:w-64'} w-64`}>

        {/* Edge collapse toggle (desktop only) */}
        <button onClick={toggleCollapsed} aria-label={collapsed ? 'Expand' : 'Collapse'}
          className="absolute -right-3 top-1/2 z-20 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-900 md:flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Brand + bell */}
        <div className={`flex items-center gap-2 border-b border-neutral-100 px-4 py-3.5 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <Logo />
          <span className={`flex-1 text-[15px] font-semibold tracking-tight text-neutral-900 ${collapsed ? 'md:hidden' : ''}`}>{APP_NAME}</span>
          <div className={collapsed ? 'md:hidden' : ''}><NotificationBell /></div>
        </div>

        {/* Search trigger */}
        <div className={`px-3 pt-3 ${collapsed ? 'md:px-2' : ''}`}>
          <button onClick={openSearch} title="Search (⌘K)"
            className={`flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-50 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4-4" /></svg>
            <span className={collapsed ? 'md:hidden' : ''}>Search</span>
            <kbd className={`ml-auto rounded border border-neutral-200 px-1.5 text-[10px] ${collapsed ? 'md:hidden' : ''}`}>⌘K</kbd>
          </button>
        </div>

        {/* Workspace card */}
        <div className={`px-3 pt-3 ${collapsed ? 'md:px-2' : ''}`}>
          <div className={`flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50 ${collapsed ? 'md:justify-center md:p-2' : ''} px-3 py-2`} title={collapsed ? orgName : undefined}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-sm font-semibold text-white">{initial}</div>
            <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
              <div className="truncate text-sm font-semibold leading-tight">{orgName}</div>
              <div className="truncate text-xs capitalize text-neutral-400">{businessType}</div>
            </div>
          </div>
        </div>

        {/* Nav (independent scroll) */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navLink({ key: 'overview', name: 'Overview', href: '/dashboard', icon: '🏠' })}
          {groups.map((g) => {
            const closed = !collapsed && closedGroups[g.cat];
            return (
              <div key={g.cat} className="mt-3">
                {!collapsed ? (
                  <button onClick={() => toggleGroup(g.cat)}
                    className="flex w-full items-center gap-1 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`h-3 w-3 transition-transform ${closed ? '-rotate-90' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                    </svg>
                    {g.label}
                  </button>
                ) : (
                  <div className="my-2 border-t border-neutral-100 md:block hidden" />
                )}
                {!closed && g.items.map(navLink)}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-1.5 border-t border-neutral-100 p-3">
          <div className={collapsed ? 'md:hidden' : ''}><ThemeToggle /></div>
          <Link href="/dashboard/settings/preferences" title={collapsed ? 'Settings' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={collapsed ? 'md:hidden' : ''}>Settings</span>
          </Link>
          <div className={`flex items-center gap-2 px-3 py-1.5 ${collapsed ? 'md:hidden' : ''}`}>
            <span className="truncate text-xs text-neutral-500">{userEmail}</span>
            <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColor}`}>{roleLabel}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
