'use client';
import { useEffect, useRef } from 'react';

// G + letter navigation map
const G_MAP: Record<string, string> = {
  d: '/dashboard',
  b: '/dashboard/billing',
  i: '/dashboard/inventory',
  p: '/dashboard/pos',
  c: '/dashboard/crm',
  h: '/dashboard/hr',
  a: '/dashboard/accounting',
  o: '/dashboard/purchase',
  x: '/dashboard/expenses',
  r: '/dashboard/reports',
  s: '/dashboard/settings',
  j: '/dashboard/projects',
  t: '/dashboard/tasks',
};

function isInput(el: EventTarget | null) {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (el as HTMLElement).contentEditable === 'true';
}

export default function GlobalHotkeys() {
  const gMode = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearG = () => {
      gMode.current = false;
      if (gTimer.current) clearTimeout(gTimer.current);
    };

    const onKey = (e: KeyboardEvent) => {
      const inInput = isInput(e.target);

      // ── Ctrl+Enter → submit nearest form ───────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = (e.target as HTMLElement).closest?.('form');
        if (form) {
          const btn = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type="button"])');
          if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
        }
        return;
      }

      if (inInput) return;

      // ── G + letter navigation ───────────────────────────────────────
      if (gMode.current) {
        clearG();
        const dest = G_MAP[e.key.toLowerCase()];
        if (dest) { e.preventDefault(); window.location.href = dest; }
        return;
      }

      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        gMode.current = true;
        gTimer.current = setTimeout(clearG, 1200);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearG(); };
  }, []);

  return null;
}
