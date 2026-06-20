'use client';
import { useEffect, useState, useCallback } from 'react';

function fmt(n: number) { return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

type B2B = { supplier_gstin: string; supplier_name: string; bill_number: string; bill_date: string; supplier_state: string; taxable_value: number; igst: number; cgst: number; sgst: number; total: number };
type Unreg = { supplier_name: string; bill_number: string; bill_date: string; taxable_value: number; gst: number; total: number };
type Data = { b2b: B2B[]; unregistered: Unreg[]; totals: { taxable_value: number; igst: number; cgst: number; sgst: number; total_itc: number; bill_count: number }; needsMigration?: boolean };

export default function Gstr2Client({ initialPeriod }: { initialPeriod: string }) {
  const [period, setPeriod] = useState(initialPeriod);
  const [tab, setTab] = useState<'b2b' | 'unregistered'>('b2b');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/accounting/gstr2?period=${period}`);
    setData(await res.json());
    setLoading(false);
  }, [period]);
  useEffect(() => { load(); }, [load]);

  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
      </div>

      {data?.needsMigration && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The Purchase module tables aren&apos;t set up yet. Run <code className="font-mono">0008_purchase.sql</code> in the Supabase SQL Editor, then create vendor bills to populate this report.
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Taxable value', fmt(t?.taxable_value ?? 0)],
          ['IGST', fmt(t?.igst ?? 0)],
          ['CGST', fmt(t?.cgst ?? 0)],
          ['SGST', fmt(t?.sgst ?? 0)],
          ['Total ITC', fmt(t?.total_itc ?? 0)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{l}</p>
            <p className="mt-1 text-lg font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['b2b', 'unregistered'] as const).map((x) => (
          <button key={x} onClick={() => setTab(x)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === x ? 'bg-neutral-900 text-white' : 'border border-neutral-200 hover:bg-neutral-50'}`}>
            {x === 'b2b' ? `B2B (${data?.b2b.length ?? 0})` : `Unregistered (${data?.unregistered.length ?? 0})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-neutral-400">Loading…</div>
        ) : tab === 'b2b' ? (
          (data?.b2b.length ?? 0) === 0 ? <div className="p-10 text-center text-sm text-neutral-400">No registered-vendor bills in this period.</div> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-3 py-2.5 text-left font-medium">Supplier GSTIN</th>
                <th className="px-3 py-2.5 text-left font-medium">Supplier</th>
                <th className="px-3 py-2.5 text-left font-medium">Bill</th>
                <th className="px-3 py-2.5 text-right font-medium">Taxable</th>
                <th className="px-3 py-2.5 text-right font-medium">IGST</th>
                <th className="px-3 py-2.5 text-right font-medium">CGST</th>
                <th className="px-3 py-2.5 text-right font-medium">SGST</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {data!.b2b.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5 font-mono text-xs">{r.supplier_gstin}</td>
                    <td className="px-3 py-2.5">{r.supplier_name}</td>
                    <td className="px-3 py-2.5">{r.bill_number}<div className="text-xs text-neutral-400">{new Date(r.bill_date).toLocaleDateString('en-IN')}</div></td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.taxable_value)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.igst)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.cgst)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.sgst)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          (data?.unregistered.length ?? 0) === 0 ? <div className="p-10 text-center text-sm text-neutral-400">No unregistered-vendor bills in this period.</div> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-3 py-2.5 text-left font-medium">Supplier</th>
                <th className="px-3 py-2.5 text-left font-medium">Bill</th>
                <th className="px-3 py-2.5 text-right font-medium">Taxable</th>
                <th className="px-3 py-2.5 text-right font-medium">GST</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {data!.unregistered.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-3 py-2.5">{r.supplier_name}</td>
                    <td className="px-3 py-2.5">{r.bill_number}<div className="text-xs text-neutral-400">{new Date(r.bill_date).toLocaleDateString('en-IN')}</div></td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.taxable_value)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.gst)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
