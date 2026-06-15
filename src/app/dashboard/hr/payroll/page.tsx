import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { PayrollRun } from '@/lib/types/hr';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function PayrollPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const { data } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('month', { ascending: false });

  const runs = (data ?? []) as PayrollRun[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
          <h1 className="mt-1 text-2xl font-semibold">Payroll</h1>
        </div>
        <div className="flex gap-2">
          <a href="/api/hr/form16?fy=2024-25"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Form 16 Export
          </a>
          <Link href="/dashboard/hr/payroll/compliance"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Statutory Settings
          </Link>
          <Link href="/dashboard/hr/payroll/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            + Run Payroll
          </Link>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No payroll runs yet</p>
          <Link href="/dashboard/hr/payroll/new" className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
            Run your first payroll
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Month</th>
                <th className="px-4 py-3 text-left font-medium">Working Days</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total Gross</th>
                <th className="px-4 py-3 text-right font-medium">Total Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/hr/payroll/${run.id}`} className="font-medium hover:underline">
                      {new Date(run.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{run.working_days} days</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${run.status === 'processed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {run.status === 'processed' ? 'Processed' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(Number(run.total_gross))}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(Number(run.total_net))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
