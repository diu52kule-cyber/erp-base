import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import AgeingClient from './AgeingClient';

export default async function ReceivablesAgeingPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const today = new Date();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, customer_id, customer_name, total, amount_paid, due_date, issue_date')
    .eq('org_id', ctx.org.id)
    .eq('doc_type', 'invoice')
    .in('status', ['sent', 'partial'])
    .order('issue_date', { ascending: false });

  // Calculate ageing buckets per customer
  type BucketRow = { customer_name: string; customer_id: string | null; current: number; d30: number; d60: number; d90: number; d90plus: number; total: number };
  const byCustomer = new Map<string, BucketRow>();

  for (const inv of invoices ?? []) {
    const balance = Math.max(0, (inv.total ?? 0) - (inv.amount_paid ?? 0));
    if (balance <= 0) continue;

    const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.issue_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const key = inv.customer_id ?? inv.customer_name;
    if (!byCustomer.has(key)) {
      byCustomer.set(key, { customer_name: inv.customer_name, customer_id: inv.customer_id ?? null, current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 });
    }
    const row = byCustomer.get(key)!;
    if (daysOverdue <= 0)       row.current += balance;
    else if (daysOverdue <= 30) row.d30     += balance;
    else if (daysOverdue <= 60) row.d60     += balance;
    else if (daysOverdue <= 90) row.d90     += balance;
    else                        row.d90plus += balance;
    row.total += balance;
  }

  const rows = Array.from(byCustomer.values()).sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const overdue90  = rows.reduce((s, r) => s + r.d90plus, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← Accounting</Link>
          <h1 className="mt-1 text-2xl font-semibold">Receivables Ageing</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Outstanding invoices bucketed by overdue period</p>
        </div>
        <p className="text-xs text-neutral-400">As of {today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Outstanding', value: '₹' + grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 }), accent: '' },
          { label: 'Customers Owing',  value: String(rows.length), accent: '' },
          { label: 'Current (not due)', value: '₹' + rows.reduce((s, r) => s + r.current, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }), accent: 'text-neutral-700' },
          { label: '90+ Days Overdue', value: '₹' + overdue90.toLocaleString('en-IN', { maximumFractionDigits: 0 }), accent: overdue90 > 0 ? 'text-red-700' : '' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <AgeingClient rows={rows} />
    </div>
  );
}
