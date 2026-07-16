import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Invoice } from '@/lib/types/billing';
import { DOC_TYPES, isDocType, type DocType } from '@/lib/invoice/docTypes';
import BillingTable from './BillingTable';

const TABS: { type: DocType | 'recurring'; label: string }[] = [
  { type: 'invoice', label: 'Invoices' },
  { type: 'quotation', label: 'Quotations' },
  { type: 'proforma', label: 'Proforma' },
  { type: 'delivery_challan', label: 'Delivery Challans' },
  { type: 'credit_note', label: 'Credit Notes' },
  { type: 'recurring', label: 'Recurring' },
];

export default async function BillingPage({ searchParams }: { searchParams: { type?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing')) redirect('/dashboard');

  const docType: DocType = isDocType(searchParams.type) ? searchParams.type : 'invoice';
  const cfg = DOC_TYPES[docType];

  const supabase = createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, issue_date, total, status, currency, amount_paid')
    .eq('org_id', ctx.org!.id)
    .eq('doc_type', docType)
    .order('created_at', { ascending: false })
    .returns<(Pick<Invoice, 'id' | 'invoice_number' | 'customer_name' | 'issue_date' | 'total' | 'status' | 'currency' | 'amount_paid'>)[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Billing &amp; Invoicing</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/settings/invoice" className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50" title="Bill format & invoice settings">
            <span aria-hidden>⚙</span> Bill Settings
          </Link>
          <Link href={`/dashboard/billing/new?type=${docType}`} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">New {cfg.label}</Link>
        </div>
      </div>

      {/* Document tabs */}
      <div className="flex flex-wrap gap-1 border-b border-neutral-200">
        {TABS.map((t) => {
          const href = t.type === 'recurring' ? '/dashboard/billing/recurring' : `/dashboard/billing?type=${t.type}`;
          const active = t.type === docType;
          return (
            <Link key={t.type} href={href} className={`border-b-2 px-3 py-2 text-sm ${active ? 'border-neutral-900 font-medium text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>{t.label}</Link>
          );
        })}
      </div>

      {!invoices?.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          No {cfg.label.toLowerCase()}s yet.{' '}
          <Link href={`/dashboard/billing/new?type=${docType}`} className="text-neutral-900 underline">Create your first {cfg.short.toLowerCase()}.</Link>
        </div>
      ) : (
        <BillingTable invoices={invoices} docType={docType} shortLabel={cfg.short} />
      )}
    </div>
  );
}
