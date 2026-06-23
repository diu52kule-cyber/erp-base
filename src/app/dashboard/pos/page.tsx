import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import POSTerminal from './POSTerminal';
import OpenSessionForm from './OpenSessionForm';

export default async function POSPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('pos') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  const [{ data: session }, contactsResult] = await Promise.all([
    supabase.from('pos_sessions').select('*').eq('org_id', ctx.org.id).eq('status', 'open').maybeSingle(),
    supabase.from('contacts').select('id,name,email').eq('org_id', ctx.org.id).eq('is_active', true).order('name').limit(200),
  ]);

  const contacts = contactsResult.data ?? [];

  // Include barcode when the column exists (migration 0025); fall back gracefully if not.
  const withBarcode = await supabase
    .from('products')
    .select('id,name,sku,barcode,unit_price:selling_price,gst_rate,stock_qty,category,tax_inclusive')
    .eq('org_id', ctx.org.id).eq('is_active', true).order('name');
  let products: any[] = withBarcode.data ?? [];
  if (withBarcode.error) {
    const noBarcode = await supabase
      .from('products')
      .select('id,name,sku,unit_price:selling_price,gst_rate,stock_qty')
      .eq('org_id', ctx.org.id).eq('is_active', true).order('name');
    products = noBarcode.data ?? [];
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Point of Sale</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/pos/tables" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Tables
          </Link>
          <Link href="/dashboard/pos/qr-orders" className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100">
            QR Orders
          </Link>
          <Link href="/station/kds" className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-2 text-sm text-purple-700 hover:bg-purple-100">
            KDS
          </Link>
          <Link href="/station/pos" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Station Mode
          </Link>
          <Link href="/dashboard/pos/sessions" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Session History
          </Link>
          {session && (
            <Link href={`/dashboard/pos/sessions/${session.id}`}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
              Close Session
            </Link>
          )}
        </div>
      </div>

      {session ? (
        <POSTerminal sessionId={session.id} products={products ?? []} contacts={contacts} />
      ) : (
        <OpenSessionForm />
      )}
    </div>
  );
}
