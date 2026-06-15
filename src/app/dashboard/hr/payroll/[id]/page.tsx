import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { PayrollRun, PayrollEntry } from '@/lib/types/hr';
import ProcessButton from './ProcessButton';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: run }, { data: entries }] = await Promise.all([
    supabase.from('payroll_runs').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('payroll_entries').select('*, employee:employees(name, designation)')
      .eq('run_id', id).eq('org_id', ctx.org.id).order('created_at'),
  ]);

  if (!run) notFound();
  const pr = run as PayrollRun;
  const entryList = (entries ?? []) as (PayrollEntry & {
    basic_salary?: number; pf_employee?: number; esi_employee?: number;
    professional_tax?: number; tds?: number; pf_employer?: number; esi_employer?: number;
  })[];

  const monthLabel = new Date(pr.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const totalDeductions = entryList.reduce((s, e) => s + Number(e.deductions), 0);
  const totalPFEmployer = entryList.reduce((s, e) => s + Number(e.pf_employer ?? 0), 0);
  const totalESIEmployer = entryList.reduce((s, e) => s + Number(e.esi_employer ?? 0), 0);
  const hasDeductionCols = entryList.some((e) => Number(e.pf_employee ?? 0) + Number(e.esi_employee ?? 0) + Number(e.tds ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/hr/payroll" className="text-sm text-neutral-500 hover:text-neutral-900">← Payroll</Link>
          <h1 className="mt-2 text-2xl font-semibold">Payroll — {monthLabel}</h1>
          <p className="mt-1 text-sm text-neutral-500">{pr.working_days} working days · {entryList.length} employees</p>
        </div>
        <div className="flex items-center gap-3 mt-8">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${pr.status === 'processed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {pr.status === 'processed' ? 'Processed' : 'Draft'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Total Gross</p>
          <p className="mt-1 text-xl font-semibold">{fmt(Number(pr.total_gross))}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Total Deductions</p>
          <p className="mt-1 text-xl font-semibold text-red-600">{fmt(totalDeductions)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Net Pay</p>
          <p className="mt-1 text-xl font-semibold text-green-700">{fmt(Number(pr.total_net))}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Employer Cost</p>
          <p className="mt-1 text-xl font-semibold">{fmt(Number(pr.total_gross) + totalPFEmployer + totalESIEmployer)}</p>
          {(totalPFEmployer + totalESIEmployer) > 0 && (
            <p className="text-xs text-neutral-400">+PF/ESI employer contributions</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/dashboard/hr/payroll/${id}/payslip`}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
          View Payslips
        </Link>
        <Link href="/dashboard/hr/payroll/compliance"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
          Statutory Settings
        </Link>
      </div>

      {/* Entries table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Employee</th>
              <th className="px-4 py-3 text-right font-medium">Days</th>
              <th className="px-4 py-3 text-right font-medium">Gross</th>
              {hasDeductionCols && <>
                <th className="px-4 py-3 text-right font-medium">PF</th>
                <th className="px-4 py-3 text-right font-medium">ESI</th>
                <th className="px-4 py-3 text-right font-medium">PT</th>
                <th className="px-4 py-3 text-right font-medium">TDS</th>
              </>}
              <th className="px-4 py-3 text-right font-medium">Deductions</th>
              <th className="px-4 py-3 text-right font-medium">Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {entryList.map((entry) => (
              <tr key={entry.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{(entry.employee as any)?.name ?? '—'}</p>
                  {(entry.employee as any)?.designation && (
                    <p className="text-xs text-neutral-400">{(entry.employee as any).designation}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{entry.present_days}/{pr.working_days}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(Number(entry.gross_salary))}</td>
                {hasDeductionCols && <>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{Number(entry.pf_employee) > 0 ? fmt(Number(entry.pf_employee)) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{Number(entry.esi_employee) > 0 ? fmt(Number(entry.esi_employee)) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{Number(entry.professional_tax) > 0 ? fmt(Number(entry.professional_tax)) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{Number(entry.tds) > 0 ? fmt(Number(entry.tds)) : '—'}</td>
                </>}
                <td className="px-4 py-3 text-right tabular-nums text-red-600">
                  {Number(entry.deductions) > 0 ? `−${fmt(Number(entry.deductions))}` : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(Number(entry.net_salary))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold">
              <td className="px-4 py-3" colSpan={hasDeductionCols ? 7 : 3}>Total</td>
              <td className="px-4 py-3 text-right tabular-nums text-red-600">−{fmt(totalDeductions)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmt(Number(pr.total_net))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ProcessButton runId={pr.id} status={pr.status} />
    </div>
  );
}
