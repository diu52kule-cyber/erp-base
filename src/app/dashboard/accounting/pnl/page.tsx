import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { getFYDateRange } from '@/lib/types/accounting';
import NavSelect from '@/components/NavSelect';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function PnLPage({ searchParams }: { searchParams: { fy?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = searchParams.fy ?? String(currentFY);
  const { start, end } = getFYDateRange(fy);
  const fyLabel = `${fy}-${String(Number(fy) + 1).slice(-2)}`;

  const supabase = createClient();

  const [invRes, posRes, expenseRes, payrollRes, purchaseRes] = await Promise.all([
    supabase.from('invoices').select('total,gst_amount,status,issue_date,doc_type')
      .eq('org_id', ctx.org.id).eq('doc_type', 'invoice')
      .in('status', ['sent','paid','partial'])
      .gte('issue_date', start).lte('issue_date', end),
    supabase.from('pos_orders').select('total,created_at')
      .eq('org_id', ctx.org.id).gte('created_at', start).lte('created_at', end),
    supabase.from('expense_claims').select('amount,status,claim_date,category_id')
      .eq('org_id', ctx.org.id).eq('status', 'approved')
      .gte('claim_date', start).lte('claim_date', end),
    supabase.from('payroll_runs').select('total_gross,total_net,status,month')
      .eq('org_id', ctx.org.id).eq('status', 'processed')
      .gte('month', start).lte('month', end),
    supabase.from('purchase_orders').select('total_amount,status,order_date')
      .eq('org_id', ctx.org.id).in('status', ['received','billed'])
      .gte('order_date', start).lte('order_date', end),
  ]);

  const invList     = invRes.data ?? [];
  const posList     = posRes.data ?? [];
  const expList     = expenseRes.data ?? [];
  const payrollList = payrollRes.data ?? [];
  const purchList   = purchaseRes.data ?? [];

  // Income
  const invoiceRevenue = invList.reduce((s, i) => s + Number(i.total ?? 0) - Number(i.gst_amount ?? 0), 0);
  const posRevenue     = posList.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const totalIncome    = invoiceRevenue + posRevenue;

  // COGS — from purchase orders received
  const cogs = purchList.reduce((s, p) => s + Number(p.total_amount ?? 0), 0);

  const grossProfit = totalIncome - cogs;

  // Operating expenses
  const salaries     = payrollList.reduce((s, r) => s + Number(r.total_gross ?? 0), 0);
  const opExpenses   = expList.reduce((s, e) => s + Number(e.amount ?? 0), 0);

  // Manual journal expenses from income/expense accounts
  let jIncome = 0, jExpense = 0;
  try {
    const { data: jLines } = await supabase
      .from('journal_entries')
      .select('lines:journal_entry_lines(debit, credit, account:chart_of_accounts(type))')
      .eq('org_id', ctx.org.id)
      .gte('entry_date', start).lte('entry_date', end);
    for (const je of jLines ?? []) {
      for (const line of (je as any).lines ?? []) {
        const type = line.account?.type;
        if (type === 'income')   jIncome  += Number(line.credit ?? 0) - Number(line.debit ?? 0);
        if (type === 'expense')  jExpense += Number(line.debit ?? 0)  - Number(line.credit ?? 0);
      }
    }
  } catch { /* not migrated */ }

  const totalExpenses = salaries + opExpenses + jExpense;
  const ebit          = grossProfit - totalExpenses;
  const netProfit     = ebit + jIncome;

  const fyOptions = [currentFY, currentFY - 1, currentFY - 2].map(String);

  function Row({ label, value, indent = false, bold = false, borderTop = false }: {
    label: string; value: number; indent?: boolean; bold?: boolean; borderTop?: boolean;
  }) {
    const isNeg = value < 0;
    return (
      <tr className={`${borderTop ? 'border-t-2 border-neutral-200' : 'border-t border-neutral-100'} ${bold ? 'bg-neutral-50 font-semibold' : ''}`}>
        <td className={`px-4 py-2.5 text-sm ${indent ? 'pl-8 text-neutral-500' : ''} ${bold ? 'font-semibold' : ''}`}>{label}</td>
        <td className={`px-4 py-2.5 text-right text-sm tabular-nums ${isNeg ? 'text-red-600' : bold ? 'text-neutral-900' : 'text-neutral-700'}`}>
          {isNeg ? `(${fmt(-value)})` : fmt(value)}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
          <h1 className="mt-1 text-2xl font-semibold">Profit &amp; Loss Statement</h1>
          <p className="mt-0.5 text-sm text-neutral-500">FY {fyLabel}</p>
        </div>
        <NavSelect
          name="fy" value={fy} baseHref="/dashboard/accounting/pnl"
          options={fyOptions.map((f) => ({ value: f, label: `FY ${f}-${String(Number(f) + 1).slice(-2)}` }))}
        />
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: totalIncome, color: 'text-neutral-900' },
          { label: 'Gross Profit', value: grossProfit, color: grossProfit >= 0 ? 'text-green-700' : 'text-red-600' },
          { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-green-700' : 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${s.color}`}>{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-neutral-100">
              <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Income</td>
            </tr>
            <Row label="Invoice / Sales Revenue" value={invoiceRevenue} indent />
            {posRevenue > 0 && <Row label="POS Revenue" value={posRevenue} indent />}
            {jIncome > 0    && <Row label="Other Income (Journals)" value={jIncome} indent />}
            <Row label="Total Income" value={totalIncome} bold borderTop />

            <tr className="border-t border-neutral-100">
              <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Cost of Goods Sold</td>
            </tr>
            {cogs > 0 && <Row label="Purchase / COGS" value={-cogs} indent />}
            <Row label="Gross Profit" value={grossProfit} bold borderTop />

            <tr className="border-t border-neutral-100">
              <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Operating Expenses</td>
            </tr>
            {salaries > 0    && <Row label="Salaries & Wages" value={-salaries} indent />}
            {opExpenses > 0  && <Row label="Approved Expense Claims" value={-opExpenses} indent />}
            {jExpense > 0    && <Row label="Other Expenses (Journals)" value={-jExpense} indent />}
            <Row label="Total Expenses" value={-totalExpenses} bold borderTop />

            <Row label="Net Profit / (Loss)" value={netProfit} bold borderTop />
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/accounting/trial-balance" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Trial Balance →</Link>
        <Link href="/dashboard/accounting/balance-sheet" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Balance Sheet →</Link>
      </div>
    </div>
  );
}
