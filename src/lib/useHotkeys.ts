'use client';
import { useEffect, useRef } from 'react';

export type HotkeyBinding = {
  key: string;          // e.g. 'n', 'enter', '?'
  ctrl?: boolean;       // requires Ctrl/Cmd
  shift?: boolean;      // requires Shift
  allowInInput?: boolean; // fire even when focused in input/textarea
  handler: () => void;
};

function isInput(el: EventTarget | null) {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  const editable = (el as HTMLElement).contentEditable === 'true';
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || editable;
}

export function useHotkeys(bindings: HotkeyBinding[]) {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      for (const b of ref.current) {
        if (!b.allowInInput && isInput(e.target)) continue;
        if (b.ctrl !== undefined && b.ctrl !== mod) continue;
        if (b.shift !== undefined && b.shift !== e.shiftKey) continue;
        if (e.key.toLowerCase() !== b.key.toLowerCase()) continue;
        e.preventDefault();
        b.handler();
        break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
