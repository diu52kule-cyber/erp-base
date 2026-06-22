import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import POSTerminal from '@/app/dashboard/pos/POSTerminal';
import OpenSessionForm from '@/app/dashboard/pos/OpenSessionForm';

export default async function StationPOSPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('pos') || !ctx.org) redirect('/login');

  const supabase = createClient();

  const [{ data: session }, contactsResult] = await Promise.all([
    supabase.from('pos_sessions').select('*').eq('org_id', ctx.org.id).eq('status', 'open').maybeSingle(),
    supabase.from('contacts').select('id,name,email').eq('org_id', ctx.org.id).eq('is_active', true).order('name').limit(200),
  ]);

  const contacts = contactsResult.data ?? [];

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
    <div className="flex flex-col h-screen">
      {/* Minimal station header */}
      <div className="flex items-center justify-between border-b border-neutral-700 bg-neutral-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-white">{ctx.org.name}</span>
          <span className="text-xs text-neutral-400">· Station POS</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/station/kds" className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs text-white hover:bg-neutral-600">
            KDS View
          </Link>
          <Link href="/dashboard/pos" className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs text-white hover:bg-neutral-600">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        {session ? (
          <POSTerminal sessionId={session.id} products={products} contacts={contacts} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-md px-6">
              <h2 className="mb-4 text-xl font-semibold text-neutral-900">Open a Session to Start</h2>
              <OpenSessionForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
