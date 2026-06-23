import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import PrintButton from './PrintButton';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-neutral-500'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = createClient();

  const [{ data: run }, { data: entries }] = await Promise.all([
    supabase.from('payroll_runs').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('payroll_entries')
      .select('*, employee:employees(name, designation, department)')
      .eq('run_id', id).eq('org_id', ctx.org.id).order('created_at'),
  ]);

  if (!run) notFound();

  const monthLabel = new Date(run.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/hr/payroll/${id}`} className="text-sm text-neutral-500 hover:text-neutral-900">← Back to Payroll Run</Link>
          <h1 className="mt-2 text-2xl font-semibold">Payslips — {monthLabel}</h1>
        </div>
        <PrintButton />
      </div>

      <div className="space-y-8">
        {(entries ?? []).map((entry: any) => {
          const emp = entry.employee ?? {};
          const gross = Number(entry.gross_salary);
          const basic = Number(entry.basic_salary || gross * 0.5);
          const hra   = Math.round(basic * 0.4);
          const special = Math.round(gross - basic - hra);

          return (
            <div key={entry.id} className="rounded-2xl border border-neutral-200 bg-white p-8 print:break-inside-avoid print:border-0 print:shadow-none print:p-0">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between border-b border-neutral-100 pb-6">
                <div>
                  <p className="text-lg font-bold">{ctx.org!.name}</p>
                  <p className="text-sm text-neutral-500">Payslip for {monthLabel}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{emp.name}</p>
                  <p className="text-neutral-500">{emp.designation ?? ''}</p>
                  <p className="text-neutral-500">{emp.department ?? ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Earnings */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Earnings</p>
                  <div className="divide-y divide-neutral-100">
                    <Row label="Basic Salary" value={fmt(basic)} />
                    <Row label="HRA" value={fmt(hra)} />
                    {special > 0 && <Row label="Special Allowance" value={fmt(special)} />}
                    <Row label="Gross Salary" value={fmt(gross)} bold />
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Deductions</p>
                  <div className="divide-y divide-neutral-100">
                    {Number(entry.pf_employee) > 0 && <Row label="PF (Employee 12%)" value={fmt(Number(entry.pf_employee))} />}
                    {Number(entry.esi_employee) > 0 && <Row label="ESI (Employee 0.75%)" value={fmt(Number(entry.esi_employee))} />}
                    {Number(entry.professional_tax) > 0 && <Row label="Professional Tax" value={fmt(Number(entry.professional_tax))} />}
                    {Number(entry.tds) > 0 && <Row label="TDS (Sec 192)" value={fmt(Number(entry.tds))} />}
                    {Number(entry.deductions) === 0 && <p className="py-2 text-sm text-neutral-400">No deductions</p>}
                    <Row label="Total Deductions" value={fmt(Number(entry.deductions))} bold />
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="mt-6 flex items-center justify-between rounded-xl bg-neutral-900 px-6 py-4 text-white">
                <div>
                  <p className="text-sm text-neutral-400">Days Present</p>
                  <p className="text-lg font-semibold">{entry.present_days} / {run.working_days}</p>
                </div>
                {Number(entry.pf_employer) > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-neutral-400">Employer PF</p>
                    <p className="text-lg font-semibold">{fmt(Number(entry.pf_employer))}</p>
                  </div>
                )}
                {Number(entry.esi_employer) > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-neutral-400">Employer ESI</p>
                    <p className="text-lg font-semibold">{fmt(Number(entry.esi_employer))}</p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm text-neutral-400">Net Pay</p>
                  <p className="text-2xl font-bold">{fmt(Number(entry.net_salary))}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
