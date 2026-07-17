import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import OffersClient from './OffersClient';

export default async function OffersPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  let offers: unknown[] = [];
  try {
    const { data } = await supabase
      .from('offers')
      .select('*, product:products(name)')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false });
    offers = data ?? [];
  } catch { /* offers table not yet migrated */ }
  const { data: products } = await supabase
    .from('products')
    .select('id,name')
    .eq('org_id', ctx.org.id)
    .eq('is_active', true)
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/inventory" className="text-sm text-neutral-500 hover:text-neutral-900">← Inventory</Link>
        <h1 className="text-2xl font-semibold">Offers</h1>
      </div>
      <p className="text-sm text-neutral-500">Create promotions (%, flat ₹, BOGO, combo) per product or store-wide. Live offers show as a badge on printed barcode labels.</p>
      <OffersClient initial={offers as never} products={(products ?? []) as never} />
    </div>
  );
}
