import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import TransfersClient from './TransfersClient';

export default async function StockTransfersPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  let outlets: { id: string; name: string }[] = [];
  let products: { id: string; name: string; sku: string; stock_qty: number }[] = [];
  let transfers: any[] = [];

  try {
    const [{ data: ol }, { data: pr }, { data: tr }] = await Promise.all([
      supabase.from('outlets').select('id,name').eq('org_id', ctx.org.id).eq('status', 'active').order('name'),
      supabase.from('products').select('id,name,sku,stock_qty').eq('org_id', ctx.org.id).eq('is_active', true).order('name'),
      supabase.from('stock_transfers')
        .select('*, from_outlet:outlets!from_outlet_id(name), to_outlet:outlets!to_outlet_id(name), product:products(name,sku)')
        .eq('org_id', ctx.org.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    outlets  = (ol ?? []) as typeof outlets;
    products = (pr ?? []) as typeof products;
    transfers = tr ?? [];
  } catch { /* tables not yet run */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/inventory" className="text-sm text-neutral-500 hover:text-neutral-900">← Inventory</Link>
          <h1 className="mt-1 text-2xl font-semibold">Stock Transfers</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Move stock between outlets / branches</p>
        </div>
        <Link href="/dashboard/settings/outlets" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
          Manage Outlets
        </Link>
      </div>

      {outlets.length < 2 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-medium text-amber-800">You need at least 2 outlets to transfer stock</p>
          <p className="mt-1 text-sm text-amber-600">Set up your branch locations in Settings → Outlets</p>
          <Link href="/dashboard/settings/outlets" className="mt-3 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm text-white hover:bg-amber-800">
            Add Outlets
          </Link>
        </div>
      ) : (
        <TransfersClient outlets={outlets} products={products} initialTransfers={transfers} />
      )}
    </div>
  );
}
