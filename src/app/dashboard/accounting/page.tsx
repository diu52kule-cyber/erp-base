import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { getFYOptions, getFYDateRange } from '@/lib/types/accounting';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function AccountingPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  // Default to current FY
  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const { start, end } = getFYDateRange(String(currentFY));
  const fyLabel = `${currentFY}-${String(currentFY + 1).slice(-2)}`;

  const [{ data: invoices }, { data: gstSettings }] = await Promise.all([
    supabase
      .from('invoices')
      .select('subtotal,gst_amount,igst_amount,cgst_amount,sgst_amount,total,supply_type,status')
      .eq('org_id', ctx.org.id)
      .eq('doc_type', 'invoice')
      .in('status', ['sent', 'paid'])
      .gte('issue_date', start)
      .lte('issue_date', end),
    supabase.from('org_gst_settings').select('gstin,legal_name,state_code,filing_period').eq('org_id', ctx.org.id).maybeSingle(),
  ]);

  const invList = invoices ?? [];
  const totalTaxableValue = invList.reduce((s, i) => s + (i.subtotal ?? 0), 0);
  const totalIgst = invList.reduce((s, i) => s + (i.igst_amount ?? 0), 0);
  const totalCgst = invList.reduce((s, i) => s + (i.cgst_amount ?? 0), 0);
  const totalSgst = invList.reduce((s, i) => s + (i.sgst_amount ?? 0), 0);
  const totalGst  = invList.reduce((s, i) => s + (i.gst_amount ?? 0), 0);

  const b2bCount = invList.filter((i) => i.supply_type === 'B2B').length;
  const b2csCount = invList.filter((i) => i.supply_type === 'B2CS').length;
  const b2clCount = invList.filter((i) => i.supply_type === 'B2CL').length;

  const gstNotConfigured = !gstSettings?.gstin;

  // Current month/quarter period for quick links
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GST & Accounting</h1>
          <p className="mt-1 text-sm text-neutral-500">FY {fyLabel} — {invList.length} filed invoices</p>
        </div>
        <Link href="/dashboard/accounting/settings"
          className={`rounded-lg border px-4 py-2 text-sm ${gstNotConfigured ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-neutral-200 hover:bg-neutral-50'}`}>
          {gstNotConfigured ? '⚠ Set up GSTIN' : 'GST Settings'}
        </Link>
      </div>

      {gstNotConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">GSTIN not configured</p>
          <p className="mt-1">Add your GSTIN and state in <Link href="/dashboard/accounting/settings" className="underline">GST Settings</Link> to enable accurate IGST/CGST/SGST classification on new invoices.</p>
        </div>
      )}

      {gstSettings?.gstin && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <div className="flex flex-wrap gap-6">
            <div><span className="text-neutral-500">GSTIN</span><p className="font-mono font-medium mt-0.5">{gstSettings.gstin}</p></div>
            {gstSettings.legal_name && <div><span className="text-neutral-500">Legal Name</span><p className="font-medium mt-0.5">{gstSettings.legal_name}</p></div>}
            <div><span className="text-neutral-500">Filing Period</span><p className="font-medium mt-0.5 capitalize">{gstSettings.filing_period}</p></div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Taxable Value', value: fmt(totalTaxableValue) },
          { label: 'Total GST', value: fmt(totalGst) },
          { label: 'IGST', value: fmt(totalIgst) },
          { label: 'CGST + SGST', value: fmt(totalCgst + totalSgst) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Supply type breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'B2B (Registered)', value: b2bCount, desc: 'Invoices with GSTIN' },
          { label: 'B2CS (Unregistered ≤₹2.5L)', value: b2csCount, desc: 'Small unregistered buyers' },
          { label: 'B2CL (Unregistered >₹2.5L)', value: b2clCount, desc: 'Large unregistered buyers' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="mt-1 text-sm font-medium">{s.label}</p>
            <p className="text-xs text-neutral-400">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* GST Reports */}
      <div>
        <h2 className="mb-3 font-semibold text-neutral-700">GST Returns</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: 'GSTR-1', desc: 'Outward supplies — file monthly or quarterly.', badge: 'Outward Supplies', badgeColor: 'bg-blue-50 text-blue-700', href: `/dashboard/accounting/gstr1?period=${curMonth}`, label: 'View GSTR-1' },
            { title: 'GSTR-2 (ITC)', desc: 'Input tax credit from vendor bills.', badge: 'Inward Supplies', badgeColor: 'bg-purple-50 text-purple-700', href: `/dashboard/accounting/gstr2?period=${curMonth}`, label: 'View GSTR-2' },
            { title: 'GSTR-3B', desc: 'Summary return — pay tax monthly.', badge: 'Tax Payable', badgeColor: 'bg-green-50 text-green-700', href: `/dashboard/accounting/gstr3b?period=${curMonth}`, label: 'View GSTR-3B' },
          ].map((r) => (
            <div key={r.title} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{r.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.badgeColor}`}>{r.badge}</span>
              </div>
              <p className="text-sm text-neutral-500">{r.desc}</p>
              <Link href={r.href} className="inline-block rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700">{r.label}</Link>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Reports */}
      <div>
        <h2 className="mb-3 font-semibold text-neutral-700">Financial Statements</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Trial Balance', desc: 'All account balances — Dr / Cr totals.', href: '/dashboard/accounting/trial-balance', badge: 'Double Entry' },
            { title: 'P&L Statement', desc: 'Revenue, expenses, and net profit.', href: '/dashboard/accounting/pnl', badge: 'Income' },
            { title: 'Balance Sheet', desc: 'Assets, liabilities, and equity snapshot.', href: '/dashboard/accounting/balance-sheet', badge: 'Position' },
            { title: 'Journal Entries', desc: 'Manual double-entry bookkeeping.', href: '/dashboard/accounting/journals', badge: 'Ledger' },
            { title: 'Receivables Ageing', desc: 'Outstanding invoices bucketed by overdue period.', href: '/dashboard/accounting/ageing', badge: 'Collections' },
          ].map((r) => (
            <Link key={r.title} href={r.href}
              className="rounded-xl border border-neutral-200 bg-white p-5 hover:bg-neutral-50 transition-colors group space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium group-hover:text-neutral-900">{r.title}</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{r.badge}</span>
              </div>
              <p className="text-sm text-neutral-500">{r.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* TDS */}
      <div>
        <h2 className="mb-3 font-semibold text-neutral-700">TDS</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { title: 'TDS Payable', desc: 'TDS you deducted from vendor/contractor payments — track & deposit.', href: '/dashboard/accounting/tds?type=payable' },
            { title: 'TDS Receivable', desc: 'TDS deducted from your receipts by customers — claim as credit.', href: '/dashboard/accounting/tds?type=receivable' },
          ].map((r) => (
            <Link key={r.title} href={r.href}
              className="rounded-xl border border-neutral-200 bg-white p-5 hover:bg-neutral-50 transition-colors group space-y-2">
              <h3 className="font-medium group-hover:text-neutral-900">{r.title}</h3>
              <p className="text-sm text-neutral-500">{r.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
