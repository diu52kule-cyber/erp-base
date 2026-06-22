'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

type BankRow = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

type MatchStatus = 'matched' | 'unmatched' | 'pending';

type EnrichedRow = BankRow & {
  id: number;
  status: MatchStatus;
  matchedPayment?: { id: string; notes?: string };
};

function parseHDFCCSV(text: string): BankRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows: BankRow[] = [];
  for (const line of lines) {
    const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 5) continue;
    const [dateStr, desc, , debit, credit, , balance] = cols;
    const date = parseDate(dateStr);
    if (!date) continue;
    rows.push({
      date,
      description: desc,
      debit: parseFloat(debit) || 0,
      credit: parseFloat(credit) || 0,
      balance: parseFloat(balance?.replace(/,/g, '') ?? '') || 0,
    });
  }
  return rows;
}

function parseDate(s: string): string | null {
  if (!s) return null;
  // DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const [, d, mo, yr] = m;
  const year = yr.length === 2 ? (parseInt(yr) + 2000).toString() : yr;
  return `${year}-${mo}-${d}`;
}

function fmtAmt(n: number) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function BankReconciliationPage() {
  const fileRef          = useRef<HTMLInputElement>(null);
  const [rows, setRows]  = useState<EnrichedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const text = await file.text();
      const parsed = parseHDFCCSV(text);
      if (parsed.length === 0) { setError('No rows parsed. Please check the CSV format (HDFC/ICICI standard).'); setLoading(false); return; }

      // Fetch payments to auto-match by amount
      const res = await fetch('/api/payments');
      const payments = res.ok ? await res.json() : [];

      let matchCount = 0;
      const enriched: EnrichedRow[] = parsed.map((r, i) => {
        const amt = r.debit || r.credit;
        const pay = payments.find((p: any) => Math.abs(Number(p.amount) - amt) < 0.01);
        const status: MatchStatus = pay ? 'matched' : 'unmatched';
        if (pay) matchCount++;
        return { ...r, id: i, status, matchedPayment: pay ? { id: pay.id, notes: pay.notes } : undefined };
      });

      setRows(enriched);
      setMatched(matchCount);
    } catch (err: any) {
      setError(err.message ?? 'Failed to parse CSV');
    }
    setLoading(false);
  }

  function toggleStatus(id: number) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const next: MatchStatus = r.status === 'matched' ? 'unmatched' : r.status === 'unmatched' ? 'pending' : 'matched';
      return { ...r, status: next };
    }));
  }

  const unmatched = rows.filter((r) => r.status === 'unmatched').length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← Accounting</Link>
        <h1 className="mt-2 text-2xl font-semibold">Bank Reconciliation</h1>
        <p className="mt-1 text-sm text-neutral-500">Import your bank statement CSV and match rows against recorded payments.</p>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="font-medium">Upload Bank Statement</h2>
          <p className="mt-1 text-xs text-neutral-400">Supported formats: HDFC / ICICI CSV exports. Columns: Date, Description, Debit, Credit, Balance.</p>
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? 'Parsing…' : 'Choose CSV File'}
          </button>
          {rows.length > 0 && (
            <span className="text-sm text-neutral-600">
              {rows.length} rows · {matched} auto-matched · <span className={unmatched > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{unmatched} unmatched</span>
            </span>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Results table */}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Debit</th>
                <th className="px-4 py-3 text-right font-medium">Credit</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id} className={`${r.status === 'unmatched' ? 'bg-red-50' : r.status === 'matched' ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <td className="px-4 py-2 tabular-nums text-neutral-500">{r.date}</td>
                  <td className="px-4 py-2 max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-2 text-right text-red-600 tabular-nums">{fmtAmt(r.debit)}</td>
                  <td className="px-4 py-2 text-right text-green-600 tabular-nums">{fmtAmt(r.credit)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleStatus(r.id)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ${
                        r.status === 'matched'   ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                        r.status === 'unmatched' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                        'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {r.status === 'matched' ? '✓ Matched' : r.status === 'unmatched' ? '✗ Unmatched' : '? Pending'}
                    </button>
                    {r.matchedPayment && (
                      <span className="ml-2 text-xs text-neutral-400 truncate">{r.matchedPayment.notes}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-400">
          <p className="text-sm">Upload a bank statement CSV to start reconciliation.</p>
          <p className="mt-1 text-xs">Rows are auto-matched against payments by amount.</p>
        </div>
      )}
    </div>
  );
}
