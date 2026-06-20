import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { bizConfig } from '@/lib/businessConfig';
import InvoiceForm from './InvoiceForm';

export default async function NewInvoicePage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing') || !ctx.org) redirect('/dashboard');
  const cfg = bizConfig(ctx.org?.business_type);

  const supabase = createClient();
  const [{ data: products }, { data: contacts }] = await Promise.all([
    supabase.from('products').select('id,name,sku,unit_price:selling_price,gst_rate')
      .eq('org_id', ctx.org.id).eq('is_active', true).order('name'),
    supabase.from('contacts').select('id,name,company,email,gstin,address')
      .eq('org_id', ctx.org.id).order('name'),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/billing"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">New Invoice</h1>
      </div>
      <InvoiceForm defaultGst={cfg.defaultGst} products={(products ?? []) as never} contacts={(contacts ?? []) as never} />
    </div>
  );
}
