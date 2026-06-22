'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_COLORS } from '@/lib/types/crm';
import type { Contact, Deal } from '@/lib/types/crm';

const CONTACT_TYPES = ['lead', 'customer', 'vendor'] as const;
const PAGE_SIZE = 50;

type SortField = 'name' | 'company' | 'type';
type SortDir   = 'asc' | 'desc';

function exportCsv(rows: Contact[]) {
  const headers = ['Name','Company','Type','Email','Phone','Tags'];
  const lines = rows.map((c) => [
    c.name, c.company ?? '', c.type, c.email ?? '', c.phone ?? '',
    (c as any).tags?.join('; ') ?? '',
  ].map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <span className="ml-1 text-neutral-300">↕</span>;
  return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function ContactsTable({ contacts, deals }: { contacts: Contact[]; deals: Deal[] }) {
  const [search, setSearch]         = useState('');
  const [type, setType]             = useState<string>('');
  const [page, setPage]             = useState(0);
  const [sortField, setSortField]   = useState<SortField>('name');
  const [sortDir,   setSortDir]     = useState<SortDir>('asc');

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  }

  const filtered = useMemo(() => {
    const ql = search.toLowerCase().trim();
    const rows = contacts.filter((c) => {
      const matchQ  = !ql || c.name.toLowerCase().includes(ql) || (c.company ?? '').toLowerCase().includes(ql) || (c.email ?? '').toLowerCase().includes(ql);
      const matchT  = !type || c.type === type;
      return matchQ && matchT && !(c as any).archived_at;
    });
    rows.sort((a, b) => {
      let av = '', bv = '';
      if (sortField === 'name')    { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      if (sortField === 'company') { av = (a.company ?? '').toLowerCase(); bv = (b.company ?? '').toLowerCase(); }
      if (sortField === 'type')    { av = a.type; bv = b.type; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [contacts, search, type, sortField, sortDir]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search" placeholder="Search name, company, email…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 min-w-[180px] rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="">All types</option>
          {CONTACT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{CONTACT_TYPE_LABELS[t]}</option>)}
        </select>
        <button onClick={() => exportCsv(filtered)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
          Export CSV
        </button>
        <span className="text-xs text-neutral-400">{filtered.length} of {contacts.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {pageRows.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-500">No contacts match your filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  Name <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('company')}>
                  Company <SortIcon field="company" sortField={sortField} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('type')}>
                  Type <SortIcon field="type" sortField={sortField} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left font-medium">Email / Phone</th>
                <th className="px-4 py-3 text-left font-medium">Deals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageRows.map((c) => {
                const cDeals = deals.filter((d) => d.contact_id === c.id);
                return (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/crm/contacts/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{c.company ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONTACT_TYPE_COLORS[c.type]}`}>
                        {CONTACT_TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{c.email ?? c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-500">{cDeals.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {pageCount > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-4 py-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2 py-1 rounded border border-neutral-200 text-xs disabled:opacity-40 hover:bg-neutral-50">‹</button>
            <span className="text-xs text-neutral-400">{page + 1} / {pageCount}</span>
            <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
              className="px-2 py-1 rounded border border-neutral-200 text-xs disabled:opacity-40 hover:bg-neutral-50">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
