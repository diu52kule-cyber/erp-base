import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Product, ProductBatch, StockMovement } from '@/lib/types/inventory';
import DeleteProductButton from './DeleteProductButton';
import AddBatchForm from './AddBatchForm';
import ArchiveButton from '@/components/ArchiveButton';
import VariantsPanel from './VariantsPanel';
import BOMPanel from './BOMPanel';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory')) redirect('/dashboard');

  const supabase = createClient();

  const [{ data: product }, { data: movements }, { data: batches }] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).eq('org_id', ctx.org!.id).maybeSingle<Product>(),
    supabase
      .from('stock_movements')
      .select('*')
      .eq('org_id', ctx.org!.id)
      .eq('product_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<StockMovement[]>(),
    supabase
      .from('product_batches')
      .select('*')
      .eq('org_id', ctx.org!.id)
      .eq('product_id', params.id)
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .returns<ProductBatch[]>(),
  ]);

  if (!product || !product.is_active) notFound();

  const isLow = product.low_stock_threshold > 0 && product.stock_qty <= product.low_stock_threshold;
  const needsReorder = isLow && product.reorder_qty > 0;
  const basePrice = product.tax_inclusive
    ? product.selling_price / (1 + product.gst_rate / 100)
    : product.selling_price;
  const margin = product.cost_price > 0 ? ((basePrice - product.cost_price) / basePrice) * 100 : null;
  const stockValue = product.stock_qty * product.cost_price;

  const expiringBatches = (batches ?? []).filter(
    (b) => b.expiry_date && daysUntil(b.expiry_date) <= 7 && b.qty > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/inventory" className="text-sm text-neutral-500 hover:text-neutral-900">← Inventory</Link>
          <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {product.category && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{product.category}</span>
            )}
            {product.brand && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">{product.brand}</span>
            )}
            {product.sku && (
              <span className="font-mono text-xs text-neutral-400">{product.sku}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {needsReorder && (
            <Link
              href={`/dashboard/purchase/new?product=${product.id}&qty=${product.reorder_qty}&unit=${product.unit}`}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100"
            >
              Create PO · {product.reorder_qty} {product.unit}
            </Link>
          )}
          <Link href={`/dashboard/inventory/${product.id}/edit`} className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Edit</Link>
          <ArchiveButton table="products" id={product.id} archived={!!(product as any).archived_at} redirectTo="/dashboard/inventory" />
          <DeleteProductButton productId={product.id} productName={product.name} />
        </div>
      </div>

      {/* Expiry alert */}
      {expiringBatches.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Expiry alert:</strong>{' '}
          {expiringBatches.map((b) => {
            const d = daysUntil(b.expiry_date!);
            return `Batch ${b.batch_no} (${b.qty} ${product.unit}) ${d <= 0 ? 'expired' : `expires in ${d} day${d !== 1 ? 's' : ''}`}`;
          }).join(' · ')}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Current Stock', `${product.stock_qty} ${product.unit}`, isLow ? 'text-amber-600' : ''],
          ['Selling Price', `${fmt(product.selling_price)}${product.tax_inclusive ? ' (incl. tax)' : ''}`, ''],
          ['Cost Price', product.cost_price > 0 ? fmt(product.cost_price) : '—', ''],
          ['Margin', margin !== null ? `${margin.toFixed(1)}%` : '—', margin !== null && margin < 0 ? 'text-red-500' : 'text-green-600'],
        ].map(([label, value, cls]) => (
          <div key={label as string} className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {stockValue > 0 && (
        <p className="text-sm text-neutral-500">
          Inventory value at cost: <strong>{fmt(stockValue)}</strong>
        </p>
      )}

      {/* Low stock / reorder */}
      {isLow && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Stock is at or below low-stock threshold ({product.low_stock_threshold} {product.unit}).
          {product.reorder_qty > 0 && ` Suggested reorder quantity: ${product.reorder_qty} ${product.unit}.`}
        </div>
      )}

      {/* Batch tracking */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6 space-y-4">
        <h2 className="font-medium">Batch / Lot Tracking</h2>

        {batches && batches.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 dark:border-neutral-700 text-xs text-neutral-500">
              <tr>
                <th className="pb-2 text-left font-medium">Batch No.</th>
                <th className="pb-2 text-left font-medium">Expiry</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Cost</th>
                <th className="pb-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {batches.map((b) => {
                const days = b.expiry_date ? daysUntil(b.expiry_date) : null;
                const isExpiringSoon = days !== null && days <= 7;
                const isExpired = days !== null && days <= 0;
                return (
                  <tr key={b.id} className={isExpired ? 'opacity-50' : ''}>
                    <td className="py-2 font-mono text-sm">{b.batch_no}</td>
                    <td className="py-2">
                      {b.expiry_date ? (
                        <span className={isExpired ? 'text-red-500 font-medium' : isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                          {new Date(b.expiry_date).toLocaleDateString('en-IN')}
                          {isExpired ? ' (expired)' : isExpiringSoon ? ` (${days}d)` : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2 text-right">{b.qty} {product.unit}</td>
                    <td className="py-2 text-right">{b.cost_price != null ? fmt(b.cost_price) : '—'}</td>
                    <td className="py-2 text-neutral-500">{b.notes ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-neutral-400">No batches recorded. Add a batch below.</p>
        )}

        <AddBatchForm productId={product.id} unit={product.unit} />
      </div>

      {/* Variants */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6">
        <VariantsPanel productId={product.id} parentPrice={product.selling_price} />
      </div>

      {/* Bill of Materials */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6">
        <BOMPanel productId={product.id} />
      </div>

      {/* Stock movement history */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6 space-y-4">
        <h2 className="font-medium">Stock Movement History</h2>
        {!movements?.length ? (
          <p className="text-sm text-neutral-400">No movements recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 dark:border-neutral-700 text-xs text-neutral-500">
              <tr>
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-left font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 text-neutral-500">{new Date(m.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.type === 'in' ? 'bg-green-50 text-green-700' :
                      m.type === 'out' ? 'bg-red-50 text-red-600' :
                      'bg-neutral-100 text-neutral-600'
                    }`}>{m.type}</span>
                  </td>
                  <td className={`py-2 text-right font-mono font-medium ${
                    m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-red-500' : ''
                  }`}>
                    {m.type === 'in' ? '+' : m.type === 'out' ? '−' : ''}{Math.abs(m.quantity)} {product.unit}
                  </td>
                  <td className="py-2 text-neutral-500">{m.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
