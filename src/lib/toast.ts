export type ToastType = 'success' | 'error' | 'info';

// Fire a toast from anywhere (client). Rendered by <AppOverlays/> in the root layout.
export function toast(message: string, type: ToastType = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
}

// Promise-based confirm modal (replacement for window.confirm).
export function confirmDialog(opts: {
  title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    window.dispatchEvent(new CustomEvent('app-confirm', { detail: { ...opts, resolve } }));
  });
}

// Promise-based prompt modal (replacement for window.prompt).
export function promptDialog(opts: {
  title?: string; message?: string; placeholder?: string; defaultValue?: string; confirmLabel?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    window.dispatchEvent(new CustomEvent('app-prompt', { detail: { ...opts, resolve } }));
  });
}
