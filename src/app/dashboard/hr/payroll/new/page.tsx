import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import PayrollForm from './PayrollForm';

export default async function NewPayrollPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', ctx.org.id)
    .eq('status', 'active');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/hr/payroll" className="text-sm text-neutral-500 hover:text-neutral-900">← Payroll</Link>
        <h1 className="mt-2 text-2xl font-semibold">Run Payroll</h1>
      </div>
      <PayrollForm employeeCount={count ?? 0} />
    </div>
  );
}
