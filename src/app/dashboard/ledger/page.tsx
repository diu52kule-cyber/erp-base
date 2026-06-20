import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import EmptyState from '@/components/EmptyState';

function fmt(n: number) { return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('ledger') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const [{ data: contacts }, { data: entries }] = await Promise.all([
    supabase.from('contacts').select('id, name, company, phone, credit_limit').eq('org_id', ctx.org.id).order('name'),
    supabase.from('ledger_entries').select('contact_id, amount').eq('org_id', ctx.org.id),
  ]);

  const balByContact = new Map<string, number>();
  for (const e of entries ?? []) balByContact.set(e.contact_id, (balByContact.get(e.contact_id) ?? 0) + Number(e.amount));

  const rows = (contacts ?? [])
    .map((c) => ({ ...c, balance: balByContact.get(c.id) ?? 0 }))
    .sort((a, b) => b.balance - a.balance);

  const totalReceivable = rows.reduce((s, r) => s + (r.balance > 0 ? r.balance : 0), 0);
  const totalAdvance = rows.reduce((s, r) => s + (r.balance < 0 ? -r.balance : 0), 0);
  const withDues = rows.filter((r) => r.balance > 0);
  const overLimit = rows.filter((r) => r.credit_limit != null && r.balance > Number(r.credit_limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Credit & Ledger</h1>
        <p className="mt-1 text-sm text-neutral-500">Customer credit (udhaar), payments received, and outstanding balances.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Total receivable', fmt(totalReceivable), 'text-amber-600'],
          ['Customers with dues', String(withDues.length), ''],
          ['Advances held', fmt(totalAdvance), 'text-green-600'],
          ['Over credit limit', String(overLimit.length), overLimit.length ? 'text-red-600' : ''],
        ].map(([l, v, cls]) => (
          <div key={l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{l}</p>
            <p className={`mt-1 text-2xl font-semibold ${cls}`}>{v}</p>
          </div>
        ))}
      </div>

      {(contacts ?? []).length === 0 ? (
        <EmptyState icon="📒" title="No customers yet"
          description="Add a contact in CRM first, then record credit and payments here."
          actionLabel="Add a contact" actionHref="/dashboard/crm/contacts/new" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-right font-medium">Credit limit</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => {
                const over = r.credit_limit != null && r.balance > Number(r.credit_limit);
                return (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium">{r.name}{r.company ? <span className="text-neutral-400"> · {r.company}</span> : null}</td>
                    <td className="px-4 py-3 text-neutral-500">{r.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">{r.credit_limit != null ? fmt(Number(r.credit_limit)) : '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.balance > 0 ? 'text-amber-600' : r.balance < 0 ? 'text-green-600' : 'text-neutral-400'}`}>
                      {r.balance === 0 ? '—' : (r.balance > 0 ? fmt(r.balance) + ' Dr' : fmt(r.balance) + ' Cr')}
                      {over && <span className="ml-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">over limit</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/ledger/${r.id}`} className="rounded-lg border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-100">Ledger →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
