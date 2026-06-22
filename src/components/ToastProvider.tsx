'use client';

import { createContext, useCallback, useContext, useState } from 'react';

export type Toast = {
  id: string;
  message: string;
  undoLabel?: string;
  onUndo?: () => Promise<void> | void;
  type?: 'default' | 'error' | 'success';
};

type ToastCtx = {
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastCtx>({ show: () => {}, dismiss: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(Toast & { timerRef?: ReturnType<typeof setTimeout> })[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t?.timerRef) clearTimeout(t.timerRef);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => dismiss(id), 5000);
    setToasts((prev) => [...prev, { ...toast, id, timerRef: timer }]);
  }, [dismiss]);

  async function handleUndo(t: Toast) {
    dismiss(t.id);
    if (t.onUndo) await t.onUndo();
  }

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {/* Toast stack — bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm transition-all
              ${t.type === 'error'   ? 'border-red-200 bg-red-50 text-red-800' :
                t.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' :
                'border-neutral-200 bg-white text-neutral-800'}`}
          >
            <span>{t.message}</span>
            {t.onUndo && (
              <button
                onClick={() => handleUndo(t)}
                className="font-semibold underline-offset-2 hover:underline"
              >
                {t.undoLabel ?? 'Undo'}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="ml-1 text-neutral-400 hover:text-neutral-700">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
