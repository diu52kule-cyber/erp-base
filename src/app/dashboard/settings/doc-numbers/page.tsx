'use client';

import { useEffect, useState } from 'react';

type DocSetting = {
  doc_type: string;
  prefix: string;
  start_number: number;
  fy_reset: boolean;
};

const DOC_TYPES = [
  { key: 'invoice',          label: 'Sales Invoice',      default_prefix: 'INV' },
  { key: 'quotation',        label: 'Quotation',          default_prefix: 'QT'  },
  { key: 'proforma',         label: 'Proforma Invoice',   default_prefix: 'PRO' },
  { key: 'credit_note',      label: 'Credit Note',        default_prefix: 'CN'  },
  { key: 'delivery_challan', label: 'Delivery Challan',   default_prefix: 'DC'  },
  { key: 'purchase_order',   label: 'Purchase Order',     default_prefix: 'PO'  },
];

export default function DocNumbersPage() {
  const [settings, setSettings]   = useState<Record<string, DocSetting>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [saved, setSaved]         = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/doc-numbers')
      .then((r) => r.json())
      .then((rows: DocSetting[]) => {
        const map: Record<string, DocSetting> = {};
        for (const r of rows) map[r.doc_type] = r;
        setSettings(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function get(key: string): DocSetting {
    return settings[key] ?? {
      doc_type: key,
      prefix: DOC_TYPES.find((d) => d.key === key)?.default_prefix ?? key.toUpperCase(),
      start_number: 1,
      fy_reset: true,
    };
  }

  function update(key: string, field: keyof DocSetting, value: string | number | boolean) {
    setSettings((prev) => ({ ...prev, [key]: { ...get(key), [field]: value } }));
  }

  async function save(key: string) {
    setSaving(key);
    const s = get(key);
    const res = await fetch('/api/settings/doc-numbers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_type: key, prefix: s.prefix, start_number: s.start_number, fy_reset: s.fy_reset }),
    });
    setSaving(null);
    if (res.ok) { setSaved(key); setTimeout(() => setSaved(null), 2000); }
  }

  if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Document Numbering</h1>
        <p className="mt-1 text-sm text-neutral-500">Customise the prefix and starting number for each document type.</p>
      </div>

      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        {DOC_TYPES.map((dt) => {
          const s = get(dt.key);
          const isSaving = saving === dt.key;
          const wasSaved = saved === dt.key;
          return (
            <div key={dt.key} className="flex flex-wrap items-end gap-4 p-5">
              <div className="min-w-[140px]">
                <p className="text-sm font-medium">{dt.label}</p>
                <p className="text-xs text-neutral-400">Preview: {s.prefix || '…'}-{new Date().getFullYear()}-{String(s.start_number).padStart(4, '0')}</p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Prefix</label>
                <input
                  value={s.prefix}
                  onChange={(e) => update(dt.key, 'prefix', e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-neutral-500">Start #</label>
                <input
                  type="number"
                  min={1}
                  value={s.start_number}
                  onChange={(e) => update(dt.key, 'start_number', parseInt(e.target.value) || 1)}
                  className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={s.fy_reset}
                  onChange={(e) => update(dt.key, 'fy_reset', e.target.checked)}
                  className="rounded"
                />
                Reset each FY
              </label>

              <button
                onClick={() => save(dt.key)}
                disabled={isSaving}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : wasSaved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-400">
        Changes apply to new documents only. Existing document numbers are not changed.
        Prefix is followed by the 4-digit year then a sequential number (e.g. INV-2026-0001).
      </p>
    </div>
  );
}
