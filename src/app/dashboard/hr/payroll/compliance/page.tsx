import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import ComplianceForm from './ComplianceForm';
import type { StatutorySettings } from '@/lib/types/payroll_compliance';

export default async function CompliancePage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const { data } = await supabase
    .from('statutory_settings')
    .select('*')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const initial: StatutorySettings = data ?? {
    org_id: ctx.org.id,
    pf_enabled: true,
    esi_enabled: true,
    pt_enabled: false,
    pt_state: 'MH',
    tds_enabled: false,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/hr/payroll" className="text-sm text-neutral-500 hover:text-neutral-900">← Payroll</Link>
        <h1 className="mt-2 text-2xl font-semibold">Statutory Compliance Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure PF, ESI, Professional Tax, and TDS deductions applied during payroll runs.
        </p>
      </div>
      <ComplianceForm initial={initial} />
    </div>
  );
}
