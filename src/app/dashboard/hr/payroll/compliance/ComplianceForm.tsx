'use client';

import { useState } from 'react';
import { PT_STATES } from '@/lib/types/payroll_compliance';
import type { StatutorySettings } from '@/lib/types/payroll_compliance';

export default function ComplianceForm({ initial }: { initial: StatutorySettings }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function toggle(key: keyof StatutorySettings) {
    setForm((f) => ({ ...f, [key]: !f[key] }));
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    const res  = await fetch('/api/hr/statutory-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setSaved(true);
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Settings saved.</div>}

      {/* PF */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Provident Fund (PF)</p>
            <p className="text-sm text-neutral-500 mt-0.5">12% employee + 12% employer on basic salary (capped at ₹15,000 basic)</p>
          </div>
          <button onClick={() => toggle('pf_enabled')}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.pf_enabled ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.pf_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {form.pf_enabled && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 text-sm">
            <div><span className="text-neutral-500">Employee contribution</span><br /><span className="font-medium">12% of basic</span></div>
            <div><span className="text-neutral-500">Employer contribution</span><br /><span className="font-medium">12% of basic (≤₹1,800/month)</span></div>
          </div>
        )}
      </div>

      {/* ESI */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Employee State Insurance (ESI)</p>
            <p className="text-sm text-neutral-500 mt-0.5">Applicable only when gross salary ≤ ₹21,000/month</p>
          </div>
          <button onClick={() => toggle('esi_enabled')}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.esi_enabled ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.esi_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {form.esi_enabled && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 text-sm">
            <div><span className="text-neutral-500">Employee contribution</span><br /><span className="font-medium">0.75% of gross</span></div>
            <div><span className="text-neutral-500">Employer contribution</span><br /><span className="font-medium">3.25% of gross</span></div>
          </div>
        )}
      </div>

      {/* Professional Tax */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Professional Tax (PT)</p>
            <p className="text-sm text-neutral-500 mt-0.5">State-specific slab deducted from employee salary</p>
          </div>
          <button onClick={() => toggle('pt_enabled')}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.pt_enabled ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.pt_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {form.pt_enabled && (
          <div>
            <label className="text-sm text-neutral-600">State</label>
            <select value={form.pt_state} onChange={(e) => setForm((f) => ({ ...f, pt_state: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              {PT_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* TDS */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">TDS on Salary (Section 192)</p>
            <p className="text-sm text-neutral-500 mt-0.5">New tax regime slabs, standard deduction ₹75,000, rebate u/s 87A up to ₹7L income</p>
          </div>
          <button onClick={() => toggle('tds_enabled')}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.tds_enabled ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.tds_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        {form.tds_enabled && (
          <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 space-y-1">
            <p className="font-medium text-neutral-700 mb-2">New regime slabs (FY 2024-25)</p>
            {[['0 – 3L','0%'],['3L – 7L','5%'],['7L – 10L','10%'],['10L – 12L','15%'],['12L – 15L','20%'],['Above 15L','30%']].map(([slab, rate]) => (
              <div key={slab} className="flex justify-between"><span>{slab}</span><span>{rate}</span></div>
            ))}
            <p className="pt-1 text-neutral-400">+ Health & Education cess 4%</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
