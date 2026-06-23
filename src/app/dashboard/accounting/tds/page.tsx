import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import TdsClient from './TdsClient';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function TdsPage({ searchParams }: { searchParams: { type?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const type = searchParams.type ?? 'payable';
  const supabase = createClient();

  let entries: any[] = [];
  try {
    const { data } = await supabase
      .from('tds_entries')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('type', type)
      .order('entry_date', { ascending: false });
    entries = data ?? [];
  } catch { /* migration not run */ }

  const totalTds     = entries.reduce((s, e) => s + Number(e.tds_amount), 0);
  const pendingTds   = entries.filter((e) => e.status === 'pending').reduce((s, e) => s + Number(e.tds_amount), 0);
  const depositedTds = entries.filter((e) => e.status === 'deposited').reduce((s, e) => s + Number(e.tds_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
          <h1 className="mt-1 text-2xl font-semibold">TDS Ledger</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Tax Deducted at Source — {type === 'payable' ? 'TDS you must deposit' : 'TDS deducted from your receipts'}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-neutral-200">
        {['payable','receivable'].map((t) => (
          <Link key={t} href={`/dashboard/accounting/tds?type=${t}`}
            className={`border-b-2 px-4 py-2 text-sm capitalize ${type === t ? 'border-neutral-900 font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
            TDS {t}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total TDS', value: fmt(totalTds) },
          { label: 'Pending', value: fmt(pendingTds), color: pendingTds > 0 ? 'text-amber-600' : '' },
          { label: 'Deposited', value: fmt(depositedTds), color: 'text-green-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${s.color ?? ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {entries.length === 0 && 'No TDS entries yet. Run migration 0038_accounting_core.sql if entries don\'t show after adding them.'}
        </div>
      )}

      <TdsClient initialEntries={entries} type={type as 'payable' | 'receivable'} />
    </div>
  );
}
