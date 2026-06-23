'use client';

import { useState } from 'react';
import { toast, confirmDialog } from '@/lib/toast';
import { DOC_TYPES, type DocType } from '@/lib/invoice/docTypes';

export default function InvoiceActions({
  invoiceId, docType, status, hasEmail,
  invoiceNumber, customerName, customerPhone, total, sellerName,
}: {
  invoiceId: string;
  docType: DocType;
  status: string;
  hasEmail: boolean;
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string | null;
  total?: number;
  sellerName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const isInvoice = docType === 'invoice';
  const isQuoteLike = docType === 'quotation' || docType === 'proforma';
  const cfg = DOC_TYPES[docType];

  async function sendEmail() {
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoiceId}/email`, { method: 'POST' });
    const data = await res.json();
    toast(data.error ?? 'Emailed successfully', data.error ? 'error' : 'success');
    setBusy(false);
  }

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); setBusy(false); return; }
    window.location.href = `/dashboard/billing/${data.id}/edit`;
  }

  async function convert() {
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoiceId}/convert`, { method: 'POST' });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); setBusy(false); return; }
    toast('Converted to invoice');
    window.location.href = `/dashboard/billing/${data.id}`;
  }

  async function voidDoc() {
    const ok = await confirmDialog({
      title: `Delete / void ${cfg.short}?`,
      message: 'Drafts are deleted permanently. Issued documents are voided (kept for the record) and any receivable they created is reversed.',
      confirmLabel: 'Delete / Void', danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); setBusy(false); return; }
    toast(data.mode === 'deleted' ? 'Deleted' : 'Voided');
    window.location.href = '/dashboard/billing';
  }

  const btn = 'rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50';

  function shareWhatsApp() {
    const num = (total ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const payUrl = `${window.location.origin}/pay/${invoiceId}`;
    const lines = [
      `Hi${customerName ? ` ${customerName}` : ''}!`,
      ``,
      `Please find your invoice *${invoiceNumber ?? ''}* from *${sellerName ?? ''}*`,
      `Amount: ₹${num}`,
      ``,
      `Pay online: ${payUrl}`,
    ];
    const text = lines.join('\n');
    const phone = customerPhone?.replace(/\D/g, '') ?? '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noopener noreferrer" className={btn}>Download PDF</a>
      {hasEmail && <button onClick={sendEmail} disabled={busy} className={btn}>Email</button>}
      {isInvoice && (
        <button onClick={shareWhatsApp}
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100">
          💬 WhatsApp
        </button>
      )}
      {isInvoice && ['sent', 'partial'].includes(status) && (
        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/pay/${invoiceId}`); toast('Payment link copied!'); }}
          className={btn}>Copy Pay Link</button>
      )}
      {status !== 'cancelled' && (
        <a href={`/dashboard/billing/${invoiceId}/edit`} className={btn}>Edit</a>
      )}
      <button onClick={duplicate} disabled={busy} className={btn}>Duplicate</button>
      {isQuoteLike && status !== 'cancelled' && (
        <button onClick={convert} disabled={busy} className={`${btn} border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700`}>Convert to Invoice</button>
      )}
      {isInvoice && status !== 'cancelled' && (
        <a href={`/dashboard/billing/${invoiceId}/credit-note`} className={btn}>Credit Note</a>
      )}
      {isInvoice && (
        <>
          <a href={`/api/invoices/${invoiceId}/e-invoice`} target="_blank" rel="noopener noreferrer" className={btn}>e-Invoice JSON</a>
          <a href={`/api/invoices/${invoiceId}/e-way`} target="_blank" rel="noopener noreferrer" className={btn}>e-Way JSON</a>
        </>
      )}
      <button onClick={voidDoc} disabled={busy} className={`${btn} text-red-600 hover:bg-red-50`}>Delete / Void</button>
    </div>
  );
}
