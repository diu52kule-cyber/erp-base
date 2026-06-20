import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { bizConfig } from '@/lib/businessConfig';
import InvoiceForm from './InvoiceForm';

export default async function NewInvoicePage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing')) redirect('/dashboard');
  const cfg = bizConfig(ctx.org?.business_type);

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
      <InvoiceForm defaultGst={cfg.defaultGst} />
    </div>
  );
}
