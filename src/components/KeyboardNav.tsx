'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// App-wide keyboard ergonomics (reduces reaching for the mouse):
//  1. Auto-focus the first field on every page.
//  2. Arrow Up / Down move between form fields (on plain text inputs, where the
//     arrows have no native effect). Number spinners, selects and textareas keep
//     their native arrow behaviour so nothing is broken.
const FOCUSABLE =
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])';

const TEXT_LIKE = ['text', 'email', 'search', 'tel', 'url', 'password', 'number'];
const ARROW_NAV_TYPES = ['text', 'email', 'search', 'tel', 'url', 'password'];

function isVisible(el: HTMLElement) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function fields(): HTMLElement[] {
  const main = document.querySelector('main') ?? document.body;
  return Array.from(main.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);
}

function focusField(el: HTMLElement | undefined) {
  if (!el) return;
  el.focus();
  if (el instanceof HTMLInputElement && TEXT_LIKE.includes(el.type)) {
    try { el.select(); } catch { /* some input types disallow select() */ }
  }
}

export default function KeyboardNav() {
  const pathname = usePathname();

  // 1) Auto-focus the first field when a page loads / route changes.
  useEffect(() => {
    const t = setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return;
      focusField(fields()[0]);
    }, 140);
    return () => clearTimeout(t);
  }, [pathname]);

  // 2) Arrow-key navigation between fields.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (!el || el.tagName !== 'INPUT') return;
      const type = (el as HTMLInputElement).type;
      if (!ARROW_NAV_TYPES.includes(type)) return; // keep native behaviour elsewhere
      const list = fields();
      const i = list.indexOf(el);
      if (i === -1) return;
      e.preventDefault();
      focusField(list[i + (e.key === 'ArrowDown' ? 1 : -1)]);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return null;
}
