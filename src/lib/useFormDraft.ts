'use client';
import { useEffect, useRef, useState } from 'react';

// Auto-saves a form's state to localStorage so switching tabs (e.g. Invoice → Expenses)
// doesn't lose work. Restores the draft on mount; call clearDraft() after a successful submit.
export function useFormDraft<T>(key: string, value: T, setValue: (v: T) => void) {
  const restored = useRef(false);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const storageKey = 'draft:' + key;

  // Restore once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { setValue(JSON.parse(raw) as T); setRestoredAt(Date.now()); }
    } catch {}
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change (debounced), but only after the initial restore
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [storageKey, value]);

  function clearDraft() {
    try { localStorage.removeItem(storageKey); } catch {}
    setRestoredAt(null);
  }

  return { clearDraft, draftRestored: restoredAt !== null };
}
