'use client';

import { useState } from 'react';
import { GST_RATES, UNITS } from '@/lib/types/inventory';
import type { Unit } from '@/lib/types/inventory';
import { useFormDraft } from '@/lib/useFormDraft';

export default function ProductForm({ defaultUnit = 'pcs', defaultGst = 18 }: { defaultUnit?: string; defaultGst?: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    unit: defaultUnit as Unit,
    selling_price: '',
    gst_rate: defaultGst,
    opening_stock: '',
    low_stock_threshold: '',
  });
  const { clearDraft, draftRestored } = useFormDraft('product-new', form, setForm);

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Product name is required');
      return;
    }
    const price = parseFloat(form.selling_price);
    if (isNaN(price) || price < 0) {
      setError('Enter a valid selling price');
      return;
    }
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || undefined,
          barcode: form.barcode || undefined,
          description: form.description || undefined,
          unit: form.unit,
          selling_price: price,
          gst_rate: form.gst_rate,
          opening_stock: form.opening_stock ? parseFloat(form.opening_stock) : 0,
          low_stock_threshold: form.low_stock_threshold
            ? parseFloat(form.low_stock_threshold)
            : 0,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setPending(false);
      } else {
        clearDraft();
        window.location.href = '/dashboard/inventory';
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save product');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {draftRestored && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>Restored your unsaved draft.</span>
          <button type="button" onClick={() => { clearDraft(); window.location.reload(); }} className="font-medium underline-offset-2 hover:underline">Discard</button>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Product Details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">
              Product Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Espresso Coffee"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) =>
                setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))
              }
              placeholder="e.g. ESP-001"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Barcode / QR value</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                placeholder="Scan an existing barcode, type one, or generate"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, barcode: String(Math.floor(100000000000 + Math.random() * 899999999999)) }))}
                className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-400">Used to scan this product at POS and to print a label. Leave blank to scan by SKU.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Unit</label>
            <select
              value={form.unit}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit: e.target.value as Unit }))
              }
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Selling Price (₹) *
            </label>
            <input
              type="number"
              value={form.selling_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, selling_price: e.target.value }))
              }
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">GST Rate</label>
            <select
              value={form.gst_rate}
              onChange={(e) =>
                setForm((f) => ({ ...f, gst_rate: parseInt(e.target.value) }))
              }
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="Optional product description"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Stock</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Opening Stock
            </label>
            <input
              type="number"
              value={form.opening_stock}
              onChange={(e) =>
                setForm((f) => ({ ...f, opening_stock: e.target.value }))
              }
              min="0"
              step="0.001"
              placeholder="0"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              value={form.low_stock_threshold}
              onChange={(e) =>
                setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))
              }
              min="0"
              step="0.001"
              placeholder="0 = disabled"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Add Product'}
        </button>
      </div>
    </div>
  );
}
