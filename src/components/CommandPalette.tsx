'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type NavItem    = { type: 'nav';    name: string; href: string; icon: string };
type ActionItem = { type: 'action'; name: string; href: string; icon: string; desc?: string };
type DataItem   = { type: 'data';   name: string; href: string; icon: string; sub: string };
type Item       = NavItem | ActionItem | DataItem;

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

const DATA_ICONS: Record<string, string> = { invoice: '🧾', contact: '👤', product: '📦' };

export default function CommandPalette({ items }: { items: { name: string; href: string; icon: string }[] }) {
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState('');
  const [idx, setIdx]       = useState(0);
  const [dataResults, setDataResults] = useState<DataItem[]>([]);
  const [searching, setSearching]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Live data search with 300 ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const ql = q.trim();
    if (ql.length < 2) { setDataResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/global-search?q=${encodeURIComponent(ql)}`);
        const { results } = await res.json();
        setDataResults((results ?? []).map((r: any) => ({
          type: 'data' as const,
          name: r.title,
          href: r.href,
          icon: DATA_ICONS[r.type] ?? '🔍',
          sub: r.subtitle,
        })));
      } catch { setDataResults([]); }
      setSearching(false);
    }, 300);
  }, [q]);

  const navItems: NavItem[] = items.map((i) => ({ ...i, type: 'nav' as const }));

  const { actions, nav } = useMemo(() => {
    const ql = q.toLowerCase().trim();
    if (!ql) return { actions: ACTIONS, nav: navItems };
    return {
      actions: ACTIONS.filter((a) => a.name.toLowerCase().includes(ql) || (a.desc ?? '').toLowerCase().includes(ql)),
      nav:     navItems.filter((n) => n.name.toLowerCase().includes(ql)),
    };
  }, [q, navItems]);

  const filtered: Item[] = [...actions, ...nav, ...dataResults];

  useEffect(() => setIdx(0), [q, open]);

  if (!open) return null;

  const go = (href: string) => { setOpen(false); setQ(''); setDataResults([]); window.location.href = href; };

  function Section({ title, list, offset }: { title: string; list: Item[]; offset: number }) {
    if (!list.length) return null;
    return (
      <>
        <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{title}</p>
        {list.map((it, i) => {
          const globalIdx = offset + i;
          return (
            <button
              key={it.href + it.name + i}
              onMouseEnter={() => setIdx(globalIdx)}
              onClick={() => go(it.href)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${globalIdx === idx ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
            >
              <span className="w-5 shrink-0 text-center text-base">{it.icon}</span>
              <span className="flex-1 font-medium">{it.name}</span>
              {it.type === 'action' && <span className="text-xs text-neutral-400">{(it as ActionItem).desc}</span>}
              {it.type === 'data'   && <span className="text-xs text-neutral-400">{(it as DataItem).sub}</span>}
            </button>
          );
        })}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && filtered[idx]) go(filtered[idx].href);
            }}
            placeholder="Search invoices, contacts, products or type an action…"
            className="w-full border-b border-neutral-100 px-4 py-3.5 pr-10 text-sm focus:outline-none"
          />
          {searching && (
            <span className="absolute right-3 top-3.5 text-xs text-neutral-400 animate-pulse">…</span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">
              {q.length >= 2 && !searching ? 'No results' : 'Type at least 2 characters to search data'}
            </p>
          ) : (
            <>
              <Section title="Actions"  list={actions}     offset={0} />
              <Section title="Go to"    list={nav}         offset={actions.length} />
              <Section title="Results"  list={dataResults} offset={actions.length + nav.length} />
            </>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          <span>↑↓ navigate · ↵ open · Esc close</span>
          <span>Searches invoices, contacts &amp; products</span>
        </div>
      </div>
    </div>
  );
}
