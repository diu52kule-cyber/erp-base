'use client';
import { useEffect, useState } from 'react';

const SECTIONS = [
  {
    title: 'Anywhere',
    rows: [
      ['⌘K', 'Command palette'],
      ['?', 'Show shortcuts'],
      ['⌘↵', 'Submit form'],
      ['Esc', 'Close / cancel'],
    ],
  },
  {
    title: 'Go to module  (press G then…)',
    rows: [
      ['G  D', 'Dashboard'],
      ['G  B', 'Billing'],
      ['G  I', 'Inventory'],
      ['G  P', 'Point of Sale'],
      ['G  C', 'CRM'],
      ['G  H', 'HR'],
      ['G  A', 'Accounting'],
      ['G  O', 'Purchase Orders'],
      ['G  X', 'Expenses'],
      ['G  R', 'Reports'],
      ['G  S', 'Settings'],
    ],
  },
  {
    title: 'List pages',
    rows: [
      ['N', 'New item'],
      ['/', 'Focus search'],
      ['↑ ↓  /  J K', 'Navigate rows'],
      ['↵ / O', 'Open selected row'],
      ['E', 'Edit selected row'],
    ],
  },
];

export default function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement).contentEditable === 'true';
      if (e.key === '?' && !inInput) { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="font-semibold text-sm">Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">×</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">{s.title}</p>
              <div className="space-y-1">
                {s.rows.map(([kbd, label]) => (
                  <div key={kbd} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-600">{label}</span>
                    <kbd className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-700">{kbd}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400 text-center">Press ? again or Esc to close</div>
      </div>
    </div>
  );
}
