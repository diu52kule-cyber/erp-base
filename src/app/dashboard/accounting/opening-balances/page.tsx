'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Account = { id: string; name: string; type: string; code: string | null };
type Balance = { account_id: string; amount: number };

const FY_OPTIONS = ['2022', '2023', '2024', '2025', '2026'];
const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;

export default function OpeningBalancesPage() {
  const [fy, setFy]               = useState('2024');
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [balances, setBalances]   = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [saved, setSaved]         = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accRes, balRes] = await Promise.all([
          fetch('/api/accounting/chart'),
          fetch(`/api/accounting/opening-balances?fy=${fy}`),
        ]);
        const accs  = await accRes.json();
        const bals  = await balRes.json();

        setAccounts(Array.isArray(accs) ? accs : []);
        const map: Record<string, string> = {};
        for (const b of (Array.isArray(bals) ? bals : [])) {
          map[b.account_id] = String(b.amount);
        }
        setBalances(map);
      } catch { /* tables may not exist yet */ }
      setLoading(false);
    }
    load();
  }, [fy]);

  async function save(accountId: string) {
    setSaving(accountId);
    const amount = parseFloat(balances[accountId] ?? '0') || 0;
    await fetch('/api/accounting/opening-balances', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, fy, amount }),
    });
    setSaving(null);
    setSaved((prev) => new Set([...prev, accountId]));
    setTimeout(() => setSaved((prev) => { const s = new Set(prev); s.delete(accountId); return s; }), 2000);
  }

  const grouped = ACCOUNT_TYPES.reduce((acc, t) => {
    acc[t] = accounts.filter((a) => a.type === t);
    return acc;
  }, {} as Record<string, Account[]>);

  if (loading) return <div className="p-8 text-sm text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← Accounting</Link>
        <h1 className="mt-2 text-2xl font-semibold">Opening Balances</h1>
        <p className="mt-1 text-sm text-neutral-500">Set the opening balance for each account at the start of a financial year.</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Financial Year:</label>
        <select value={fy} onChange={(e) => setFy(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          {FY_OPTIONS.map((y) => (
            <option key={y} value={y}>FY {y}–{String(parseInt(y) + 1).slice(-2)}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-400">(starts 1 Apr {fy})</span>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center text-neutral-400 text-sm">
          No accounts found. Set up your Chart of Accounts first.
          <br />
          <span className="text-xs text-neutral-300">Run migration 0045 + 0038 to activate.</span>
        </div>
      ) : (
        <div className="space-y-6">
          {ACCOUNT_TYPES.map((type) => {
            const accs = grouped[type] ?? [];
            if (accs.length === 0) return null;
            return (
              <div key={type}>
                <h2 className="mb-2 text-sm font-semibold capitalize text-neutral-600">{type} Accounts</h2>
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                        <th className="px-4 py-3 text-left font-medium">Account</th>
                        <th className="px-4 py-3 text-left font-medium w-20">Code</th>
                        <th className="px-4 py-3 text-right font-medium w-48">Opening Balance (₹)</th>
                        <th className="px-4 py-3 w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {accs.map((acc) => {
                        const isSaving = saving === acc.id;
                        const wasSaved = saved.has(acc.id);
                        return (
                          <tr key={acc.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-2 font-medium">{acc.name}</td>
                            <td className="px-4 py-2 font-mono text-xs text-neutral-400">{acc.code ?? '—'}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={balances[acc.id] ?? ''}
                                onChange={(e) => setBalances((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                                placeholder="0.00"
                                className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={() => save(acc.id)}
                                disabled={isSaving}
                                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:opacity-50"
                              >
                                {isSaving ? '…' : wasSaved ? '✓' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
