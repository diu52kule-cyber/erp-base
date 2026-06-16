'use client';
import { useState } from 'react';

type Settings = {
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  upi_id?: string | null;
  contact_email?: string | null;
};

export default function AdminSettings({ initial }: { initial: Settings }) {
  const [form, setForm] = useState<Settings>({
    whatsapp_number: initial.whatsapp_number ?? '',
    whatsapp_message: initial.whatsapp_message ?? 'Hi, I would like to continue my ERP subscription. My business is: ',
    upi_id: initial.upi_id ?? '',
    contact_email: initial.contact_email ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(k: keyof Settings, v: string) { setForm((f) => ({ ...f, [k]: v })); setSaved(false); }

  async function save() {
    setSaving(true);
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const cleanNumber = (form.whatsapp_number ?? '').replace(/\D/g, '');
  const previewLink = cleanNumber
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent((form.whatsapp_message ?? '') + 'Acme Corp')}`
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-lg">Billing contact</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Shown to clients on the paywall screen when their trial ends.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-500">WhatsApp number (with country code)</label>
          <input value={form.whatsapp_number ?? ''} onChange={(e) => set('whatsapp_number', e.target.value)}
            placeholder="e.g. 919876543210"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono" />
          <p className="mt-1 text-xs text-neutral-400">Digits only. India = 91 + 10-digit number. Used for the contact button and QR code.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-500">Pre-filled WhatsApp message</label>
          <textarea value={form.whatsapp_message ?? ''} onChange={(e) => set('whatsapp_message', e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-neutral-400">The client’s business name is appended automatically.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-500">UPI ID (optional)</label>
            <input value={form.upi_id ?? ''} onChange={(e) => set('upi_id', e.target.value)}
              placeholder="business@upi"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Contact email (optional)</label>
            <input value={form.contact_email ?? ''} onChange={(e) => set('contact_email', e.target.value)}
              placeholder="billing@yourcompany.com"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="font-semibold text-sm mb-3">Paywall preview</h3>
        {previewLink ? (
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=6&data=${encodeURIComponent(previewLink)}`}
              alt="QR preview" width={120} height={120} className="rounded-lg border border-neutral-100" />
            <div className="space-y-2">
              <a href={previewLink} target="_blank" rel="noopener noreferrer"
                className="inline-block rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white">
                💬 Contact on WhatsApp
              </a>
              <p className="text-xs text-neutral-400 break-all max-w-sm">{previewLink}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Enter a WhatsApp number to see the contact button + QR preview.</p>
        )}
      </div>
    </div>
  );
}
