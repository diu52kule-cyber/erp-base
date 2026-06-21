'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

type Settings = {
  bank_name?: string | null; account_name?: string | null; account_number?: string | null;
  ifsc?: string | null; branch?: string | null; upi_id?: string | null;
  logo_url?: string | null; signature_url?: string | null;
  default_terms?: string | null; default_notes?: string | null; default_due_days?: number | null;
  show_bank?: boolean | null; show_upi_qr?: boolean | null; enable_round_off?: boolean | null;
};

export default function InvoiceSettingsClient({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>({
    show_bank: true, show_upi_qr: true, enable_round_off: true, default_due_days: 0, ...initial,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) { setS((p) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/settings/invoice', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    const data = await res.json();
    toast(data.error ?? 'Saved', data.error ? 'error' : 'success');
    setSaving(false);
  }

  const input = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900';
  const label = 'mb-1 block text-sm text-neutral-600';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Bank */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Bank &amp; Payment Details</h2>
          <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={!!s.show_bank} onChange={(e) => set('show_bank', e.target.checked)} /> Show on invoice</label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className={label}>Bank Name</label><input className={input} value={s.bank_name ?? ''} onChange={(e) => set('bank_name', e.target.value)} /></div>
          <div><label className={label}>Branch</label><input className={input} value={s.branch ?? ''} onChange={(e) => set('branch', e.target.value)} /></div>
          <div><label className={label}>Account Name</label><input className={input} value={s.account_name ?? ''} onChange={(e) => set('account_name', e.target.value)} /></div>
          <div><label className={label}>Account Number</label><input className={`${input} font-mono`} value={s.account_number ?? ''} onChange={(e) => set('account_number', e.target.value)} /></div>
          <div><label className={label}>IFSC</label><input className={`${input} font-mono`} value={s.ifsc ?? ''} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} /></div>
          <div><label className={label}>UPI ID</label><input className={`${input} font-mono`} value={s.upi_id ?? ''} onChange={(e) => set('upi_id', e.target.value)} placeholder="name@bank" /></div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={!!s.show_upi_qr} onChange={(e) => set('show_upi_qr', e.target.checked)} /> Show a UPI QR code on invoices (INR only)</label>
      </section>

      {/* Branding */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Branding</h2>
        <div className="grid grid-cols-1 gap-4">
          <div><label className={label}>Logo URL</label><input className={input} value={s.logo_url ?? ''} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://…/logo.png" /></div>
          <div><label className={label}>Signature image URL</label><input className={input} value={s.signature_url ?? ''} onChange={(e) => set('signature_url', e.target.value)} placeholder="https://…/signature.png" /></div>
          <p className="text-xs text-neutral-400">Paste a public image URL (e.g. from an uploaded attachment). Square PNG works best for the logo.</p>
        </div>
      </section>

      {/* Defaults */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Defaults</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="sm:w-40">
            <label className={label}>Default payment terms (days)</label>
            <input type="number" min="0" className={input} value={s.default_due_days ?? 0} onChange={(e) => set('default_due_days', parseInt(e.target.value) || 0)} />
          </div>
          <div><label className={label}>Default Terms &amp; Conditions</label><textarea rows={3} className={input} value={s.default_terms ?? ''} onChange={(e) => set('default_terms', e.target.value)} placeholder="1. Payment due within X days.&#10;2. Goods once sold will not be taken back." /></div>
          <div><label className={label}>Default invoice note</label><input className={input} value={s.default_notes ?? ''} onChange={(e) => set('default_notes', e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={!!s.enable_round_off} onChange={(e) => set('enable_round_off', e.target.checked)} /> Round off invoice totals to the nearest rupee by default</label>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  );
}
