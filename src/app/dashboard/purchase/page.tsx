import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { BILL_STATUS_LABELS, BILL_STATUS_COLORS } from '@/lib/types/purchase';
import type { PurchaseOrder, VendorBill } from '@/lib/types/purchase';
import PageHotkeys from '@/components/PageHotkeys';
import POListClient from './POListClient';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);
}

export default async function PurchasePage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('purchase') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const [{ data: orders }, { data: bills }] = await Promise.all([
    supabase.from('purchase_orders').select('*').eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
    supabase.from('vendor_bills').select('*').eq('org_id', ctx.org.id).order('created_at', { ascending: false }).limit(10),
  ]);

  const poList  = (orders ?? []) as PurchaseOrder[];
  const billList = (bills ?? []) as VendorBill[];

  const open       = poList.filter((p) => !['billed', 'cancelled'].includes(p.status));
  const pending    = poList.filter((p) => ['sent', 'partial'].includes(p.status));
  const totalValue = poList.filter((p) => p.status !== 'cancelled').reduce((s, p) => s + (p.total ?? 0), 0);
  const unpaidBills = billList.filter((b) => b.status === 'received').reduce((s, b) => s + (b.total ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHotkeys newHref="/dashboard/purchase/new" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Orders</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage vendor orders, receiving, and bills</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/purchase/advances"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Vendor Advances
          </Link>
          <Link href="/dashboard/purchase/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            + New PO
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Open POs',            value: open.length },
          { label: 'Awaiting Receipt',    value: pending.length },
          { label: 'Total PO Value',      value: fmt(totalValue) },
          { label: 'Unpaid Vendor Bills', value: fmt(unpaidBills) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* PO list */}
      {poList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No purchase orders yet</p>
          <Link href="/dashboard/purchase/new"
            className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
            Create your first PO
          </Link>
        </div>
      ) : (
        <POListClient orders={poList} />
      )}

      {/* Recent vendor bills */}
      {billList.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Recent Vendor Bills</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium">Bill No</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {billList.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium">{b.vendor_name}</td>
                    <td className="px-4 py-3 font-mono text-neutral-500">{b.bill_number ?? '—'}</td>
                    <td className="px-4 py-3 text-neutral-500">{b.bill_date}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BILL_STATUS_COLORS[b.status]}`}>
                        {BILL_STATUS_LABELS[b.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
