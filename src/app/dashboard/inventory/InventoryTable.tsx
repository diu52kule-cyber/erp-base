'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/types/inventory';
import LabelButton from './LabelButton';
import StockAdjuster from './StockAdjuster';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

export default function InventoryTable({ products }: { products: Product[] }) {
  const [cursor, setCursor] = useState(-1);
  const lenRef = useRef(products.length);
  lenRef.current = products.length;

  useEffect(() => { setCursor(-1); }, [products.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(c + 1, lenRef.current - 1)); return; }
      if (e.key === 'ArrowUp'   || e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); return; }
      if (e.key === 'Escape') { setCursor(-1); return; }

      if ((e.key === 'Enter' || e.key === 'o') && cursor >= 0 && products[cursor]) {
        e.preventDefault(); window.location.href = `/dashboard/inventory/${products[cursor].id}`;
      }
      if (e.key === 'e' && cursor >= 0 && products[cursor]) {
        e.preventDefault(); window.location.href = `/dashboard/inventory/${products[cursor].id}/edit`;
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); window.location.href = '/dashboard/inventory/new';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, products]);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
      {cursor >= 0 && (
        <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-1.5 text-xs text-neutral-500">
          <span>Row {cursor + 1}/{products.length}</span>
          <span>↵ open · E edit · Esc deselect</span>
        </div>
      )}
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
          {products.map((p, i) => {
            const isLow    = p.low_stock_threshold > 0 && p.stock_qty <= p.low_stock_threshold;
            const basePrice = p.tax_inclusive ? p.selling_price / (1 + p.gst_rate / 100) : p.selling_price;
            const margin   = p.cost_price > 0 ? ((basePrice - p.cost_price) / basePrice) * 100 : null;
            const selected = i === cursor;
            return (
              <tr
                key={p.id}
                onClick={() => window.location.href = `/dashboard/inventory/${p.id}`}
                className={`cursor-pointer transition-colors ${selected ? 'bg-blue-50 outline outline-1 outline-blue-200' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}`}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
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
                    <span className={margin < 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>{margin.toFixed(1)}%</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-neutral-500">{p.gst_rate}%</td>
                <td className="px-4 py-3 text-right">
                  <span className={isLow ? 'font-semibold text-amber-600' : 'font-medium'}>{p.stock_qty} {p.unit}</span>
                  {isLow && <span className="ml-1 text-xs text-amber-500">low</span>}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <LabelButton name={p.name} price={p.selling_price} code={p.barcode || p.sku || ''} />
                    <StockAdjuster productId={p.id} currentQty={p.stock_qty} unit={p.unit} />
                    <Link href={`/dashboard/inventory/${p.id}/edit`} className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50" onClick={(e) => e.stopPropagation()}>Edit</Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-400">
        ↑↓ navigate · ↵ open · E edit · N new product · <kbd className="rounded bg-neutral-100 px-1 font-mono">?</kbd> all shortcuts
      </div>
    </div>
  );
}
