import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import DealForm from './DealForm';
import type { Contact } from '@/lib/types/crm';

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('crm') || !ctx.org) redirect('/dashboard');

  const { contact } = await searchParams;
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, company, type')
    .eq('org_id', ctx.org.id)
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/crm" className="text-sm text-neutral-500 hover:text-neutral-900">← CRM</Link>
        <h1 className="mt-2 text-2xl font-semibold">New Deal</h1>
      </div>
      <DealForm contacts={(contacts ?? []) as Contact[]} preselectedContactId={contact} />
    </div>
  );
}
