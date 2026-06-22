'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Report = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  columns: { key: string; label: string }[];
  filters: { field: string; op: string; value: string }[];
  sort_by: string | null;
  sort_dir: string;
  created_at: string;
};

const SOURCES = [
  { key: 'invoices',  label: 'Invoices',       columns: ['invoice_number','customer_name','issue_date','total','status','amount_paid'] },
  { key: 'contacts',  label: 'Contacts',        columns: ['name','company','type','email','phone'] },
  { key: 'products',  label: 'Products',        columns: ['name','sku','category','stock_qty','selling_price','cost_price'] },
  { key: 'deals',     label: 'Deals',           columns: ['name','stage','value','contact_id','created_at'] },
  { key: 'employees', label: 'Employees',       columns: ['name','designation','department','monthly_salary','status'] },
  { key: 'expenses',  label: 'Expense Claims',  columns: ['title','amount','status','submitted_by','created_at'] },
];

const OPS = [
  { key: 'eq',    label: 'equals' },
  { key: 'neq',   label: 'not equals' },
  { key: 'ilike', label: 'contains' },
  { key: 'gt',    label: '>' },
  { key: 'lt',    label: '<' },
  { key: 'gte',   label: '>=' },
  { key: 'lte',   label: '<=' },
];

function exportCsv(rows: Record<string, unknown>[], cols: { key: string; label: string }[]) {
  const headers = cols.map((c) => c.label);
  const lines = rows.map((r) => cols.map((c) => {
    const val = r[c.key] ?? '';
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export default function CustomReportsPage() {
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [results, setResults]   = useState<Record<string, unknown>[]>([]);
  const [resultCols, setResultCols] = useState<{ key: string; label: string }[]>([]);
  const [running, setRunning]   = useState(false);

  const [form, setForm] = useState({
    name: '',
    source: 'invoices',
    columns: [] as string[],
    filters: [] as { field: string; op: string; value: string }[],
    sort_by: '',
    sort_dir: 'desc',
    description: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/custom');
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch { setReports([]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const sourceDef = SOURCES.find((s) => s.key === form.source) ?? SOURCES[0];

  function toggleColumn(col: string) {
    setForm((f) => ({
      ...f,
      columns: f.columns.includes(col) ? f.columns.filter((c) => c !== col) : [...f.columns, col],
    }));
  }

  function addFilter() {
    setForm((f) => ({ ...f, filters: [...f.filters, { field: sourceDef.columns[0], op: 'eq', value: '' }] }));
  }

  function updateFilter(i: number, patch: Partial<{ field: string; op: string; value: string }>) {
    setForm((f) => ({ ...f, filters: f.filters.map((fil, j) => j === i ? { ...fil, ...patch } : fil) }));
  }

  async function saveReport() {
    if (!form.name.trim()) return;
    const cols = form.columns.length > 0
      ? form.columns.map((k) => ({ key: k, label: k.replace(/_/g, ' ') }))
      : sourceDef.columns.map((k) => ({ key: k, label: k.replace(/_/g, ' ') }));

    const res = await fetch('/api/reports/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        columns: cols,
        sort_by: form.sort_by || null,
      }),
    });
    const data = await res.json();
    if (data.id) {
      setCreating(false);
      load();
    }
  }

  async function runReport(report: Report) {
    setActiveReport(report);
    setRunning(true);
    try {
      const res = await fetch(`/api/reports/custom/${report.id}/run`);
      const data = await res.json();
      setResults(data.data ?? []);
      setResultCols(data.columns ?? report.columns);
    } catch { setResults([]); }
    setRunning(false);
  }

  async function deleteReport(id: string) {
    if (!confirm('Delete this report?')) return;
    await fetch('/api/reports/custom', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (activeReport?.id === id) { setActiveReport(null); setResults([]); }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/reports" className="text-sm text-neutral-500 hover:text-neutral-900">← Reports</Link>
          <h1 className="mt-1 text-2xl font-semibold">Custom Reports</h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          {creating ? 'Cancel' : '+ New Report'}
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-4">
          <h2 className="font-medium text-sm">New Report</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Report Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Monthly Revenue"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Data Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value, columns: [], filters: [] })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Column selector */}
          <div>
            <label className="mb-2 block text-xs text-neutral-500">Columns (all if none selected)</label>
            <div className="flex flex-wrap gap-2">
              {sourceDef.columns.map((col) => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    form.columns.includes(col)
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {col.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-neutral-500">Filters</label>
              <button onClick={addFilter} className="text-xs text-blue-600 hover:underline">+ Add filter</button>
            </div>
            {form.filters.map((f, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={f.field} onChange={(e) => updateFilter(i, { field: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs bg-white">
                  {sourceDef.columns.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
                <select value={f.op} onChange={(e) => updateFilter(i, { op: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs bg-white">
                  {OPS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <input value={f.value} onChange={(e) => updateFilter(i, { value: e.target.value })}
                  placeholder="value"
                  className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
                <button onClick={() => setForm((fm) => ({ ...fm, filters: fm.filters.filter((_, j) => j !== i) }))}
                  className="text-red-400 hover:text-red-600 text-xs px-1">×</button>
              </div>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-neutral-500">Sort by</label>
              <select value={form.sort_by} onChange={(e) => setForm({ ...form, sort_by: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs bg-white">
                <option value="">Default</option>
                {sourceDef.columns.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Direction</label>
              <select value={form.sort_dir} onChange={(e) => setForm({ ...form, sort_dir: e.target.value })}
                className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs bg-white">
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveReport} disabled={!form.name.trim()}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              Save Report
            </button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Saved Reports</p>
          {loading ? (
            <p className="text-sm text-neutral-400">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-neutral-400">No reports yet. Create one above.</p>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-3 cursor-pointer transition-colors ${activeReport?.id === r.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
                onClick={() => runReport(r)}
              >
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5 capitalize">{r.source}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); runReport(r); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Run
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2 space-y-3">
          {activeReport && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{activeReport.name} <span className="text-neutral-400 font-normal">— {results.length} rows</span></p>
              <button
                onClick={() => exportCsv(results, resultCols)}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50"
              >
                Export CSV
              </button>
            </div>
          )}

          {running ? (
            <p className="text-sm text-neutral-400">Running report…</p>
          ) : activeReport && results.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 p-8 text-center">
              <p className="text-sm text-neutral-400">No results match the report filters.</p>
            </div>
          ) : activeReport ? (
            <div className="overflow-auto rounded-xl border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50">
                  <tr>
                    {resultCols.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-neutral-500 capitalize">
                        {col.label.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {results.map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      {resultCols.map((col) => (
                        <td key={col.key} className="px-3 py-2 text-xs text-neutral-700 max-w-[200px] truncate">
                          {String(row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 p-12 text-center">
              <p className="text-neutral-400 text-sm">Select a saved report to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
