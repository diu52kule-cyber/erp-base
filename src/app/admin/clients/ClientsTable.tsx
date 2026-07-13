'use client';
import { useState } from 'react';
import Link from 'next/link';

type OrgRow = {
  id: string; name: string; business_type: string; created_at: string;
  plan: string; status: string; amount: number; next_billing_date: string | null;
  members: number; revenue: number; last_active: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-50 text-green-700',
  trial:     'bg-yellow-50 text-yellow-700',
  suspended: 'bg-red-50 text-red-600',
  cancelled: 'bg-neutral-100 text-neutral-400',
};
const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-yellow-50 text-yellow-700', starter: 'bg-blue-50 text-blue-700',
  growth: 'bg-indigo-50 text-indigo-700', scale: 'bg-purple-50 text-purple-700',
  custom: 'bg-neutral-100 text-neutral-700',
};

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + 'T23:59:59').getTime() - Date.now()) / 86400000);
}

export default function ClientsTable({ rows, totalMRR, totalActive, totalTrial, totalRev }:
  { rows: OrgRow[]; totalMRR: number; totalActive: number; totalTrial: number; totalRev: number }) {

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [extending, setExtending] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    const matchQ = !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.business_type.toLowerCase().includes(query.toLowerCase());
    const matchS = statusFilter === 'all' || r.status === statusFilter;
    return matchQ && matchS;
  });

  async function extendTrial(orgId: string, days: number) {
    setExtending(orgId);
    await fetch(`/api/admin/orgs/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extend_trial_days: days }),
    });
    setExtending(null);
    window.location.reload();
  }

  const TABS = ['all', 'active', 'trial', 'suspended', 'cancelled'];

  return (
    <div className="space-y-5">
      {/* KPI bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Total Clients', rows.length, ''],
          ['Active Plans', totalActive, 'text-green-600'],
          ['On Trial', totalTrial, 'text-yellow-600'],
          ['Monthly Revenue', fmt(totalMRR), 'text-indigo-600'],
        ].map(([label, value, cls]) => (
          <div key={label as string} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or type…"
            className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {TABS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'}`}>
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-400 shrink-0">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Plan / Status</th>
              <th className="px-4 py-3 text-center font-medium">Trial</th>
              <th className="px-4 py-3 text-right font-medium">MRR</th>
              <th className="px-4 py-3 text-right font-medium">Members</th>
              <th className="px-4 py-3 text-right font-medium">Revenue</th>
              <th className="px-4 py-3 text-left font-medium">Last active</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((row) => {
              const days = row.status === 'trial' ? daysLeft(row.next_billing_date) : null;
              const isExpiring = days !== null && days <= 3 && days >= 0;
              const isExpired  = days !== null && days < 0;
              return (
                <tr key={row.id} className={`hover:bg-neutral-50 ${isExpired ? 'bg-red-50/30' : isExpiring ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-neutral-400 capitalize">{row.business_type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[row.plan] ?? 'bg-neutral-100 text-neutral-600'}`}>
                        {row.plan}
                      </span>
                      <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status] ?? ''}`}>
                        {row.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {days === null ? (
                      <span className="text-xs text-neutral-300">—</span>
                    ) : isExpired ? (
                      <span className="text-xs font-semibold text-red-600">Expired</span>
                    ) : (
                      <span className={`text-xs font-semibold tabular-nums ${days <= 1 ? 'text-red-600' : days <= 3 ? 'text-orange-500' : 'text-amber-600'}`}>
                        {days}d left
                      </span>
                    )}
                    {row.status === 'trial' && (
                      <div className="flex justify-center gap-1 mt-1">
                        <button onClick={() => extendTrial(row.id, 7)} disabled={extending === row.id}
                          className="text-[10px] rounded px-1.5 py-0.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40">
                          +7d
                        </button>
                        <button onClick={() => extendTrial(row.id, 30)} disabled={extending === row.id}
                          className="text-[10px] rounded px-1.5 py-0.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40">
                          +30d
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm">{fmt(row.amount)}</td>
                  <td className="px-4 py-3 text-right text-sm">{row.members}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700 text-sm">{fmt(row.revenue)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {row.last_active ? new Date(row.last_active).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {new Date(row.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/clients/${row.id}`}
                      className="rounded-lg border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-100 whitespace-nowrap">
                      Manage →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-neutral-400">No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
