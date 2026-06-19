import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import POSTerminal from './POSTerminal';
import OpenSessionForm from './OpenSessionForm';

export default async function POSPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('pos') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();

  const [{ data: session }, { data: products }] = await Promise.all([
    supabase.from('pos_sessions').select('*').eq('org_id', ctx.org.id).eq('status', 'open').maybeSingle(),
    supabase.from('products').select('id,name,sku,unit_price:selling_price,gst_rate,stock_qty').eq('org_id', ctx.org.id).eq('is_active', true).order('name'),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Point of Sale</h1>
        <div className="flex gap-2">
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
        <POSTerminal sessionId={session.id} products={products ?? []} />
      ) : (
        <OpenSessionForm />
      )}
    </div>
  );
}
