'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFYOptions, getMonthOptions, getQuarterOptions } from '@/lib/types/accounting';

type Tab = 'b2b' | 'b2cs' | 'b2cl' | 'hsn';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n ?? 0);
}

export default function Gstr1Client({ initialPeriod, filingPeriod }: { initialPeriod: string; filingPeriod: 'monthly' | 'quarterly' }) {
  const fyOpts = getFYOptions();
  const [fy, setFy] = useState(() => {
    const now = new Date();
    return String(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
  });
  const [period, setPeriod] = useState(initialPeriod);
  const [tab, setTab] = useState<Tab>('b2b');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodOpts = filingPeriod === 'quarterly' ? getQuarterOptions(fy) : getMonthOptions(fy);

  const load = useCallback(async (p: string) => {
    if (!p) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/accounting/gstr1?period=${p}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  function exportCSV(section: string) {
    window.open(`/api/accounting/export?period=${period}&section=${section}`, '_blank');
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'b2b',  label: 'B2B', count: data?.b2b?.length },
    { key: 'b2cs', label: 'B2CS', count: data?.b2cs?.length },
    { key: 'b2cl', label: 'B2CL', count: data?.b2cl?.length },
    { key: 'hsn',  label: 'HSN Summary', count: data?.hsn?.length },
  ];

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
        {data && (
          <button onClick={() => exportCSV('all')}
            className="ml-auto rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            ↓ Export CSV
          </button>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading && <div className="py-12 text-center text-sm text-neutral-400">Loading…</div>}

      {data && !loading && (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Invoices', value: data.totals.invoice_count },
              { label: 'Taxable Value', value: fmt(data.totals.taxable_value) },
              { label: 'Total GST', value: fmt(data.totals.total_tax) },
              { label: 'IGST', value: fmt(data.totals.igst) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs text-neutral-500">{s.label}</p>
                <p className="mt-0.5 text-lg font-semibold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-200">
            <div className="flex gap-1">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.key ? 'border-neutral-900 font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}>
                  {t.label} {t.count !== undefined && <span className="ml-1 text-xs text-neutral-400">({t.count})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* B2B */}
          {tab === 'b2b' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => exportCSV('b2b')} className="text-sm text-neutral-500 hover:text-neutral-900">↓ Export B2B</button>
              </div>
              {data.b2b.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">No B2B invoices in this period</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
                      <th className="px-3 py-2 text-left font-medium">Receiver GSTIN</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Invoice No</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-right font-medium">Taxable</th>
                      <th className="px-3 py-2 text-right font-medium">IGST</th>
                      <th className="px-3 py-2 text-right font-medium">CGST</th>
                      <th className="px-3 py-2 text-right font-medium">SGST</th>
                      <th className="px-3 py-2 text-right font-medium">Invoice Value</th>
                    </tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.b2b.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 font-mono">{r.receiver_gstin}</td>
                          <td className="px-3 py-2">{r.receiver_name}</td>
                          <td className="px-3 py-2 font-mono">{r.invoice_number}</td>
                          <td className="px-3 py-2">{r.invoice_date}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.taxable_value)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.igst)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.cgst)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.sgst)}</td>
                          <td className="px-3 py-2 text-right font-medium">{fmt(r.invoice_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* B2CS */}
          {tab === 'b2cs' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">Aggregated by Place of Supply + Rate. Individual invoice details not required for B2CS.</p>
              {data.b2cs.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">No B2CS invoices in this period</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
                      <th className="px-3 py-2 text-left font-medium">Place of Supply</th>
                      <th className="px-3 py-2 text-right font-medium">GST Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Taxable Value</th>
                      <th className="px-3 py-2 text-right font-medium">IGST</th>
                      <th className="px-3 py-2 text-right font-medium">CGST</th>
                      <th className="px-3 py-2 text-right font-medium">SGST</th>
                    </tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.b2cs.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="px-3 py-2">{r.place_of_supply || '—'}</td>
                          <td className="px-3 py-2 text-right">{r.rate}%</td>
                          <td className="px-3 py-2 text-right">{fmt(r.taxable_value)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.igst)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.cgst)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.sgst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* B2CL */}
          {tab === 'b2cl' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Individual invoices to unregistered buyers above ₹2.5 lakh.</p>
                <button onClick={() => exportCSV('b2cl')} className="text-sm text-neutral-500 hover:text-neutral-900">↓ Export B2CL</button>
              </div>
              {data.b2cl.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">No B2CL invoices in this period</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
                      <th className="px-3 py-2 text-left font-medium">Invoice No</th>
                      <th className="px-3 py-2 text-left font-medium">Customer</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Place of Supply</th>
                      <th className="px-3 py-2 text-right font-medium">Taxable Value</th>
                      <th className="px-3 py-2 text-right font-medium">IGST</th>
                      <th className="px-3 py-2 text-right font-medium">Invoice Value</th>
                    </tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.b2cl.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 font-mono">{r.invoice_number}</td>
                          <td className="px-3 py-2">{r.customer_name}</td>
                          <td className="px-3 py-2">{r.invoice_date}</td>
                          <td className="px-3 py-2">{r.place_of_supply || '—'}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.taxable_value)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.igst)}</td>
                          <td className="px-3 py-2 text-right font-medium">{fmt(r.invoice_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* HSN */}
          {tab === 'hsn' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">HSN/SAC-wise summary of all outward supplies in the period.</p>
              {data.hsn.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">No HSN data — add HSN/SAC codes to your invoice line items</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
                      <th className="px-3 py-2 text-left font-medium">HSN/SAC</th>
                      <th className="px-3 py-2 text-right font-medium">GST Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Taxable Value</th>
                      <th className="px-3 py-2 text-right font-medium">IGST</th>
                      <th className="px-3 py-2 text-right font-medium">CGST</th>
                      <th className="px-3 py-2 text-right font-medium">SGST</th>
                    </tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.hsn.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 font-mono">{r.hsn_code}</td>
                          <td className="px-3 py-2 text-right">{r.rate}%</td>
                          <td className="px-3 py-2 text-right">{fmt(r.taxable_value)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.igst)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.cgst)}</td>
                          <td className="px-3 py-2 text-right">{fmt(r.sgst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="py-12 text-center text-sm text-neutral-400">Select a period to view GSTR-1 data</div>
      )}
    </div>
  );
}
