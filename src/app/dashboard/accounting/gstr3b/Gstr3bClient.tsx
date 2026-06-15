'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFYOptions, getMonthOptions, getQuarterOptions } from '@/lib/types/accounting';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n ?? 0);
}

export default function Gstr3bClient({ initialPeriod, filingPeriod }: { initialPeriod: string; filingPeriod: 'monthly' | 'quarterly' }) {
  const fyOpts = getFYOptions();
  const [fy, setFy] = useState(() => {
    const now = new Date();
    return String(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
  });
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodOpts = filingPeriod === 'quarterly' ? getQuarterOptions(fy) : getMonthOptions(fy);

  const load = useCallback(async (p: string) => {
    if (!p) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/accounting/gstr3b?period=${p}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={fy} onChange={(e) => { setFy(e.target.value); setPeriod(''); }}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          {fyOpts.map((f) => <option key={f.value} value={f.value}>FY {f.label}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="">— Select period —</option>
          {periodOpts.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="py-12 text-center text-sm text-neutral-400">Loading…</div>}

      {data && !loading && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-3">
              <h2 className="text-sm font-semibold">Table 3.1 — Details of Outward Supplies and Inward Supplies liable to Reverse Charge</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Period: {data.start} to {data.end} · {data.invoice_count} invoices</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-5 py-2 text-left font-medium w-8">#</th>
                <th className="px-5 py-2 text-left font-medium">Nature of Supplies</th>
                <th className="px-5 py-2 text-right font-medium">Total Taxable Value</th>
                <th className="px-5 py-2 text-right font-medium">Integrated Tax</th>
                <th className="px-5 py-2 text-right font-medium">Central Tax</th>
                <th className="px-5 py-2 text-right font-medium">State/UT Tax</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {[
                  { num: '(a)', label: 'Outward taxable supplies (other than zero rated, nil and exempted)', data: data.table_3_1.a_outward_taxable },
                  { num: '(b)', label: 'Outward taxable supplies (zero rated)', data: data.table_3_1.b_zero_rated_exports },
                  { num: '(e)', label: 'Non-GST outward supplies / nil-rated / exempted', data: data.table_3_1.e_nil_exempted },
                ].map((row) => (
                  <tr key={row.num} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 text-neutral-400 text-xs">{row.num}</td>
                    <td className="px-5 py-3">{row.label}</td>
                    <td className="px-5 py-3 text-right">{fmt(row.data.taxable_value)}</td>
                    <td className="px-5 py-3 text-right">{fmt(row.data.igst)}</td>
                    <td className="px-5 py-3 text-right">{fmt(row.data.cgst)}</td>
                    <td className="px-5 py-3 text-right">{fmt(row.data.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table 6.1 — Tax Payable */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 bg-neutral-50 px-5 py-3">
              <h2 className="text-sm font-semibold">Table 6.1 — Payment of Tax</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'IGST', value: fmt(data.tax_payable.igst) },
                  { label: 'CGST', value: fmt(data.tax_payable.cgst) },
                  { label: 'SGST', value: fmt(data.tax_payable.sgst) },
                  { label: 'Total Tax Payable', value: fmt(data.tax_payable.total) },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border p-4 ${s.label === 'Total Tax Payable' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'}`}>
                    <p className={`text-xs ${s.label === 'Total Tax Payable' ? 'text-neutral-400' : 'text-neutral-500'}`}>{s.label}</p>
                    <p className="mt-1 text-xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Note: This is output tax liability only. ITC (Input Tax Credit) has not been computed. Net payable after ITC may be lower.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700 space-y-1">
            <p className="font-medium">Next steps</p>
            <p>1. Log in to the GST Portal (gstin.gov.in)</p>
            <p>2. Go to Returns → GSTR-3B → Select period → Fill values from above</p>
            <p>3. Claim eligible ITC in Table 4 before paying</p>
            <p>4. Pay remaining tax via Challan (PMT-06) using net banking / UPI</p>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="py-12 text-center text-sm text-neutral-400">Select a period to view GSTR-3B summary</div>
      )}
    </div>
  );
}
