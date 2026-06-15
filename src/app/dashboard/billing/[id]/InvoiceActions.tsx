'use client';

import { useState } from 'react';

export default function InvoiceActions({ invoiceId, hasEmail }: { invoiceId: string; hasEmail: boolean }) {
  const [emailing, setEmailing] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  async function sendEmail() {
    setEmailing(true); setEmailMsg(null);
    const res  = await fetch(`/api/invoices/${invoiceId}/email`, { method: 'POST' });
    const data = await res.json();
    setEmailMsg(data.error ?? 'Invoice emailed successfully!');
    setEmailing(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noopener noreferrer"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
          Download PDF
        </a>
        {hasEmail && (
          <button onClick={sendEmail} disabled={emailing}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">
            {emailing ? 'Sending…' : 'Email Invoice'}
          </button>
        )}
      </div>
      {emailMsg && (
        <p className={`text-sm ${emailMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {emailMsg}
        </p>
      )}
    </div>
  );
}
