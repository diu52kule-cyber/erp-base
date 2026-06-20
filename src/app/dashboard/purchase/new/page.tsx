import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import PurchaseOrderForm from './PurchaseOrderForm';
import type { Contact } from '@/lib/types/crm';

export default async function NewPOPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('purchase') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const [{ data }, { data: products }] = await Promise.all([
    supabase.from('contacts').select('*').eq('org_id', ctx.org.id).eq('type', 'vendor').order('name'),
    supabase.from('products').select('id,name,sku,unit_price:selling_price,gst_rate').eq('org_id', ctx.org.id).eq('is_active', true).order('name'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/purchase" className="text-sm text-neutral-500 hover:text-neutral-900">← Purchase Orders</Link>
        <h1 className="mt-1 text-2xl font-semibold">New Purchase Order</h1>
      </div>
      <PurchaseOrderForm vendors={(data ?? []) as Contact[]} products={(products ?? []) as never} />
    </div>
  );
}
