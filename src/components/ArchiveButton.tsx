'use client';

import { useEffect, useRef, useState } from 'react';

export default function ArchiveButton({
  table,
  id,
  archived,
  redirectTo,
}: {
  table: string;
  id: string;
  archived: boolean;
  redirectTo: string;
}) {
  const [pending, setPending]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (timerRef.current)  clearTimeout(timerRef.current);
    if (tickRef.current)   clearInterval(tickRef.current);
  }

  useEffect(() => () => clearTimers(), []);

  async function callApi(archive: boolean) {
    const res  = await fetch('/api/archive', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, archive }),
    });
    return res.json();
  }

  async function handleClick() {
    if (archived) {
      if (!confirm('Restore this record?')) return;
      setPending(true);
      const data = await callApi(false);
      setPending(false);
      if (data.error) setError(data.error);
      else window.location.href = window.location.href;
      return;
    }

    setPending(true);
    setError(null);
    const data = await callApi(true);
    setPending(false);
    if (data.error) { setError(data.error); return; }

    // Show undo toast for 5 seconds then navigate
    setCountdown(5);
    tickRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n === null || n <= 1) { clearTimers(); return null; }
        return n - 1;
      });
    }, 1000);
    timerRef.current = setTimeout(() => {
      clearTimers();
      setCountdown(null);
      window.location.href = redirectTo;
    }, 5000);
  }

  async function handleUndo() {
    clearTimers();
    setCountdown(null);
    setPending(true);
    const data = await callApi(false);
    setPending(false);
    if (data.error) setError(data.error);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending || countdown !== null}
        className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${
          archived
            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-red-600'
        }`}
      >
        {pending ? '…' : archived ? 'Restore' : 'Archive'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {countdown !== null && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-3 shadow-lg">
            <span className="text-sm text-neutral-700">Archived.</span>
            <button
              onClick={handleUndo}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
            >
              Undo
            </button>
            <span className="text-xs text-neutral-400">{countdown}s</span>
          </div>
        </div>
      )}
    </div>
  );
}
