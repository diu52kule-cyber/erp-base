import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import LedgerActions from './LedgerActions';

function fmt(n: number) { return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = { credit: 'Credit given', payment: 'Payment received', opening: 'Opening balance', adjustment: 'Adjustment' };

export default async function ContactLedgerPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('ledger') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const { data: contact } = await supabase.from('contacts')
    .select('id, name, company, phone, email, credit_limit').eq('id', params.id).eq('org_id', ctx.org.id).maybeSingle();
  if (!contact) notFound();

  const { data: entries } = await supabase.from('ledger_entries')
    .select('id, entry_date, type, amount, note, created_at')
    .eq('org_id', ctx.org.id).eq('contact_id', params.id)
    .order('entry_date', { ascending: true }).order('created_at', { ascending: true });

  const list = entries ?? [];
  // running balance
  let run = 0;
  const withRun = list.map((e) => { run += Number(e.amount); return { ...e, running: run }; }).reverse();
  const balance = run;
  const over = contact.credit_limit != null && balance > Number(contact.credit_limit);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/ledger" className="text-sm text-neutral-500 hover:text-neutral-900">← Ledger</Link>
        <h1 className="mt-1 text-2xl font-semibold">{contact.name}</h1>
        <p className="text-sm text-neutral-400">
          {contact.company ? `${contact.company} · ` : ''}{contact.phone ?? ''}{contact.email ? ` · ${contact.email}` : ''}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Balance + actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-400">Current balance</p>
            <p className={`mt-1 text-3xl font-bold ${balance > 0 ? 'text-amber-600' : balance < 0 ? 'text-green-600' : ''}`}>
              {fmt(balance)}
            </p>
            <p className="text-xs text-neutral-400">{balance > 0 ? 'Customer owes you' : balance < 0 ? 'Advance / you owe' : 'Settled'}</p>
            {contact.credit_limit != null && (
              <p className={`mt-2 text-xs ${over ? 'text-red-600 font-medium' : 'text-neutral-500'}`}>
                Credit limit: {fmt(Number(contact.credit_limit))}{over ? ' — over limit!' : ''}
              </p>
            )}
          </div>
          <LedgerActions contactId={contact.id} creditLimit={contact.credit_limit} />
        </div>

        {/* History */}
        <div className="md:col-span-2 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 py-2.5 text-sm font-semibold">History</div>
          {withRun.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-400">No entries yet. Record credit or a payment to start.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-right font-medium">Credit</th>
                <th className="px-4 py-2.5 text-right font-medium">Payment</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {withRun.map((e) => (
                  <tr key={e.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5">{new Date(e.entry_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5">{TYPE_LABEL[e.type] ?? e.type}{e.note ? <div className="text-xs text-neutral-400">{e.note}</div> : null}</td>
                    <td className="px-4 py-2.5 text-right text-amber-600">{e.amount > 0 ? fmt(e.amount) : ''}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">{e.amount < 0 ? fmt(e.amount) : ''}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmt(e.running)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
