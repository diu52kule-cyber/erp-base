'use client';
import { useEffect, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; type: ToastType };
type Confirm = { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; resolve: (v: boolean) => void };
type Prompt = { title?: string; message?: string; placeholder?: string; defaultValue?: string; confirmLabel?: string; resolve: (v: string | null) => void };

const TOAST_STYLE: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-neutral-200 bg-white text-neutral-800',
};
const TOAST_ICON: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };

export default function AppOverlays() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type: type ?? 'success' }]);
      setTimeout(() => dismiss(id), 4000);
    };
    const onConfirm = (e: Event) => setConfirm((e as CustomEvent).detail);
    const onPrompt = (e: Event) => {
      const d = (e as CustomEvent).detail as Prompt;
      setPrompt(d); setPromptValue(d.defaultValue ?? '');
    };
    window.addEventListener('app-toast', onToast);
    window.addEventListener('app-confirm', onConfirm);
    window.addEventListener('app-prompt', onPrompt);
    return () => {
      window.removeEventListener('app-toast', onToast);
      window.removeEventListener('app-confirm', onConfirm);
      window.removeEventListener('app-prompt', onPrompt);
    };
  }, [dismiss]);

  function closeConfirm(v: boolean) { confirm?.resolve(v); setConfirm(null); }
  function closePrompt(v: string | null) { prompt?.resolve(v); setPrompt(null); }

  return (
    <>
      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex cursor-pointer items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${TOAST_STYLE[t.type]}`}
            style={{ animation: 'toastIn .18s ease-out' }}>
            <span className="mt-px font-bold">{TOAST_ICON[t.type]}</span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" onClick={() => closeConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {confirm.title && <h2 className="text-lg font-semibold text-neutral-900">{confirm.title}</h2>}
            <p className="mt-1 text-sm text-neutral-600">{confirm.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => closeConfirm(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
                {confirm.cancelLabel ?? 'Cancel'}
              </button>
              <button onClick={() => closeConfirm(true)} autoFocus
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${confirm.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-neutral-700'}`}>
                {confirm.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt modal */}
      {prompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" onClick={() => closePrompt(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {prompt.title && <h2 className="text-lg font-semibold text-neutral-900">{prompt.title}</h2>}
            {prompt.message && <p className="mt-1 text-sm text-neutral-600">{prompt.message}</p>}
            <input autoFocus value={promptValue} onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') closePrompt(promptValue.trim() || null); if (e.key === 'Escape') closePrompt(null); }}
              placeholder={prompt.placeholder}
              className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none" />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => closePrompt(null)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Cancel</button>
              <button onClick={() => closePrompt(promptValue.trim() || null)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">
                {prompt.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </>
  );
}
