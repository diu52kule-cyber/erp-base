import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { getFYDateRange } from '@/lib/types/accounting';
import JournalsClient from './JournalsClient';

export default async function JournalsPage({ searchParams }: { searchParams: { fy?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = searchParams.fy ?? String(currentFY);
  const { start, end } = getFYDateRange(fy);
  const fyLabel = `${fy}-${String(Number(fy) + 1).slice(-2)}`;

  const supabase = await createClient();

  let journals: any[] = [];
  let accounts: any[] = [];
  try {
    const [jRes, aRes] = await Promise.all([
      supabase.from('journal_entries')
        .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(code,name,type))')
        .eq('org_id', ctx.org.id)
        .gte('entry_date', start).lte('entry_date', end)
        .order('entry_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('chart_of_accounts')
        .select('id,code,name,type')
        .eq('org_id', ctx.org.id).eq('is_active', true).order('code'),
    ]);
    journals = jRes.data ?? [];
    accounts = aRes.data ?? [];
  } catch { /* migration not run */ }

  const fyOptions = [currentFY, currentFY - 1, currentFY - 2].map(String);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
          <h1 className="mt-1 text-2xl font-semibold">Journal Entries</h1>
          <p className="mt-0.5 text-sm text-neutral-500">FY {fyLabel} — manual double-entry</p>
        </div>
        <select
          defaultValue={fy}
          onChange={(e) => { window.location.href = `/dashboard/accounting/journals?fy=${e.target.value}`; }}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          {fyOptions.map((f) => <option key={f} value={f}>FY {f}-{String(Number(f) + 1).slice(-2)}</option>)}
        </select>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Run migration <code>0038_accounting_core.sql</code> in Supabase to activate journal entries.
        </div>
      ) : (
        <JournalsClient journals={journals} accounts={accounts} />
      )}
    </div>
  );
}
