'use client';

import { useState } from 'react';
import { toast, confirmDialog } from '@/lib/toast';

export default function RecurringActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);

  async function generateNow() {
    setBusy(true);
    const res = await fetch(`/api/recurring/${id}/generate`, { method: 'POST' });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); setBusy(false); return; }
    toast('Invoice generated');
    window.location.href = `/dashboard/billing/${data.id}`;
  }

  async function toggle() {
    const next = status === 'active' ? 'paused' : 'active';
    setBusy(true);
    const res = await fetch(`/api/recurring/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); setBusy(false); return; }
    window.location.reload();
  }

  async function remove() {
    const ok = await confirmDialog({ title: 'Delete recurring invoice?', message: 'This stops future invoices. Already-generated invoices are kept.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); setBusy(false); return; }
    window.location.reload();
  }

  const btn = 'rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50';

  return (
    <div className="flex justify-end gap-1">
      {status !== 'ended' && <button onClick={generateNow} disabled={busy} className={btn}>Generate now</button>}
      {status !== 'ended' && <button onClick={toggle} disabled={busy} className={btn}>{status === 'active' ? 'Pause' : 'Resume'}</button>}
      <button onClick={remove} disabled={busy} className={`${btn} text-red-600 hover:bg-red-50`}>Delete</button>
    </div>
  );
}
