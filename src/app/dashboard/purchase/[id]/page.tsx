import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { PO_STATUS_LABELS, PO_STATUS_COLORS, BILL_STATUS_LABELS, BILL_STATUS_COLORS } from '@/lib/types/purchase';
import type { PurchaseOrder, POLine, VendorBill } from '@/lib/types/purchase';
import ReceiveForm from './ReceiveForm';
import BillButton from './BillButton';
import StatusButton from './StatusButton';
import AttachmentPanel from '@/components/AttachmentPanel';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n ?? 0);
}

export default async function PODetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('purchase') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const [{ data: po }, { data: lines }, { data: grns }, { data: bills }] = await Promise.all([
    supabase.from('purchase_orders').select('*').eq('id', params.id).eq('org_id', ctx.org.id).single(),
    supabase.from('po_lines').select('*, product:products(name,sku,unit)').eq('po_id', params.id).order('sort_order'),
    supabase.from('goods_receipt_notes').select('*, grn_lines(*)').eq('po_id', params.id).order('received_date', { ascending: false }),
    supabase.from('vendor_bills').select('*').eq('po_id', params.id),
  ]);

  if (!po) notFound();
  const poData   = po as PurchaseOrder;
  const lineList = (lines ?? []) as (POLine & { product?: { name: string; sku?: string; unit?: string } | null })[];
  const billList = (bills ?? []) as VendorBill[];

  const canReceive = ['sent', 'partial'].includes(poData.status);
  const canBill    = ['received', 'partial'].includes(poData.status) && billList.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/purchase" className="text-sm text-neutral-500 hover:text-neutral-900">← Purchase Orders</Link>
          <h1 className="mt-1 text-2xl font-semibold font-mono">{poData.po_number}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{poData.vendor_name}{poData.vendor_gstin ? ` · ${poData.vendor_gstin}` : ''}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${PO_STATUS_COLORS[poData.status]}`}>
          {PO_STATUS_LABELS[poData.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2 text-sm">
          <p className="font-medium">Order Info</p>
          <div className="flex justify-between"><span className="text-neutral-500">Issue Date</span><span>{poData.issue_date}</span></div>
          {poData.expected_delivery && <div className="flex justify-between"><span className="text-neutral-500">Expected</span><span>{poData.expected_delivery}</span></div>}
          {poData.billing_address && <div className="flex justify-between"><span className="text-neutral-500">Address</span><span className="text-right max-w-40">{poData.billing_address}</span></div>}
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2 text-sm">
          <p className="font-medium">Totals</p>
          <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{fmt(poData.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">GST</span><span>{fmt(poData.gst_amount)}</span></div>
          <div className="flex justify-between font-semibold text-base pt-1 border-t border-neutral-100"><span>Total</span><span>{fmt(poData.total)}</span></div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <p className="text-sm font-medium">Actions</p>
          <StatusButton poId={poData.id} status={poData.status} />
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <h2 className="text-sm font-medium">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-100 text-xs text-neutral-500">
            <th className="px-4 py-2 text-left font-medium">Description</th>
            <th className="px-4 py-2 text-left font-medium">Product</th>
            <th className="px-4 py-2 text-right font-medium">Ordered</th>
            <th className="px-4 py-2 text-right font-medium">Received</th>
            <th className="px-4 py-2 text-right font-medium">Unit Price</th>
            <th className="px-4 py-2 text-right font-medium">GST</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {lineList.map((l) => {
              const pending = l.quantity - (l.received_qty ?? 0);
              return (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">{l.description}</td>
                  <td className="px-4 py-2 text-neutral-400 text-xs">{l.product?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{l.quantity}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={pending > 0 ? 'text-amber-600' : 'text-green-600'}>
                      {l.received_qty ?? 0}
                    </span>
                    {pending > 0 && <span className="ml-1 text-xs text-neutral-400">({pending} pending)</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(l.unit_price)}</td>
                  <td className="px-4 py-2 text-right text-neutral-500">{l.gst_rate}%</td>
                  <td className="px-4 py-2 text-right font-medium">{fmt(l.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* GRN history */}
      {(grns ?? []).length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
            <h2 className="text-sm font-medium">Goods Receipt Notes</h2>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="px-4 py-2 text-left font-medium">GRN No</th>
              <th className="px-4 py-2 text-left font-medium">Received Date</th>
              <th className="px-4 py-2 text-left font-medium">Notes</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {(grns ?? []).map((g: any) => (
                <tr key={g.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 font-mono font-medium">{g.grn_number}</td>
                  <td className="px-4 py-2 text-neutral-500">{g.received_date}</td>
                  <td className="px-4 py-2 text-neutral-400">{g.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receive form */}
      {canReceive && <ReceiveForm poId={poData.id} lines={lineList} />}

      {/* Vendor bills */}
      {billList.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
            <h2 className="text-sm font-medium">Vendor Bills</h2>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="px-4 py-2 text-left font-medium">Bill No</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-left font-medium">Due</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {billList.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 font-mono">{b.bill_number ?? '—'}</td>
                  <td className="px-4 py-2 text-neutral-500">{b.bill_date}</td>
                  <td className="px-4 py-2 text-neutral-500">{b.due_date ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BILL_STATUS_COLORS[b.status]}`}>
                      {BILL_STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{fmt(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill creation */}
      {canBill && <BillButton poId={poData.id} />}

      {poData.notes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <p className="text-neutral-500 text-xs mb-1">Notes</p>
          <p>{poData.notes}</p>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <AttachmentPanel entityType="purchase_order" entityId={poData.id} />
      </div>
    </div>
  );
}
