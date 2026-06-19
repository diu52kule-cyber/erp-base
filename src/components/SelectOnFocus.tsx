'use client';
import { useEffect } from 'react';

// Selects an input's contents when it gains focus, so default values (0, 1, 18, etc.)
// clear as soon as you click/tab into the field and you can type fresh. Textareas are
// excluded (you usually want to edit long text, not replace it).
const SELECTABLE = ['text', 'number', 'search', 'tel', 'email', 'url', 'password'];

function isSelectable(el: EventTarget | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement && SELECTABLE.includes(el.type);
}

export default function SelectOnFocus() {
  useEffect(() => {
    let armed = false;
    const onFocusIn = (e: FocusEvent) => {
      if (isSelectable(e.target)) { armed = true; try { e.target.select(); } catch {} }
    };
    // Prevent the click's mouseup from collapsing the selection we just made.
    const onMouseUp = (e: MouseEvent) => {
      if (armed && isSelectable(e.target)) e.preventDefault();
      armed = false;
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);
  return null;
}
