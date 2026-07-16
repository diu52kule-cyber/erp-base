'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';

type Settings = {
  bank_name?: string | null; account_name?: string | null; account_number?: string | null;
  ifsc?: string | null; branch?: string | null; upi_id?: string | null;
  logo_url?: string | null; signature_url?: string | null;
  default_terms?: string | null; default_notes?: string | null; default_due_days?: number | null;
  show_bank?: boolean | null; show_upi_qr?: boolean | null; enable_round_off?: boolean | null;
  template?: string | null; accent_color?: string | null; print_color_mode?: string | null;
  print_copies?: number | null; paper_size?: string | null; show_hsn?: boolean | null; show_logo?: boolean | null;
};

export default function InvoiceSettingsClient({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>({
    show_bank: true, show_upi_qr: true, enable_round_off: true, default_due_days: 0,
    template: 'classic', accent_color: '#171717', print_color_mode: 'color',
    print_copies: 1, paper_size: 'A4', show_hsn: true, show_logo: true, ...initial,
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

      {/* Bill format & printing */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-1 font-medium">Bill format &amp; printing</h2>
        <p className="mb-4 text-xs text-neutral-400">Controls how your invoices &amp; documents look and print.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Layout template</label>
            <select className={input} value={s.template ?? 'classic'} onChange={(e) => set('template', e.target.value)}>
              <option value="classic">Classic</option>
              <option value="modern">Modern (accent header)</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div>
            <label className={label}>Accent colour</label>
            <div className="flex items-center gap-2">
              <input type="color" value={s.accent_color ?? '#171717'} onChange={(e) => set('accent_color', e.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded border border-neutral-200" />
              <input className={`${input} font-mono`} value={s.accent_color ?? '#171717'} onChange={(e) => set('accent_color', e.target.value)} placeholder="#171717" />
            </div>
          </div>
          <div>
            <label className={label}>Print colour</label>
            <select className={input} value={s.print_color_mode ?? 'color'} onChange={(e) => set('print_color_mode', e.target.value)}>
              <option value="color">Colour</option>
              <option value="bw">Black &amp; white</option>
            </select>
          </div>
          <div>
            <label className={label}>Copies to print</label>
            <input type="number" min="1" max="4" className={input} value={s.print_copies ?? 1} onChange={(e) => set('print_copies', Math.min(4, Math.max(1, parseInt(e.target.value) || 1)))} />
          </div>
          <div>
            <label className={label}>Paper size</label>
            <select className={input} value={s.paper_size ?? 'A4'} onChange={(e) => set('paper_size', e.target.value)}>
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="thermal_80">Thermal 80mm</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={s.show_logo !== false} onChange={(e) => set('show_logo', e.target.checked)} /> Show logo on documents</label>
          <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={s.show_hsn !== false} onChange={(e) => set('show_hsn', e.target.checked)} /> Show HSN/SAC column</label>
        </div>
        <p className="mt-3 text-xs text-neutral-400">Black &amp; white and multiple copies apply when printing from the app’s Print button or “Save &amp; Print”.</p>
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
