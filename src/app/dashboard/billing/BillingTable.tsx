'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Invoice, InvoiceStatus } from '@/lib/types/billing';
import type { DocType } from '@/lib/invoice/docTypes';
import { fmtMoney } from '@/lib/invoice/format';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-neutral-100 text-neutral-600',
  sent:      'bg-blue-50 text-blue-700',
  partial:   'bg-amber-50 text-amber-700',
  paid:      'bg-green-50 text-green-700',
  refunded:  'bg-red-50 text-red-600',
  cancelled: 'bg-neutral-100 text-neutral-400',
};

type Row = Pick<Invoice, 'id' | 'invoice_number' | 'customer_name' | 'issue_date' | 'total' | 'status' | 'currency' | 'amount_paid'>;

export default function BillingTable({ invoices, docType, shortLabel }: { invoices: Row[]; docType: DocType; shortLabel: string }) {
  const [cursor, setCursor] = useState(-1);
  const lenRef = useRef(invoices.length);
  lenRef.current = invoices.length;

  useEffect(() => { setCursor(-1); }, [invoices.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(c + 1, lenRef.current - 1)); return; }
      if (e.key === 'ArrowUp'   || e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); return; }
      if (e.key === 'Escape') { setCursor(-1); return; }

      if ((e.key === 'Enter' || e.key === 'o') && cursor >= 0 && invoices[cursor]) {
        e.preventDefault(); window.location.href = `/dashboard/billing/${invoices[cursor].id}`;
      }
      if (e.key === 'e' && cursor >= 0 && invoices[cursor]) {
        e.preventDefault(); window.location.href = `/dashboard/billing/${invoices[cursor].id}/edit`;
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); window.location.href = `/dashboard/billing/new?type=${docType}`;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, invoices, docType]);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {cursor >= 0 && (
        <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-1.5 text-xs text-neutral-500">
          <span>Row {cursor + 1}/{invoices.length}</span>
          <span>↵ open · E edit · Esc deselect</span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{shortLabel} #</th>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            {docType === 'invoice' && <th className="px-4 py-3 text-right font-medium">Balance</th>}
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {invoices.map((inv, i) => {
            const balance   = Math.max(0, (inv.total ?? 0) - (inv.amount_paid ?? 0));
            const selected  = i === cursor;
            return (
              <tr
                key={inv.id}
                onClick={() => window.location.href = `/dashboard/billing/${inv.id}`}
                className={`cursor-pointer transition-colors ${selected ? 'bg-blue-50 outline outline-1 outline-blue-200' : 'hover:bg-neutral-50'}`}
              >
                <td className="px-4 py-3 font-medium text-neutral-900">{inv.invoice_number}</td>
                <td className="px-4 py-3 text-neutral-700">{inv.customer_name}</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(inv.issue_date).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-medium">{fmtMoney(inv.total, inv.currency ?? 'INR')}</td>
                {docType === 'invoice' && (
                  <td className={`px-4 py-3 text-right ${balance > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>
                    {balance > 0 ? fmtMoney(balance, inv.currency ?? 'INR') : '—'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}>{inv.status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-400">
        ↑↓ navigate · ↵ open · E edit · N new {shortLabel.toLowerCase()} · <kbd className="rounded bg-neutral-100 px-1 font-mono">?</kbd> all shortcuts
      </div>
    </div>
  );
}
