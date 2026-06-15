import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import Gstr3bClient from './Gstr3bClient';

export default async function Gstr3bPage({ searchParams }: { searchParams: { period?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const { data: gstSettings } = await supabase
    .from('org_gst_settings')
    .select('filing_period')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const filingPeriod = (gstSettings?.filing_period ?? 'monthly') as 'monthly' | 'quarterly';
  const now = new Date();
  const defaultPeriod = searchParams.period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
        <h1 className="mt-1 text-2xl font-semibold">GSTR-3B</h1>
        <p className="mt-1 text-sm text-neutral-500">Monthly summary return — output tax liability and payment</p>
      </div>
      <Gstr3bClient initialPeriod={defaultPeriod} filingPeriod={filingPeriod} />
    </div>
  );
}
