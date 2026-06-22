'use client';

import { useState } from 'react';

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
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleClick() {
    if (!confirm(archived ? 'Restore this record?' : 'Archive this record? It will be hidden from lists.')) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/archive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, archive: !archived }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { window.location.href = archived ? window.location.href : redirectTo; }
    } catch { setError('Failed'); }
    setPending(false);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${
          archived
            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-red-600'
        }`}
      >
        {pending ? '…' : archived ? 'Restore' : 'Archive'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
