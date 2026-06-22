import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { getFYDateRange } from '@/lib/types/accounting';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n));
}

export default async function TrialBalancePage({ searchParams }: { searchParams: { fy?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = searchParams.fy ?? String(currentFY);
  const { start, end } = getFYDateRange(fy);
  const fyLabel = `${fy}-${String(Number(fy) + 1).slice(-2)}`;

  const supabase = await createClient();

  // Fetch chart of accounts
  let coa: any[] = [];
  try {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('org_id', ctx.org.id)
      .eq('is_active', true)
      .order('code');
    coa = data ?? [];
  } catch { /* migration not run */ }

  // Derive balances from existing transaction data (no journals needed)
  const [invRes, paymentsRes, posRes, expenseRes, payrollRes, poRes] = await Promise.all([
    supabase.from('invoices').select('total,gst_amount,amount_paid,status,doc_type,issue_date')
      .eq('org_id', ctx.org.id).eq('doc_type', 'invoice').gte('issue_date', start).lte('issue_date', end),
    supabase.from('payments').select('amount,method,payment_date')
      .eq('org_id', ctx.org.id).gte('payment_date', start).lte('payment_date', end),
    supabase.from('pos_orders').select('total,payment_method,created_at')
      .eq('org_id', ctx.org.id).gte('created_at', start).lte('created_at', end),
    supabase.from('expense_claims').select('amount,status,claim_date')
      .eq('org_id', ctx.org.id).eq('status', 'approved').gte('claim_date', start).lte('claim_date', end),
    supabase.from('payroll_runs').select('total_gross,total_net,status,month')
      .eq('org_id', ctx.org.id).eq('status', 'processed').gte('month', start).lte('month', end),
    supabase.from('purchase_orders').select('total_amount,status,order_date')
      .eq('org_id', ctx.org.id).in('status', ['billed','received']).gte('order_date', start).lte('order_date', end),
  ]);

  const invList     = invRes.data ?? [];
  const pmtList     = paymentsRes.data ?? [];
  const posList     = posRes.data ?? [];
  const expList     = expenseRes.data ?? [];
  const payrollList = payrollRes.data ?? [];
  const poList      = poRes.data ?? [];

  // Compute derived balances
  const revenue    = invList.filter((i) => ['sent','paid','partial'].includes(i.status)).reduce((s, i) => s + Number(i.total ?? 0) - Number(i.gst_amount ?? 0), 0);
  const gstOut     = invList.filter((i) => ['sent','paid','partial'].includes(i.status)).reduce((s, i) => s + Number(i.gst_amount ?? 0), 0);
  const cashIn     = pmtList.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const posRevenue = posList.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const ar         = invList.filter((i) => ['sent','partial'].includes(i.status)).reduce((s, i) => s + Number(i.total ?? 0) - Number(i.amount_paid ?? 0), 0);
  const expenses   = expList.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const salaries   = payrollList.reduce((s, r) => s + Number(r.total_gross ?? 0), 0);
  const ap         = poList.filter((p) => p.status === 'billed').reduce((s, p) => s + Number(p.total_amount ?? 0), 0);

  // Manual journals
  let journalBalances: Record<string, { debit: number; credit: number }> = {};
  try {
    const { data: jLines } = await supabase
      .from('journal_entries')
      .select('lines:journal_entry_lines(account_id, debit, credit, account:chart_of_accounts(code))')
      .eq('org_id', ctx.org.id)
      .gte('entry_date', start)
      .lte('entry_date', end);
    for (const je of jLines ?? []) {
      for (const line of (je as any).lines ?? []) {
        const code = line.account?.code;
        if (!code) continue;
        if (!journalBalances[code]) journalBalances[code] = { debit: 0, credit: 0 };
        journalBalances[code].debit  += Number(line.debit  ?? 0);
        journalBalances[code].credit += Number(line.credit ?? 0);
      }
    }
  } catch { /* not migrated */ }

  // Build trial balance rows from CoA
  type TBRow = { code: string; name: string; type: string; debit: number; credit: number };
  const rows: TBRow[] = coa.map((a) => {
    const jb   = journalBalances[a.code] ?? { debit: 0, credit: 0 };
    let debit  = jb.debit;
    let credit = jb.credit;

    // Inject system-derived amounts into standard accounts
    if (a.code === '1000') debit  += cashIn + posRevenue;
    if (a.code === '1100') debit  += ar;
    if (a.code === '2000') credit += ap;
    if (a.code === '2100') credit += gstOut;
    if (a.code === '4000') credit += revenue + posRevenue;
    if (a.code === '5100') debit  += salaries;
    if (a.code === '5300') debit  += expenses;

    // Normalise: asset/expense → debit-normal; liability/equity/income → credit-normal
    return { code: a.code, name: a.name, type: a.type, debit, credit };
  });

  const totalDebit  = rows.reduce((s, r) => s + r.debit,  0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  const fyOptions = [currentFY, currentFY - 1, currentFY - 2].map(String);

  const TYPE_ORDER = ['asset','liability','equity','income','expense'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
          <h1 className="mt-1 text-2xl font-semibold">Trial Balance</h1>
          <p className="mt-0.5 text-sm text-neutral-500">FY {fyLabel} — all account balances</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={fy}
            onChange={(e) => { window.location.href = `/dashboard/accounting/trial-balance?fy=${e.target.value}`; }}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            {fyOptions.map((f) => <option key={f} value={f}>FY {f}-{String(Number(f) + 1).slice(-2)}</option>)}
          </select>
        </div>
      </div>

      {coa.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Run migration <code>0038_accounting_core.sql</code> in Supabase to activate the Chart of Accounts.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Account Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Debit (Dr)</th>
                <th className="px-4 py-3 text-right font-medium">Credit (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {TYPE_ORDER.flatMap((type) => {
                const group = rows.filter((r) => r.type === type && (r.debit > 0 || r.credit > 0));
                if (!group.length) return [];
                return [
                  <tr key={`hdr-${type}`} className="bg-neutral-50">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 capitalize">{type}</td>
                  </tr>,
                  ...group.map((r) => (
                    <tr key={r.code} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-400">{r.code}</td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-xs capitalize text-neutral-500">{r.type}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.debit > 0 ? `₹${fmt(r.debit)}` : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.credit > 0 ? `₹${fmt(r.credit)}` : '—'}</td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
                <td colSpan={3} className="px-4 py-3 text-right text-sm">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">₹{fmt(totalDebit)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${Math.abs(totalDebit - totalCredit) > 1 ? 'text-red-600' : 'text-green-700'}`}>
                  ₹{fmt(totalCredit)}
                  {Math.abs(totalDebit - totalCredit) > 1 && <span className="ml-2 text-xs font-normal">(Diff: ₹{fmt(Math.abs(totalDebit - totalCredit))})</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/dashboard/accounting/pnl" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
          P&amp;L Statement →
        </Link>
        <Link href="/dashboard/accounting/balance-sheet" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
          Balance Sheet →
        </Link>
        <Link href="/dashboard/accounting/journals" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
          Journal Entries →
        </Link>
      </div>
    </div>
  );
}
