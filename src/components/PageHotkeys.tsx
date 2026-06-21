'use client';
import { useEffect } from 'react';

export default function PageHotkeys({
  newHref,
  searchId,
}: {
  newHref?: string;
  searchId?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement).contentEditable === 'true') return;
      if (e.key === 'n' && newHref && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.location.href = newHref;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const el = searchId
          ? document.getElementById(searchId)
          : (document.querySelector('input[type="search"], input[placeholder*="earch"], input[placeholder*="ilter"]') as HTMLInputElement | null);
        el?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newHref, searchId]);

  return null;
}
