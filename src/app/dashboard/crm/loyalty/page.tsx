import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export default async function LoyaltyPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  let accounts: any[] = [];
  let txs: any[] = [];

  try {
    const [{ data: accs }, { data: transactions }] = await Promise.all([
      supabase
        .from('loyalty_accounts')
        .select('*, contact:contacts(name, phone, email)')
        .eq('org_id', ctx.org.id)
        .order('points', { ascending: false })
        .limit(100),
      supabase
        .from('loyalty_transactions')
        .select('*, contact:contacts(name)')
        .eq('org_id', ctx.org.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    accounts = accs ?? [];
    txs = transactions ?? [];
  } catch { /* migration not run yet */ }

  const totalPoints = accounts.reduce((s: number, a: any) => s + (a.points ?? 0), 0);
  const totalMembers = accounts.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">← CRM</Link>
          <h1 className="mt-1 text-2xl font-semibold">Loyalty Program</h1>
          <p className="mt-1 text-sm text-neutral-500">Customer points earned via POS and invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Members', value: fmt(totalMembers) },
          { label: 'Total Points Outstanding', value: fmt(totalPoints) },
          { label: 'Earn Rate', value: '1 pt / ₹10' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
          <p className="text-neutral-400 text-sm">No loyalty members yet.</p>
          <p className="mt-1 text-xs text-neutral-400">Points are earned automatically when POS orders are placed with a customer selected.</p>
          <p className="mt-2 text-xs text-neutral-300">Run migration 0044 in Supabase to activate loyalty.</p>
        </div>
      ) : (
        <div>
          <h2 className="mb-3 font-medium">Top Members</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Points</th>
                  <th className="px-4 py-3 text-right font-medium">Lifetime Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {accounts.map((a: any) => (
                  <tr key={a.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.contact?.name ?? '—'}</p>
                      {a.contact?.phone && <p className="text-xs text-neutral-400">{a.contact.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(a.points ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-neutral-500 tabular-nums">{fmt(a.lifetime_points ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {txs.length > 0 && (
        <div>
          <h2 className="mb-3 font-medium">Recent Transactions</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Points</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {txs.map((t: any) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2">{t.contact?.name ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.type === 'earn' ? 'bg-green-50 text-green-700' :
                        t.type === 'redeem' ? 'bg-blue-50 text-blue-700' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>{t.type}</span>
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${t.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {t.points > 0 ? '+' : ''}{fmt(t.points)}
                    </td>
                    <td className="px-4 py-2 text-neutral-500 text-xs">
                      {new Date(t.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
