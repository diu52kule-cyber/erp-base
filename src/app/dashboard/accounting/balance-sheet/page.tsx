import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { getFYDateRange } from '@/lib/types/accounting';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(n));
}

export default async function BalanceSheetPage({ searchParams }: { searchParams: { fy?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = searchParams.fy ?? String(currentFY);
  const { start, end } = getFYDateRange(fy);
  const fyLabel = `${fy}-${String(Number(fy) + 1).slice(-2)}`;

  const supabase = await createClient();

  const [invRes, paymentsRes, posRes, expRes, payrollRes, purchRes] = await Promise.all([
    supabase.from('invoices').select('total,gst_amount,amount_paid,status,issue_date')
      .eq('org_id', ctx.org.id).eq('doc_type', 'invoice')
      .in('status', ['sent','paid','partial']).lte('issue_date', end),
    supabase.from('payments').select('amount,payment_date')
      .eq('org_id', ctx.org.id).lte('payment_date', end),
    supabase.from('pos_orders').select('total,created_at')
      .eq('org_id', ctx.org.id).lte('created_at', end),
    supabase.from('expense_claims').select('amount,status,claim_date')
      .eq('org_id', ctx.org.id).eq('status', 'approved').lte('claim_date', end),
    supabase.from('payroll_runs').select('total_gross,status,month')
      .eq('org_id', ctx.org.id).eq('status', 'processed').lte('month', end),
    supabase.from('purchase_orders').select('total_amount,status,order_date')
      .eq('org_id', ctx.org.id).in('status', ['billed','received']).lte('order_date', end),
  ]);

  const invList     = invRes.data ?? [];
  const pmtList     = paymentsRes.data ?? [];
  const posList     = posRes.data ?? [];
  const expList     = expRes.data ?? [];
  const payrollList = payrollRes.data ?? [];
  const purchList   = purchRes.data ?? [];

  // === ASSETS ===
  const cashIn      = pmtList.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const posRevenue  = posList.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const cash        = cashIn + posRevenue; // Cash in hand / bank (receipts)

  // Accounts Receivable = unpaid invoice balances
  const ar = invList.filter((i) => ['sent','partial'].includes(i.status))
    .reduce((s, i) => s + Number(i.total ?? 0) - Number(i.amount_paid ?? 0), 0);

  // Inventory value (current stock qty × cost price)
  const { data: products } = await supabase.from('products')
    .select('stock_qty,cost_price').eq('org_id', ctx.org.id).eq('is_active', true);
  const inventoryValue = (products ?? []).reduce((s, p) => s + Number(p.stock_qty ?? 0) * Number(p.cost_price ?? 0), 0);

  // Manual journal adjustments for asset accounts
  let jAssets = 0, jLiabilities = 0, jEquity = 0;
  try {
    const { data: jLines } = await supabase
      .from('journal_entries')
      .select('lines:journal_entry_lines(debit, credit, account:chart_of_accounts(type))')
      .eq('org_id', ctx.org.id).lte('entry_date', end);
    for (const je of jLines ?? []) {
      for (const line of (je as any).lines ?? []) {
        const type = line.account?.type;
        const net = Number(line.debit ?? 0) - Number(line.credit ?? 0);
        if (type === 'asset')     jAssets      += net;
        if (type === 'liability') jLiabilities -= net;
        if (type === 'equity')    jEquity      -= net;
      }
    }
  } catch { /* not migrated */ }

  const totalAssets = cash + ar + inventoryValue + jAssets;

  // === LIABILITIES ===
  const ap         = purchList.filter((p) => p.status === 'billed').reduce((s, p) => s + Number(p.total_amount ?? 0), 0);
  const gstOut     = invList.filter((i) => ['sent','partial'].includes(i.status)).reduce((s, i) => s + Number(i.gst_amount ?? 0), 0);
  const salPayable = payrollList.reduce((s, r) => s + Number(r.total_gross ?? 0), 0) - pmtList.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const safeAP     = Math.max(0, ap);
  const safeGST    = Math.max(0, gstOut);
  const safeSal    = Math.max(0, salPayable);
  const totalLiabilities = safeAP + safeGST + safeSal + jLiabilities;

  // === EQUITY ===
  // Revenue for the period → retained earnings approximation
  const revenue    = invList.filter((i) => ['sent','paid','partial'].includes(i.status))
    .reduce((s, i) => s + Number(i.total ?? 0) - Number(i.gst_amount ?? 0), 0) + posRevenue;
  const expenses   = expList.reduce((s, e) => s + Number(e.amount ?? 0), 0)
    + payrollList.reduce((s, r) => s + Number(r.total_gross ?? 0), 0);
  const netProfit  = revenue - expenses;
  const equity     = totalAssets - totalLiabilities; // Balancing equity

  const fyOptions = [currentFY, currentFY - 1, currentFY - 2].map(String);

  function Section({ title, rows, total }: { title: string; rows: { label: string; value: number }[]; total: number }) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-neutral-100">
            {rows.filter((r) => r.value !== 0).map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-2.5 pl-6 text-neutral-600">{r.label}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${r.value < 0 ? 'text-red-600' : ''}`}>
                  {r.value < 0 ? `(${fmt(-r.value)})` : fmt(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
              <td className="px-4 py-2.5">Total {title}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">₹{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
          <h1 className="mt-1 text-2xl font-semibold">Balance Sheet</h1>
          <p className="mt-0.5 text-sm text-neutral-500">As at end of FY {fyLabel}</p>
        </div>
        <select
          value={fy}
          onChange={(e) => { window.location.href = `/dashboard/accounting/balance-sheet?fy=${e.target.value}`; }}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          {fyOptions.map((f) => <option key={f} value={f}>FY {f}-{String(Number(f) + 1).slice(-2)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Assets', value: totalAssets },
          { label: 'Total Liabilities', value: totalLiabilities },
          { label: 'Net Equity', value: equity },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">₹{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          title="Assets"
          rows={[
            { label: 'Cash in Hand / Bank', value: cash },
            { label: 'Accounts Receivable', value: ar },
            { label: 'Inventory / Stock Value', value: inventoryValue },
            { label: 'Other Assets (Journals)', value: jAssets },
          ]}
          total={totalAssets}
        />
        <div className="space-y-6">
          <Section
            title="Liabilities"
            rows={[
              { label: 'Accounts Payable', value: safeAP },
              { label: 'GST Payable (Output)', value: safeGST },
              { label: 'Other Liabilities (Journals)', value: jLiabilities },
            ]}
            total={totalLiabilities}
          />
          <Section
            title="Equity"
            rows={[
              { label: 'Retained Earnings / Net Profit', value: netProfit },
              { label: 'Other Equity (Journals)', value: jEquity },
            ]}
            total={equity}
          />
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Note: Balances are derived from invoice, payment, payroll, and expense data. Add manual journal entries for fixed assets, loans, owner capital, and other adjustments.
      </p>

      <div className="flex gap-3">
        <Link href="/dashboard/accounting/pnl" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">P&amp;L Statement →</Link>
        <Link href="/dashboard/accounting/trial-balance" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Trial Balance →</Link>
        <Link href="/dashboard/accounting/journals" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Journal Entries →</Link>
      </div>
    </div>
  );
}
