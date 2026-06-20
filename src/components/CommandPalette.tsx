'use client';
import { useEffect, useMemo, useState } from 'react';

type Item = { name: string; href: string; icon: string };

export default function CommandPalette({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

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

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );
  useEffect(() => setIdx(0), [q, open]);

  if (!open) return null;
  const go = (href: string) => { setOpen(false); setQ(''); window.location.href = href; };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && filtered[idx]) go(filtered[idx].href);
          }}
          placeholder="Search pages… (⌘K)"
          className="w-full border-b border-neutral-100 px-4 py-3.5 text-sm focus:outline-none" />
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">No results</p>
          ) : filtered.map((it, i) => (
            <button key={it.href} onMouseEnter={() => setIdx(i)} onClick={() => go(it.href)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${i === idx ? 'bg-neutral-100' : ''}`}>
              <span className="text-base">{it.icon}</span>
              <span>{it.name}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">↑↓ navigate · ↵ open · esc close</div>
      </div>
    </div>
  );
}
