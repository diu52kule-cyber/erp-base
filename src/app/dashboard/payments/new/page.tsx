import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import PaymentForm from './PaymentForm';

type Props = { searchParams: { invoice?: string } };

export default async function NewPaymentPage({ searchParams }: Props) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('payments')) redirect('/dashboard');

  const supabase = createClient();
  const [{ data: rawInvoices }, { data: contacts }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, total, amount_paid')
      .eq('org_id', ctx.org!.id)
      .eq('doc_type', 'invoice')
      .in('status', ['draft', 'sent', 'partial'])
      .order('created_at', { ascending: false }),
    supabase
      .from('contacts')
      .select('id, name, email')
      .eq('org_id', ctx.org!.id)
      .order('name', { ascending: true }),
  ]);

  const invoices = (rawInvoices ?? []).map((inv) => ({
    ...inv,
    amount_paid: Number(inv.amount_paid ?? 0),
    total: Number(inv.total ?? 0),
    balance: Math.max(0, Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0)),
  }));

  const gatewayEnabled = !!(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/payments" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Record Payment</h1>
      </div>
      <PaymentForm
        invoices={invoices}
        contacts={contacts ?? []}
        preselectedInvoiceId={searchParams.invoice}
        gatewayEnabled={gatewayEnabled}
      />
    </div>
  );
}
