'use client';

import { useState } from 'react';
import { GST_RATES, UNITS } from '@/lib/types/inventory';
import type { Unit, Product } from '@/lib/types/inventory';
import { useFormDraft } from '@/lib/useFormDraft';

type Mode = 'create' | 'edit';

type Props = {
  mode?: Mode;
  product?: Product;
  categories?: string[];
};

const inputCls = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

export default function ProductForm({ mode = 'create', product, categories = [] }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    description: product?.description ?? '',
    unit: (product?.unit ?? 'pcs') as Unit,
    selling_price: product?.selling_price != null ? String(product.selling_price) : '',
    cost_price: product?.cost_price != null && product.cost_price > 0 ? String(product.cost_price) : '',
    category: product?.category ?? '',
    brand: product?.brand ?? '',
    tax_inclusive: product?.tax_inclusive ?? false,
    gst_rate: product?.gst_rate ?? 18,
    hsn_code: product?.hsn_code ?? '',
    opening_stock: '',
    low_stock_threshold: product?.low_stock_threshold != null && product.low_stock_threshold > 0 ? String(product.low_stock_threshold) : '',
    reorder_qty: product?.reorder_qty != null && product.reorder_qty > 0 ? String(product.reorder_qty) : '',
  });

  const draftKey = mode === 'edit' ? `product-edit-${product?.id}` : 'product-new';
  const { clearDraft, draftRestored } = useFormDraft(
    draftKey,
    mode === 'create' ? form : null as any,
    mode === 'create' ? setForm : () => {}
  );

  // Margin calculation
  const selling = parseFloat(form.selling_price) || 0;
  const cost = parseFloat(form.cost_price) || 0;
  const basePrice = form.tax_inclusive ? selling / (1 + form.gst_rate / 100) : selling;
  const margin = cost > 0 && basePrice > 0 ? ((basePrice - cost) / basePrice) * 100 : null;

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Product name is required'); return; }
    const price = parseFloat(form.selling_price);
    if (isNaN(price) || price < 0) { setError('Enter a valid selling price'); return; }
    setError(null);
    setPending(true);

    const body = {
      name: form.name,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      unit: form.unit,
      selling_price: price,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
      category: form.category || undefined,
      brand: form.brand || undefined,
      tax_inclusive: form.tax_inclusive,
      gst_rate: form.gst_rate,
      hsn_code: form.hsn_code || undefined,
      low_stock_threshold: form.low_stock_threshold ? parseFloat(form.low_stock_threshold) : 0,
      reorder_qty: form.reorder_qty ? parseFloat(form.reorder_qty) : 0,
      ...(mode === 'create' ? { opening_stock: form.opening_stock ? parseFloat(form.opening_stock) : 0 } : {}),
    };

    try {
      const res = await fetch(
        mode === 'edit' ? `/api/products/${product!.id}` : '/api/products',
        {
          method: mode === 'edit' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setPending(false);
      } else {
        if (mode === 'create') clearDraft();
        window.location.href = mode === 'edit'
          ? `/dashboard/inventory/${product!.id}`
          : '/dashboard/inventory';
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save product');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {mode === 'create' && draftRestored && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>Restored your unsaved draft.</span>
          <button type="button" onClick={() => { clearDraft(); window.location.reload(); }} className="font-medium hover:underline">Discard</button>
        </div>
      )}

      {/* Basic details */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6 space-y-4">
        <h2 className="font-medium">Product Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Product Name *</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Espresso Coffee" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Category</label>
            <input
              type="text"
              list="category-list"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="e.g. Beverages"
              className={inputCls}
            />
            <datalist id="category-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Brand</label>
            <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Nescafé" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">SKU</label>
            <input type="text" value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="ESP-001" className={`${inputCls} font-mono`} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Barcode</label>
            <div className="flex gap-2">
              <input type="text" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Scan or type" className={`${inputCls} font-mono`} />
              <button type="button" onClick={() => set('barcode', String(Math.floor(100000000000 + Math.random() * 899999999999)))} className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">Gen</button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">HSN Code</label>
            <input type="text" value={form.hsn_code} onChange={(e) => set('hsn_code', e.target.value)} placeholder="e.g. 2101" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Unit</label>
            <select value={form.unit} onChange={(e) => set('unit', e.target.value as Unit)} className={inputCls}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Optional" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6 space-y-4">
        <h2 className="font-medium">Pricing</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Selling Price (₹) *</label>
            <input type="number" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} min="0" step="0.01" placeholder="0.00" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Cost / Purchase Price (₹)</label>
            <input type="number" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} min="0" step="0.01" placeholder="0.00" className={inputCls} />
            {margin !== null && (
              <p className={`mt-1 text-xs font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                Margin: {margin.toFixed(1)}%
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">GST Rate</label>
            <select value={form.gst_rate} onChange={(e) => set('gst_rate', parseInt(e.target.value))} className={inputCls}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-5">
            <input
              id="tax-inclusive"
              type="checkbox"
              checked={form.tax_inclusive}
              onChange={(e) => set('tax_inclusive', e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <label htmlFor="tax-inclusive" className="text-sm text-neutral-700 dark:text-neutral-300">
              Price is tax-inclusive (MRP includes GST)
              {form.tax_inclusive && selling > 0 && (
                <span className="ml-2 text-xs text-neutral-400">
                  Base: ₹{(selling / (1 + form.gst_rate / 100)).toFixed(2)} + GST ₹{(selling - selling / (1 + form.gst_rate / 100)).toFixed(2)}
                </span>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6 space-y-4">
        <h2 className="font-medium">Stock</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mode === 'create' && (
            <div>
              <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Opening Stock</label>
              <input type="number" value={form.opening_stock} onChange={(e) => set('opening_stock', e.target.value)} min="0" step="0.001" placeholder="0" className={inputCls} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Low Stock Alert Threshold</label>
            <input type="number" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} min="0" step="0.001" placeholder="0 = disabled" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Reorder Quantity</label>
            <input type="number" value={form.reorder_qty} onChange={(e) => set('reorder_qty', e.target.value)} min="0" step="0.001" placeholder="0 = not set" className={inputCls} />
            <p className="mt-1 text-xs text-neutral-400">Suggested qty to order when low-stock alert triggers</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a href={mode === 'edit' ? `/dashboard/inventory/${product!.id}` : '/dashboard/inventory'} className="rounded-md border border-neutral-200 px-5 py-2 text-sm hover:bg-neutral-50">
          Cancel
        </a>
        <button type="button" onClick={handleSubmit} disabled={pending} className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </div>
  );
}
