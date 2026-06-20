'use client';
import { useState } from 'react';
import type { BusinessType } from '@/lib/modules';
import { confirmDialog, toast } from '@/lib/toast';

export default function BusinessTypeClient({ types, current }: { types: BusinessType[]; current: string }) {
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (selected === current) return;
    const label = types.find((t) => t.key === selected)?.label ?? selected;
    const ok = await confirmDialog({
      title: 'Switch business type?',
      message: `This will re-apply the recommended modules for "${label}". Modules not in that set will be turned off (your data is kept).`,
      confirmLabel: 'Switch',
    });
    if (!ok) return;
    setSaving(true);
    const res = await fetch('/api/settings/business-type', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_type: selected }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast(data.error ?? 'Could not switch', 'error'); return; }
    toast(`Switched to ${label}`);
    setTimeout(() => window.location.reload(), 700);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {types.map((t) => (
          <button key={t.key} onClick={() => setSelected(t.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${selected === t.key
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white hover:border-neutral-400'}`}>
            <div className="text-2xl">{t.icon}</div>
            <div className={`mt-2 text-sm font-semibold ${selected === t.key ? 'text-white' : 'text-neutral-800'}`}>{t.label}</div>
            <div className={`mt-0.5 text-xs ${selected === t.key ? 'text-neutral-300' : 'text-neutral-400'}`}>{t.desc}</div>
            {t.key === current && <div className={`mt-2 text-[10px] font-medium ${selected === t.key ? 'text-neutral-300' : 'text-neutral-400'}`}>● Current</div>}
          </button>
        ))}
      </div>
      <button onClick={save} disabled={saving || selected === current}
        className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-40">
        {saving ? 'Switching…' : selected === current ? 'Current business type' : 'Switch business type'}
      </button>
    </div>
  );
}
