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

      {/* Reports */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">GSTR-1</h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Outward Supplies</span>
          </div>
          <p className="text-sm text-neutral-500">Statement of outward supplies. File monthly or quarterly with the GST portal.</p>
          <div className="flex gap-2">
            <Link href={`/dashboard/accounting/gstr1?period=${curMonth}`}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
              View GSTR-1
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">GSTR-2 (Purchases / ITC)</h2>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">Inward Supplies</span>
          </div>
          <p className="text-sm text-neutral-500">Input tax credit from vendor bills — supplier-wise B2B & unregistered.</p>
          <div className="flex gap-2">
            <Link href={`/dashboard/accounting/gstr2?period=${curMonth}`}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
              View GSTR-2
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">GSTR-3B</h2>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Tax Payable</span>
          </div>
          <p className="text-sm text-neutral-500">Summary return of outward and inward supplies. File monthly to pay tax.</p>
          <div className="flex gap-2">
            <Link href={`/dashboard/accounting/gstr3b?period=${curMonth}`}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
              View GSTR-3B
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
