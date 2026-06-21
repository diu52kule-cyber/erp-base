import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import VendorAdvancesClient from './VendorAdvancesClient';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

export default async function VendorAdvancesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('purchase') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  // Table may not exist yet if migration hasn't been run
  let advances: any[] = [];
  try {
    const { data } = await supabase
      .from('vendor_advances')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('advance_date', { ascending: false });
    advances = data ?? [];
  } catch { /* migration not run yet */ }

  const totalPaid = advances.filter((a) => a.status === 'paid').reduce((s, a) => s + Number(a.amount), 0);
  const totalAdjusted = advances.filter((a) => a.status === 'adjusted').reduce((s, a) => s + Number(a.amount), 0);

  // Get vendor contacts for the form
  let vendors: { id: string; name: string }[] = [];
  try {
    const { data } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('org_id', ctx.org.id)
      .eq('type', 'vendor')
      .order('name');
    vendors = data ?? [];
  } catch { /* ignore */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/purchase" className="text-sm text-neutral-500 hover:text-neutral-900">← Purchase Orders</Link>
          <h1 className="mt-1 text-2xl font-semibold">Vendor Advances</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Prepayments made to vendors before invoice receipt</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Total Advances Paid</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{fmt(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Adjusted Against Bills</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{fmt(totalAdjusted)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Outstanding Advances</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{fmt(totalPaid - totalAdjusted)}</p>
        </div>
      </div>

      <VendorAdvancesClient advances={advances} vendors={vendors} />
    </div>
  );
}
