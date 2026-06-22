'use client';

import { useState } from 'react';

type Line = { account_id: string; debit: string; credit: string; description: string };
type Account = { id: string; code: string; name: string; type: string };
type Journal = {
  id: string; entry_date: string; reference: string | null; narration: string | null;
  auto_posted: boolean;
  lines: { id: string; debit: number; credit: number; description: string | null; account: { code: string; name: string; type: string } | null }[];
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

const EMPTY_LINE: Line = { account_id: '', debit: '', credit: '', description: '' };

export default function JournalsClient({ journals: init, accounts }: { journals: Journal[]; accounts: Account[] }) {
  const [journals, setJournals] = useState(init);
  const [showForm, setShowForm]   = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [pending, setPending]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    reference: '',
    narration: '',
    lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] as Line[],
  });

  function setField(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  function setLine(i: number, f: keyof Line, v: string) {
    setForm((p) => {
      const lines = [...p.lines];
      lines[i] = { ...lines[i], [f]: v };
      return { ...p, lines };
    });
  }

  function addLine() { setForm((p) => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] })); }
  function removeLine(i: number) { setForm((p) => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) })); }

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  async function handleSubmit() {
    if (!balanced) { setError('Entry must be balanced (total Dr = total Cr)'); return; }
    const validLines = form.lines.filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) { setError('At least 2 lines required'); return; }

    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/accounting/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: form.entry_date,
          reference:  form.reference || null,
          narration:  form.narration || null,
          lines: validLines.map((l) => ({
            account_id:  l.account_id,
            debit:       parseFloat(l.debit)  || 0,
            credit:      parseFloat(l.credit) || 0,
            description: l.description || null,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { window.location.reload(); }
    } catch { setError('Failed to save'); }
    setPending(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          {showForm ? 'Cancel' : '+ New Journal Entry'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="font-medium">New Journal Entry</h2>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Date *</label>
              <input type="date" value={form.entry_date} onChange={(e) => setField('entry_date', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Reference</label>
              <input type="text" value={form.reference} onChange={(e) => setField('reference', e.target.value)} placeholder="JV-001"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Narration</label>
              <input type="text" value={form.narration} onChange={(e) => setField('narration', e.target.value)} placeholder="Description"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-xs text-neutral-500 border-b border-neutral-200">
                  <th className="px-3 py-2 text-left font-medium">Account</th>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Debit (Dr)</th>
                  <th className="px-3 py-2 text-right font-medium">Credit (Cr)</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {form.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <select value={line.account_id} onChange={(e) => setLine(i, 'account_id', e.target.value)}
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900">
                        <option value="">Select account…</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={line.description} onChange={(e) => setLine(i, 'description', e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.01" value={line.debit} onChange={(e) => setLine(i, 'debit', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.01" value={line.credit} onChange={(e) => setLine(i, 'credit', e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {form.lines.length > 2 && (
                        <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 bg-neutral-50 text-xs font-semibold">
                  <td colSpan={2} className="px-3 py-2">
                    <button onClick={addLine} className="text-blue-600 hover:underline">+ Add line</button>
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${!balanced ? 'text-red-600' : 'text-green-700'}`}>
                    {fmt(totalDebit)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${!balanced ? 'text-red-600' : 'text-green-700'}`}>
                    {fmt(totalCredit)}
                    {!balanced && <span className="ml-1 font-normal">(diff: {fmt(Math.abs(totalDebit - totalCredit))})</span>}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Cancel</button>
            <button onClick={handleSubmit} disabled={pending || !balanced}
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Post Entry'}
            </button>
          </div>
        </div>
      )}

      {journals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
          No manual journal entries yet. Auto-posted entries from invoices/payments are not shown here.
        </div>
      ) : (
        <div className="space-y-2">
          {journals.map((je) => {
            const totalDr = je.lines.reduce((s, l) => s + l.debit, 0);
            const totalCr = je.lines.reduce((s, l) => s + l.credit, 0);
            return (
              <div key={je.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === je.id ? null : je.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{je.entry_date}</span>
                    {je.reference && <span className="text-xs text-neutral-400 font-mono">{je.reference}</span>}
                    {je.narration && <span className="text-sm text-neutral-600">{je.narration}</span>}
                    {je.auto_posted && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Auto</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold tabular-nums">₹{fmt(totalDr)}</span>
                    <span className="text-xs text-neutral-400">{expanded === je.id ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expanded === je.id && (
                  <div className="border-t border-neutral-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-400 border-b border-neutral-100">
                          <th className="px-4 py-2 text-left font-medium">Account</th>
                          <th className="px-4 py-2 text-left font-medium">Description</th>
                          <th className="px-4 py-2 text-right font-medium">Dr</th>
                          <th className="px-4 py-2 text-right font-medium">Cr</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {je.lines.map((l, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 font-medium">{l.account?.code} — {l.account?.name}</td>
                            <td className="px-4 py-2 text-neutral-500">{l.description ?? '—'}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{l.debit > 0 ? fmt(l.debit) : '—'}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{l.credit > 0 ? fmt(l.credit) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-xs">
                          <td colSpan={2} className="px-4 py-2">Total</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmt(totalDr)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmt(totalCr)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
