'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { focusableFields, focusEl, moveFocus } from '@/lib/focusNav';

// App-wide keyboard ergonomics (reduces reaching for the mouse):
//  1. Auto-focus the first field on every page.
//  2. Enter moves to the next field (like Tab). Textareas keep newline behaviour;
//     submit/buttons are left alone; the Product/Contact pickers handle Enter
//     themselves while their dropdown is open (they stopPropagation).
//  3. Arrow Up / Down move between plain text inputs (native behaviour is kept
//     for number spinners, selects and textareas).
const ARROW_NAV_TYPES = ['text', 'email', 'search', 'tel', 'url', 'password'];

export default function KeyboardNav() {
  const pathname = usePathname();

  useEffect(() => {
    const t = setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return;
      focusEl(focusableFields()[0]);
    }, 140);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;

      if (e.key === 'Enter') {
        if (tag === 'TEXTAREA') return; // newline
        const type = (el as HTMLInputElement).type;
        if (type === 'submit' || type === 'button') return;
        e.preventDefault();
        moveFocus(el, 1);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (tag !== 'INPUT' || !ARROW_NAV_TYPES.includes((el as HTMLInputElement).type)) return;
        e.preventDefault();
        moveFocus(el, e.key === 'ArrowDown' ? 1 : -1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return null;
}
