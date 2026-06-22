'use client';

import { useState } from 'react';

type Holiday = { id: string; date: string; name: string; is_optional: boolean };

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function HolidaysClient({ initialHolidays, year }: { initialHolidays: Holiday[]; year: string }) {
  const [holidays, setHolidays] = useState(initialHolidays);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', name: '', is_optional: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preset national holidays for quick add
  const NATIONAL_HOLIDAYS = [
    { date: `${year}-01-26`, name: 'Republic Day' },
    { date: `${year}-08-15`, name: 'Independence Day' },
    { date: `${year}-10-02`, name: 'Gandhi Jayanti' },
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-10-24`, name: 'Dussehra' },
    { date: `${year}-11-01`, name: 'Diwali' },
    { date: `${year}-03-14`, name: 'Holi' },
    { date: `${year}-12-25`, name: 'Christmas' },
  ].filter((h) => !holidays.find((e) => e.date === h.date));

  async function handleSubmit() {
    if (!form.date || !form.name.trim()) { setError('Date and name required'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        const newH: Holiday = { id: data.id, ...form };
        setHolidays((h) => [...h, newH].sort((a, b) => a.date.localeCompare(b.date)));
        setForm({ date: '', name: '', is_optional: false });
        setShowForm(false);
      }
    } catch { setError('Failed to save'); }
    setPending(false);
  }

  async function quickAdd(h: { date: string; name: string }) {
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: h.date, name: h.name, is_optional: false }),
    });
    const data = await res.json();
    if (!data.error) {
      setHolidays((prev) => [...prev, { id: data.id, date: h.date, name: h.name, is_optional: false }]
        .sort((a, b) => a.date.localeCompare(b.date)));
    }
  }

  async function remove(id: string) {
    setHolidays((h) => h.filter((x) => x.id !== id));
    await fetch(`/api/holidays?id=${id}`, { method: 'DELETE' });
  }

  // Group by month
  const byMonth: Record<number, Holiday[]> = {};
  for (const h of holidays) {
    const m = parseInt(h.date.split('-')[1]) - 1;
    byMonth[m] = [...(byMonth[m] ?? []), h];
  }

  return (
    <div className="space-y-4">
      {/* Quick add national holidays */}
      {NATIONAL_HOLIDAYS.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
          <p className="text-xs font-medium text-blue-700">Quick add national holidays for {year}:</p>
          <div className="flex flex-wrap gap-2">
            {NATIONAL_HOLIDAYS.map((h) => (
              <button
                key={h.date}
                onClick={() => quickAdd(h)}
                className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs hover:bg-blue-50"
              >
                + {h.name} ({new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          {showForm ? 'Cancel' : '+ Add Holiday'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="font-medium">Add Holiday</h2>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                min={`${year}-01-01`} max={`${year}-12-31`}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Holiday Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Diwali"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_optional} onChange={(e) => setForm((f) => ({ ...f, is_optional: e.target.checked }))}
                  className="rounded border-neutral-300" />
                Optional (restricted)
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={pending}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Add Holiday'}
            </button>
          </div>
        </div>
      )}

      {holidays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
          No holidays added for {year}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, m) => {
            const mHols = byMonth[m] ?? [];
            if (!mHols.length) return null;
            return (
              <div key={m} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
                  <h3 className="text-sm font-medium">{MONTH_NAMES[m]}</h3>
                </div>
                <ul className="divide-y divide-neutral-50">
                  {mHols.map((h) => {
                    const d = new Date(h.date);
                    const dow = d.toLocaleDateString('en-IN', { weekday: 'short' });
                    return (
                      <li key={h.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 group">
                        <div className="flex items-center gap-3">
                          <span className="w-7 text-center text-sm font-semibold text-neutral-700">
                            {d.getDate()}
                          </span>
                          <div>
                            <p className="text-sm">{h.name}</p>
                            <p className="text-xs text-neutral-400">{dow}{h.is_optional ? ' · Optional' : ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => remove(h.id)}
                          className="text-xs text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
