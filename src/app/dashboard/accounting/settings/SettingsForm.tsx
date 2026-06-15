'use client';

import { useState } from 'react';
import { INDIAN_STATES } from '@/lib/types/accounting';
import type { OrgGstSettings } from '@/lib/types/accounting';

export default function SettingsForm({ initial }: { initial: OrgGstSettings | null }) {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstin, setGstin] = useState(initial?.gstin ?? '');
  const [legalName, setLegalName] = useState(initial?.legal_name ?? '');
  const [stateCode, setStateCode] = useState(initial?.state_code ?? '');
  const [filingPeriod, setFilingPeriod] = useState(initial?.filing_period ?? 'monthly');

  async function handleSave() {
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      setError('Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)'); return;
    }
    setPending(true); setSaved(false); setError(null);
    try {
      const res = await fetch('/api/accounting/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin, legal_name: legalName, state_code: stateCode, filing_period: filingPeriod }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch { setError('Failed to save settings'); }
    finally { setPending(false); }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Settings saved successfully.</div>}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">GST Registration</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">GSTIN</label>
            <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="27AAAAA0000A1Z5" maxLength={15}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            <p className="mt-1 text-xs text-neutral-400">15-character GST Identification Number</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Legal Business Name</label>
            <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)}
              placeholder="As registered on GST portal"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">State (Place of Registration)</label>
            <select value={stateCode} onChange={(e) => setStateCode(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              <option value="">— Select state —</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.code} – {s.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-400">Used to determine IGST vs CGST+SGST</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Filing Period</label>
            <select value={filingPeriod} onChange={(e) => setFilingPeriod(e.target.value as 'monthly' | 'quarterly')}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              <option value="monthly">Monthly (GSTR-1 every month)</option>
              <option value="quarterly">Quarterly (GSTR-1 every quarter — QRMP scheme)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium">How tax split works</p>
        <p>If your state code matches the invoice&apos;s Place of Supply → <strong>CGST + SGST</strong> (intra-state)</p>
        <p>If they differ → <strong>IGST</strong> (inter-state)</p>
        <p>If no state set → defaults to CGST + SGST split</p>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
