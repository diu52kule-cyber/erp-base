'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Invoice, InvoiceStatus } from '@/lib/types/billing';
import type { DocType } from '@/lib/invoice/docTypes';
import { fmtMoney } from '@/lib/invoice/format';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-neutral-100 text-neutral-600',
  sent:      'bg-blue-50 text-blue-700',
  partial:   'bg-amber-50 text-amber-700',
  paid:      'bg-green-50 text-green-700',
  refunded:  'bg-red-50 text-red-600',
  cancelled: 'bg-neutral-100 text-neutral-400',
};

const ALL_STATUSES: InvoiceStatus[] = ['draft','sent','partial','paid','refunded','cancelled'];

type Row = Pick<Invoice, 'id' | 'invoice_number' | 'customer_name' | 'issue_date' | 'total' | 'status' | 'currency' | 'amount_paid'>;
type SortField = 'invoice_number' | 'customer_name' | 'issue_date' | 'total' | 'balance';
type SortDir   = 'asc' | 'desc';

function exportCsv(rows: Row[], docType: DocType, label: string) {
  const headers = ['Number','Customer','Date','Total','Status','Balance'];
  const lines = rows.map((r) => [
    r.invoice_number, r.customer_name, r.issue_date,
    r.total, r.status, Math.max(0, (r.total ?? 0) - (r.amount_paid ?? 0)),
  ].map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${label || docType}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

const PAGE_SIZE = 50;

export default function BillingTable({ invoices, docType, shortLabel }: { invoices: Row[]; docType: DocType; shortLabel: string }) {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState<InvoiceStatus | ''>('');
  const [page, setPage]       = useState(0);
  const [cursor, setCursor]   = useState(-1);
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const lenRef = useRef(0);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-neutral-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const filtered = useMemo(() => {
    const ql = search.toLowerCase().trim();
    const rows = invoices.filter((inv) => {
      const matchQ  = !ql || inv.invoice_number.toLowerCase().includes(ql) || inv.customer_name.toLowerCase().includes(ql);
      const matchSt = !status || inv.status === status;
      return matchQ && matchSt;
    });
    // Sort
    rows.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortField === 'invoice_number')  { av = a.invoice_number; bv = b.invoice_number; }
      else if (sortField === 'customer_name') { av = a.customer_name.toLowerCase(); bv = b.customer_name.toLowerCase(); }
      else if (sortField === 'issue_date') { av = a.issue_date; bv = b.issue_date; }
      else if (sortField === 'total')      { av = a.total ?? 0; bv = b.total ?? 0; }
      else if (sortField === 'balance')    { av = Math.max(0, (a.total ?? 0) - (a.amount_paid ?? 0)); bv = Math.max(0, (b.total ?? 0) - (b.amount_paid ?? 0)); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [invoices, search, status, sortField, sortDir]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  lenRef.current  = pageRows.length;

  // deselect items no longer visible after filter change
  useEffect(() => { setPage(0); setCursor(-1); }, [search, status]);
  useEffect(() => { setCursor(-1); }, [page]);

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  function toggleAllPage() {
    if (allPageSelected) {
      setSelected((s) => { const n = new Set(s); pageRows.forEach((r) => n.delete(r.id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); pageRows.forEach((r) => n.add(r.id)); return n; });
    }
  }
  function toggleRow(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selectedRows = filtered.filter((r) => selected.has(r.id));

  async function bulkMarkSent() {
    const ids = selectedRows.filter((r) => r.status === 'draft').map((r) => r.id);
    if (!ids.length) return;
    setBulkPending(true);
    try {
      await Promise.all(ids.map((id) => fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      })));
      window.location.reload();
    } catch { setBulkPending(false); }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(c + 1, lenRef.current - 1)); return; }
      if (e.key === 'ArrowUp'   || e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); return; }
      if (e.key === 'Escape') { setCursor(-1); return; }
      if ((e.key === 'Enter' || e.key === 'o') && cursor >= 0 && pageRows[cursor]) {
        e.preventDefault(); window.location.href = `/dashboard/billing/${pageRows[cursor].id}`;
      }
      if (e.key === 'e' && cursor >= 0 && pageRows[cursor]) {
        e.preventDefault(); window.location.href = `/dashboard/billing/${pageRows[cursor].id}/edit`;
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); window.location.href = `/dashboard/billing/new?type=${docType}`;
      }
      if (e.key === 'x' && cursor >= 0 && pageRows[cursor]) {
        e.preventDefault(); toggleRow(pageRows[cursor].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, pageRows, docType]);

  return (
    <div className="space-y-3">
      {/* Search / filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder={`Search ${shortLabel.toLowerCase()} # or customer…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <button onClick={() => exportCsv(filtered, docType, shortLabel)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
          Export all
        </button>
        <span className="text-xs text-neutral-400">{filtered.length} of {invoices.length}</span>
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
          <span className="font-medium text-blue-700">{selected.size} selected</span>
          <button onClick={() => exportCsv(selectedRows, docType, `${shortLabel}-selected`)}
            className="rounded-md border border-blue-200 bg-white px-3 py-1 text-xs hover:bg-neutral-50">
            Export selected
          </button>
          {selectedRows.some((r) => r.status === 'draft') && (
            <button onClick={bulkMarkSent} disabled={bulkPending}
              className="rounded-md border border-blue-200 bg-white px-3 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50">
              {bulkPending ? 'Updating…' : `Mark ${selectedRows.filter((r) => r.status === 'draft').length} as Sent`}
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-neutral-400 hover:text-neutral-700">
            Deselect all
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {cursor >= 0 && (
          <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-1.5 text-xs text-neutral-500">
            <span>Row {cursor + 1}/{pageRows.length}</span>
            <span>↵ open · E edit · X select · Esc deselect</span>
          </div>
        )}
        {pageRows.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-500">
            No {shortLabel.toLowerCase()}s match your filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="w-8 px-4 py-3">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAllPage}
                    className="rounded border-neutral-300" aria-label="Select all on page" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('invoice_number')}>
                  {shortLabel} # <SortIcon field="invoice_number" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('customer_name')}>
                  Customer <SortIcon field="customer_name" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('issue_date')}>
                  Date <SortIcon field="issue_date" />
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('total')}>
                  Amount <SortIcon field="total" />
                </th>
                {docType === 'invoice' && (
                  <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('balance')}>
                    Balance <SortIcon field="balance" />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageRows.map((inv, i) => {
                const balance  = Math.max(0, (inv.total ?? 0) - (inv.amount_paid ?? 0));
                const isSelected = selected.has(inv.id);
                const highlighted = i === cursor;
                return (
                  <tr
                    key={inv.id}
                    className={`transition-colors ${highlighted ? 'bg-blue-50 outline outline-1 outline-blue-200' : isSelected ? 'bg-blue-50/40' : 'hover:bg-neutral-50'}`}
                  >
                    <td className="w-8 px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleRow(inv.id); }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(inv.id)}
                        className="rounded border-neutral-300" />
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900 cursor-pointer" onClick={() => window.location.href = `/dashboard/billing/${inv.id}`}>{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-neutral-700 cursor-pointer" onClick={() => window.location.href = `/dashboard/billing/${inv.id}`}>{inv.customer_name}</td>
                    <td className="px-4 py-3 text-neutral-500 cursor-pointer" onClick={() => window.location.href = `/dashboard/billing/${inv.id}`}>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-medium cursor-pointer" onClick={() => window.location.href = `/dashboard/billing/${inv.id}`}>{fmtMoney(inv.total, inv.currency ?? 'INR')}</td>
                    {docType === 'invoice' && (
                      <td className={`px-4 py-3 text-right cursor-pointer ${balance > 0 ? 'text-amber-600' : 'text-neutral-400'}`} onClick={() => window.location.href = `/dashboard/billing/${inv.id}`}>
                        {balance > 0 ? fmtMoney(balance, inv.currency ?? 'INR') : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 cursor-pointer" onClick={() => window.location.href = `/dashboard/billing/${inv.id}`}>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {inv.status !== 'cancelled' && (
                        <Link href={`/dashboard/billing/${inv.id}/edit`} className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50">Edit</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 text-xs text-neutral-400">
          <span>↑↓ navigate · ↵ open · E edit · X select · N new {shortLabel.toLowerCase()}</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">‹</button>
              <span>{page + 1} / {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="px-2 py-1 rounded border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
