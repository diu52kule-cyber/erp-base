// Shared focus helpers for keyboard navigation, used by KeyboardNav and the
// Product/Contact pickers so "move to next field" behaves identically everywhere.

export const FOCUSABLE_SELECTOR =
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])';

const SELECTABLE_TYPES = ['text', 'email', 'search', 'tel', 'url', 'password', 'number'];

export function isVisible(el: HTMLElement): boolean {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

export function focusableFields(root?: HTMLElement | null): HTMLElement[] {
  const scope = root ?? document.querySelector('main') ?? document.body;
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

export function focusEl(el?: HTMLElement | null): void {
  if (!el) return;
  el.focus();
  if (el instanceof HTMLInputElement && SELECTABLE_TYPES.includes(el.type)) {
    try { el.select(); } catch { /* some input types disallow select() */ }
  }
}

// Focus the field before/after `current` in document order (dir = +1 next, -1 prev).
export function moveFocus(current: HTMLElement, dir: number): void {
  const list = focusableFields();
  const i = list.indexOf(current);
  if (i === -1) return;
  focusEl(list[i + dir]);
}
