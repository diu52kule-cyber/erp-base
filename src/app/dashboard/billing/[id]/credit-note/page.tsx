import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { bizConfig } from '@/lib/businessConfig';
import type { Invoice, InvoiceItem } from '@/lib/types/billing';
import InvoiceForm from '../../new/InvoiceForm';

export default async function CreditNotePage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing') || !ctx.org) redirect('/dashboard');
  const cfg = bizConfig(ctx.org?.business_type);

  const supabase = createClient();
  const [{ data: invoice }, { data: products }, { data: contacts }] = await Promise.all([
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', params.id).eq('org_id', ctx.org.id)
      .order('sort_order', { referencedTable: 'invoice_items', ascending: true })
      .maybeSingle<Invoice & { invoice_items: InvoiceItem[] }>(),
    supabase.from('products').select('id,name,sku,unit_price:selling_price,gst_rate').eq('org_id', ctx.org.id).eq('is_active', true).order('name'),
    supabase.from('contacts').select('id,name,company,email,gstin,address').eq('org_id', ctx.org.id).order('name'),
  ]);

  if (!invoice) notFound();
  if (invoice.doc_type !== 'invoice') redirect(`/dashboard/billing/${params.id}`);

  const initial = {
    customer_id: invoice.customer_id ?? null,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email ?? '',
    customer_gstin: invoice.customer_gstin ?? '',
    billing_address: invoice.billing_address ?? '',
    place_of_supply: invoice.place_of_supply ?? '',
    issue_date: new Date().toISOString().split('T')[0],
    reference_no: invoice.invoice_number,
    notes: `Return against ${invoice.invoice_number}`,
    terms: invoice.terms ?? '',
    currency: invoice.currency ?? 'INR',
    discount_type: invoice.discount_type ?? null,
    discount_value: invoice.discount_value ?? 0,
    round_off_enabled: (invoice.round_off ?? 0) !== 0,
    items: (invoice.invoice_items ?? []).map((it) => ({
      description: it.description,
      hsn_code: it.hsn_code ?? '',
      quantity: it.quantity,
      unit_price: it.unit_price,
      gst_rate: it.gst_rate,
      discount_type: it.discount_type ?? null,
      discount_value: it.discount_value ?? 0,
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/billing/${params.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">← Back</Link>
        <h1 className="text-2xl font-semibold">Credit Note for {invoice.invoice_number}</h1>
      </div>
      <p className="text-sm text-neutral-500">Adjust quantities or remove lines for a partial return. Saving reduces the customer&apos;s outstanding balance.</p>
      <InvoiceForm
        mode="credit_note"
        sourceId={params.id}
        initial={initial}
        defaultGst={cfg.defaultGst}
        products={(products ?? []) as never}
        contacts={(contacts ?? []) as never}
      />
    </div>
  );
}
