'use client';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '@/lib/types/purchase';
import type { PurchaseOrder } from '@/lib/types/purchase';

type SortField = 'po_number' | 'vendor_name' | 'issue_date' | 'total' | 'status';
type SortDir   = 'asc' | 'desc';

const ALL_STATUSES = ['draft', 'sent', 'partial', 'received', 'billed', 'cancelled'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);
}

function exportCsv(rows: PurchaseOrder[]) {
  const headers = ['PO Number', 'Vendor', 'Status', 'Issue Date', 'Expected Delivery', 'Total'];
  const lines = rows.map((po) => [
    po.po_number, po.vendor_name, po.status, po.issue_date, po.expected_delivery ?? '', po.total,
  ].map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export default function POListClient({ orders }: { orders: PurchaseOrder[] }) {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-neutral-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = orders.filter((po) => {
      const matchQ  = !q || po.po_number.toLowerCase().includes(q) || po.vendor_name.toLowerCase().includes(q);
      const matchSt = !status || po.status === status;
      return matchQ && matchSt;
    });
    rows.sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0;
      if (sortField === 'po_number')   { av = a.po_number; bv = b.po_number; }
      else if (sortField === 'vendor_name') { av = a.vendor_name.toLowerCase(); bv = b.vendor_name.toLowerCase(); }
      else if (sortField === 'issue_date')  { av = a.issue_date; bv = b.issue_date; }
      else if (sortField === 'total')       { av = a.total ?? 0; bv = b.total ?? 0; }
      else if (sortField === 'status')      { av = a.status; bv = b.status; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [orders, search, status, sortField, sortDir]);

  const thCls = 'px-4 py-3 text-left font-medium cursor-pointer select-none';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" placeholder="Search PO # or vendor…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{PO_STATUS_LABELS[s as keyof typeof PO_STATUS_LABELS] ?? s}</option>)}
        </select>
        <button onClick={() => exportCsv(filtered)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">Export CSV</button>
        <span className="text-xs text-neutral-400">{filtered.length} of {orders.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-500">No purchase orders match your filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className={thCls} onClick={() => toggleSort('po_number')}>PO Number <SortIcon field="po_number" /></th>
                <th className={thCls} onClick={() => toggleSort('vendor_name')}>Vendor <SortIcon field="vendor_name" /></th>
                <th className={thCls} onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></th>
                <th className={thCls} onClick={() => toggleSort('issue_date')}>Issue Date <SortIcon field="issue_date" /></th>
                <th className="px-4 py-3 text-left font-medium">Expected</th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('total')}>Total <SortIcon field="total" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((po) => (
                <tr key={po.id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/purchase/${po.id}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{po.po_number}</span>
                  </td>
                  <td className="px-4 py-3">{po.vendor_name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PO_STATUS_COLORS[po.status]}`}>
                      {PO_STATUS_LABELS[po.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{po.issue_date}</td>
                  <td className="px-4 py-3 text-neutral-500">{po.expected_delivery ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(po.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
