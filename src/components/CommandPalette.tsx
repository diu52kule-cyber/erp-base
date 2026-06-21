'use client';
import { useEffect, useMemo, useState } from 'react';

type NavItem  = { type: 'nav';    name: string; href: string;  icon: string };
type ActionItem = { type: 'action'; name: string; href: string;  icon: string; desc?: string };
type Item = NavItem | ActionItem;

const ACTIONS: ActionItem[] = [
  { type: 'action', name: 'New Invoice',        href: '/dashboard/billing/new?type=invoice',    icon: '🧾', desc: 'Create invoice' },
  { type: 'action', name: 'New Quotation',      href: '/dashboard/billing/new?type=quotation',  icon: '📋', desc: 'Create quote' },
  { type: 'action', name: 'New Contact',        href: '/dashboard/crm/contacts/new',            icon: '👤', desc: 'Add contact' },
  { type: 'action', name: 'New Deal',           href: '/dashboard/crm/deals/new',               icon: '🤝', desc: 'Add deal' },
  { type: 'action', name: 'Add Product',        href: '/dashboard/inventory/new',               icon: '📦', desc: 'New product' },
  { type: 'action', name: 'Record Payment',     href: '/dashboard/payments/new',                icon: '💳', desc: 'Log payment' },
  { type: 'action', name: 'New Purchase Order', href: '/dashboard/purchase/new',                icon: '🛒', desc: 'Create PO' },
  { type: 'action', name: 'New Employee',       href: '/dashboard/hr/employees/new',            icon: '👷', desc: 'Add employee' },
  { type: 'action', name: 'New Project',        href: '/dashboard/projects/new',                icon: '📁', desc: 'Start project' },
  { type: 'action', name: 'Open POS',           href: '/dashboard/pos',                         icon: '🛒', desc: 'Point of sale' },
];

export default function CommandPalette({ items }: { items: { name: string; href: string; icon: string }[] }) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState('');
  const [idx, setIdx]     = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-command', onOpen); };
  }, []);

  const navItems: NavItem[] = items.map((i) => ({ ...i, type: 'nav' as const }));

  const filtered = useMemo<Item[]>(() => {
    const ql = q.toLowerCase().trim();
    if (!ql) return [...ACTIONS, ...navItems];
    const actions = ACTIONS.filter((a) => a.name.toLowerCase().includes(ql) || (a.desc ?? '').toLowerCase().includes(ql));
    const nav = navItems.filter((n) => n.name.toLowerCase().includes(ql));
    return [...actions, ...nav];
  }, [q, navItems]);

  useEffect(() => setIdx(0), [q, open]);

  if (!open) return null;

  const go = (href: string) => { setOpen(false); setQ(''); window.location.href = href; };

  const actions = filtered.filter((i) => i.type === 'action');
  const nav     = filtered.filter((i) => i.type === 'nav');

  function Section({ title, list, offset }: { title: string; list: Item[]; offset: number }) {
    if (!list.length) return null;
    return (
      <>
        <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{title}</p>
        {list.map((it, i) => {
          const globalIdx = offset + i;
          return (
            <button
              key={it.href + it.name}
              onMouseEnter={() => setIdx(globalIdx)}
              onClick={() => go(it.href)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${globalIdx === idx ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
            >
              <span className="text-base w-5 text-center shrink-0">{it.icon}</span>
              <span className="flex-1 font-medium">{it.name}</span>
              {it.type === 'action' && <span className="text-xs text-neutral-400">{(it as ActionItem).desc}</span>}
            </button>
          );
        })}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && filtered[idx]) go(filtered[idx].href);
          }}
          placeholder="Search or type an action…"
          className="w-full border-b border-neutral-100 px-4 py-3.5 text-sm focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">No results</p>
          ) : (
            <>
              <Section title="Actions" list={actions} offset={0} />
              <Section title="Go to" list={nav} offset={actions.length} />
            </>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          <span>↑↓ navigate · ↵ open · Esc close</span>
          <span>Press <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono">?</kbd> for all shortcuts</span>
        </div>
      </div>
    </div>
  );
}
