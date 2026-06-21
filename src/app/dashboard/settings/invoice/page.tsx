import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import InvoiceSettingsClient from './InvoiceSettingsClient';

export default async function InvoiceSettingsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.org) redirect('/dashboard');

  const supabase = createClient();
  const { data } = await supabase.from('org_invoice_settings').select('*').eq('org_id', ctx.org.id).maybeSingle();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Invoice settings</h1>
        <p className="text-sm text-neutral-500">Bank details, UPI, logo, signature and default terms shown on your invoices &amp; PDFs.</p>
      </div>
      <InvoiceSettingsClient initial={data ?? {}} />
    </div>
  );
}
