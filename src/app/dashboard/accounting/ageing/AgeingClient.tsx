'use client';
import { useState, useMemo } from 'react';

type AgeingRow = {
  customer_name: string;
  customer_id: string | null;
  current: number;
  d30: number;
  d60: number;
  d90: number;
  d90plus: number;
  total: number;
};

function fmt(n: number) {
  if (!n) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function exportCsv(rows: AgeingRow[]) {
  const headers = ['Customer', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
  const lines = rows.map((r) =>
    [r.customer_name, r.current, r.d30, r.d60, r.d90, r.d90plus, r.total]
      .map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headers.join(','), ...lines].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `receivables-ageing-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export default function AgeingClient({ rows }: { rows: AgeingRow[] }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof AgeingRow>('total');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const data = q ? rows.filter((r) => r.customer_name.toLowerCase().includes(q)) : rows;
    return [...data].sort((a, b) => {
      const av = a[sortField] as number, bv = b[sortField] as number;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, search, sortField, sortDir]);

  function toggleSort(field: keyof AgeingRow) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function SortIcon({ field }: { field: keyof AgeingRow }) {
    return <span className="ml-1 text-xs">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-neutral-300">↕</span>}</span>;
  }

  const totals = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 };
  for (const r of filtered) {
    totals.current += r.current; totals.d30 += r.d30;
    totals.d60 += r.d60; totals.d90 += r.d90;
    totals.d90plus += r.d90plus; totals.total += r.total;
  }

  const colCls = 'px-4 py-3 text-right font-medium cursor-pointer select-none';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" placeholder="Search customer…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        <button onClick={() => exportCsv(filtered)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
          Export CSV
        </button>
        <span className="text-xs text-neutral-400">{filtered.length} customers · ₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })} outstanding</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-16 text-center text-sm text-neutral-500">
          No outstanding receivables.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className={colCls} onClick={() => toggleSort('current')}>Current <SortIcon field="current" /></th>
                <th className={colCls} onClick={() => toggleSort('d30')}>1–30 Days <SortIcon field="d30" /></th>
                <th className={colCls} onClick={() => toggleSort('d60')}>31–60 Days <SortIcon field="d60" /></th>
                <th className={colCls} onClick={() => toggleSort('d90')}>61–90 Days <SortIcon field="d90" /></th>
                <th className={colCls} onClick={() => toggleSort('d90plus')}>90+ Days <SortIcon field="d90plus" /></th>
                <th className={colCls} onClick={() => toggleSort('total')}>Total <SortIcon field="total" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((r) => (
                <tr key={r.customer_name} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                  <td className="px-4 py-3 text-right text-neutral-500">{fmt(r.current)}</td>
                  <td className={`px-4 py-3 text-right ${r.d30 > 0 ? 'text-amber-600 font-medium' : 'text-neutral-400'}`}>{fmt(r.d30)}</td>
                  <td className={`px-4 py-3 text-right ${r.d60 > 0 ? 'text-orange-600 font-medium' : 'text-neutral-400'}`}>{fmt(r.d60)}</td>
                  <td className={`px-4 py-3 text-right ${r.d90 > 0 ? 'text-red-500 font-medium' : 'text-neutral-400'}`}>{fmt(r.d90)}</td>
                  <td className={`px-4 py-3 text-right ${r.d90plus > 0 ? 'text-red-700 font-semibold' : 'text-neutral-400'}`}>{fmt(r.d90plus)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-neutral-200 bg-neutral-50 text-sm font-semibold">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{fmt(totals.current)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{fmt(totals.d30)}</td>
                <td className="px-4 py-3 text-right text-orange-600">{fmt(totals.d60)}</td>
                <td className="px-4 py-3 text-right text-red-500">{fmt(totals.d90)}</td>
                <td className="px-4 py-3 text-right text-red-700">{fmt(totals.d90plus)}</td>
                <td className="px-4 py-3 text-right">{fmt(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />Current = not yet due</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />1–30 days overdue</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />31–60 days overdue</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" />61–90 days overdue</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-700" />90+ days overdue</span>
      </div>
    </div>
  );
}
