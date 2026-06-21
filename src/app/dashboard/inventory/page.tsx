import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types/inventory';
import StockAdjuster from './StockAdjuster';
import LabelButton from './LabelButton';
import EmptyState from '@/components/EmptyState';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory')) redirect('/dashboard');

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('products')
    .select('*')
    .eq('org_id', ctx.org!.id)
    .eq('is_active', true)
    .order('name');

  if (searchParams.category) {
    query = query.eq('category', searchParams.category);
  }

  const [{ data: products }, { data: expiringBatches }] = await Promise.all([
    query.returns<Product[]>(),
    supabase
      .from('product_batches')
      .select('product_id, batch_no, expiry_date, qty, products!inner(name)')
      .eq('org_id', ctx.org!.id)
      .lt('expiry_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
      .gte('expiry_date', today)
      .gt('qty', 0),
  ]);

  const categories = [...new Set((products ?? []).map((p) => p.category).filter(Boolean))] as string[];
  const lowStock = (products ?? []).filter((p) => p.low_stock_threshold > 0 && p.stock_qty <= p.low_stock_threshold);
  const totalStockValue = (products ?? []).reduce((s, p) => s + p.stock_qty * (p.cost_price ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <Link href="/dashboard/inventory/new" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-4">
          <p className="text-xs text-neutral-500">Products</p>
          <p className="mt-1 text-2xl font-semibold">{products?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-4">
          <p className="text-xs text-neutral-500">Low Stock</p>
          <p className={`mt-1 text-2xl font-semibold ${lowStock.length > 0 ? 'text-amber-600' : ''}`}>{lowStock.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-4">
          <p className="text-xs text-neutral-500">Total Stock Value (at cost)</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(totalStockValue)}</p>
        </div>
      </div>

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} low on stock:</strong>{' '}
          {lowStock.map((p) => (
            <Link key={p.id} href={`/dashboard/inventory/${p.id}`} className="hover:underline">{p.name}</Link>
          )).reduce<React.ReactNode[]>((acc, el, i) => [...acc, ...(i > 0 ? [', '] : []), el], [])}
        </div>
      )}

      {expiringBatches && expiringBatches.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Expiring within 7 days:</strong>{' '}
          {(expiringBatches as any[]).map((b) => {
            const days = daysUntil(b.expiry_date);
            return `${(b.products as any)?.name} — Batch ${b.batch_no} (${b.qty} units, ${days}d)`;
          }).join(' · ')}
        </div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/inventory"
            className={`rounded-full border px-3 py-1 text-sm ${!searchParams.category ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/dashboard/inventory?category=${encodeURIComponent(c)}`}
              className={`rounded-full border px-3 py-1 text-sm ${searchParams.category === c ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {!products?.length ? (
        <EmptyState
          icon="📦"
          title="No products yet"
          description="Add your first product to start selling at POS and tracking stock."
          actionLabel="Add Product"
          actionHref="/dashboard/inventory/new"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">SKU</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
                <th className="px-4 py-3 text-right font-medium">GST</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {products.map((p) => {
                const isLow = p.low_stock_threshold > 0 && p.stock_qty <= p.low_stock_threshold;
                const basePrice = p.tax_inclusive ? p.selling_price / (1 + p.gst_rate / 100) : p.selling_price;
                const margin = p.cost_price > 0 ? ((basePrice - p.cost_price) / basePrice) * 100 : null;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/inventory/${p.id}`} className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline">
                        {p.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.category && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">{p.category}</span>}
                        {p.tax_inclusive && <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-xs text-purple-700">incl. tax</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{fmt(p.selling_price)}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">{p.cost_price > 0 ? fmt(p.cost_price) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {margin !== null ? (
                        <span className={margin < 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                          {margin.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-500">{p.gst_rate}%</td>
                    <td className="px-4 py-3 text-right">
                      <span className={isLow ? 'font-semibold text-amber-600' : 'font-medium'}>
                        {p.stock_qty} {p.unit}
                      </span>
                      {isLow && <span className="ml-1 text-xs text-amber-500">low</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <LabelButton name={p.name} price={p.selling_price} code={p.barcode || p.sku || ''} />
                        <StockAdjuster productId={p.id} currentQty={p.stock_qty} unit={p.unit} />
                        <Link href={`/dashboard/inventory/${p.id}/edit`} className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50">Edit</Link>
                      </div>
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
