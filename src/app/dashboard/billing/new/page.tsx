import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { bizConfig } from '@/lib/businessConfig';
import { DOC_TYPES, isDocType, type DocType } from '@/lib/invoice/docTypes';
import InvoiceForm from './InvoiceForm';

export default async function NewInvoicePage({ searchParams }: { searchParams: { type?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing') || !ctx.org) redirect('/dashboard');
  const cfg = bizConfig(ctx.org?.business_type);
  const docType: DocType = isDocType(searchParams.type) ? searchParams.type : 'invoice';

  const supabase = createClient();
  const [{ data: products }, { data: contacts }, { data: settings }] = await Promise.all([
    supabase.from('products').select('id,name,sku,unit_price:selling_price,gst_rate').eq('org_id', ctx.org.id).eq('is_active', true).order('name'),
    supabase.from('contacts').select('id,name,company,email,gstin,address').eq('org_id', ctx.org.id).order('name'),
    supabase.from('org_invoice_settings').select('default_due_days,default_terms,default_notes,enable_round_off').eq('org_id', ctx.org.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/billing" className="text-sm text-neutral-500 hover:text-neutral-900">← Back</Link>
        <h1 className="text-2xl font-semibold">New {DOC_TYPES[docType].label}</h1>
      </div>
      <InvoiceForm
        docType={docType}
        defaultGst={cfg.defaultGst}
        defaultDueDays={settings?.default_due_days ?? 0}
        defaultTerms={settings?.default_terms ?? ''}
        defaultNotes={settings?.default_notes ?? ''}
        roundOffDefault={settings?.enable_round_off ?? true}
        products={(products ?? []) as never}
        contacts={(contacts ?? []) as never}
      />
    </div>
  );
}
