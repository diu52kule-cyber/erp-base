'use client';

import { useState, useEffect, useRef } from 'react';

type Notification = { id: string; type: string; title: string; body?: string; entity_type?: string; entity_id?: string; read_at: string | null; created_at: string };

export default function NotificationBell() {
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    fetch('/api/notifications').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setItems(d); });
  }, []);

  useEffect(() => {
    function outside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100">
        <svg className="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-neutral-500 hover:text-neutral-900">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">No notifications</p>
            ) : items.map((n) => (
              <div key={n.id} className={`px-4 py-3 ${n.read_at ? 'opacity-60' : 'bg-blue-50/50'}`}>
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-neutral-500 mt-0.5">{n.body}</p>}
                <p className="text-xs text-neutral-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
