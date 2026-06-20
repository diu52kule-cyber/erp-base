import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types/inventory';
import StockAdjuster from './StockAdjuster';
import LabelButton from './LabelButton';
import EmptyState from '@/components/EmptyState';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function InventoryPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory')) redirect('/dashboard');

  const supabase = createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('org_id', ctx.org!.id)
    .eq('is_active', true)
    .order('name')
    .returns<Product[]>();

  const lowStock = (products ?? []).filter(
    (p) => p.low_stock_threshold > 0 && p.stock_qty <= p.low_stock_threshold
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <Link
          href="/dashboard/inventory/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          Add Product
        </Link>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} low on stock:</strong>{' '}
          {lowStock.map((p) => p.name).join(', ')}
        </div>
      )}

      {!products?.length ? (
        <EmptyState icon="📦" title="No products yet"
          description="Add your first product to start selling at POS and tracking stock."
          actionLabel="Add Product" actionHref="/dashboard/inventory/new" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">SKU</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">GST</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-center font-medium">Label</th>
                <th className="px-4 py-3 text-center font-medium">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => {
                const isLow =
                  p.low_stock_threshold > 0 &&
                  p.stock_qty <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-neutral-400 truncate max-w-xs">
                          {p.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {p.sku ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{fmt(p.selling_price)}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">
                      {p.gst_rate}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          isLow ? 'font-semibold text-amber-600' : 'font-medium'
                        }
                      >
                        {p.stock_qty} {p.unit}
                      </span>
                      {isLow && (
                        <span className="ml-1 text-xs text-amber-500">low</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <LabelButton name={p.name} price={p.selling_price} code={p.barcode || p.sku || ''} />
                    </td>
                    <td className="px-4 py-3">
                      <StockAdjuster
                        productId={p.id}
                        currentQty={p.stock_qty}
                        unit={p.unit}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
