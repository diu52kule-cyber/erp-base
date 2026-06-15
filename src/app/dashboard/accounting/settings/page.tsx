import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';
import type { OrgGstSettings } from '@/lib/types/accounting';

export default async function GstSettingsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('accounting') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const { data } = await supabase
    .from('org_gst_settings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/accounting" className="text-sm text-neutral-500 hover:text-neutral-900">← GST & Accounting</Link>
        <h1 className="mt-1 text-2xl font-semibold">GST Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Configure your GSTIN and filing preferences</p>
      </div>
      <SettingsForm initial={data as OrgGstSettings | null} />
    </div>
  );
}
