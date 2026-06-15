import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { EMPLOYMENT_TYPE_LABELS, ATTENDANCE_COLORS, ATTENDANCE_LABELS } from '@/lib/types/hr';
import type { Employee, AttendanceRecord } from '@/lib/types/hr';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function HRPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const [{ data: employees }, { data: todayAtt }, { data: payrollRuns }] = await Promise.all([
    supabase.from('employees').select('*').eq('org_id', ctx.org.id).eq('status', 'active').order('name'),
    supabase.from('attendance').select('*, employee:employees(name)').eq('org_id', ctx.org.id).eq('date', today),
    supabase.from('payroll_runs').select('*').eq('org_id', ctx.org.id).order('month', { ascending: false }).limit(3),
  ]);

  const empList = (employees ?? []) as Employee[];
  const attList = (todayAtt ?? []) as AttendanceRecord[];
  const markedIds = new Set(attList.map((a) => a.employee_id));
  const totalSalary = empList.reduce((s, e) => s + Number(e.monthly_salary), 0);
  const presentToday = attList.filter((a) => a.status === 'present' || a.status === 'half-day').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">HR</h1>
          <p className="mt-1 text-sm text-neutral-500">Employees, attendance &amp; payroll</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/hr/attendance" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Mark Attendance
          </Link>
          <Link href="/dashboard/hr/employees/new" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            + Add Employee
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active Employees', value: empList.length },
          { label: 'Present Today', value: `${presentToday} / ${empList.length}` },
          { label: 'Unmarked Today', value: empList.length - markedIds.size },
          { label: 'Monthly Payroll', value: fmt(totalSalary) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Today's attendance */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Today&apos;s Attendance — {today}</h2>
          <Link href="/dashboard/hr/attendance" className="text-sm text-neutral-500 hover:text-neutral-900">
            Mark all →
          </Link>
        </div>
        {empList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
            <p className="text-neutral-500">No active employees</p>
            <Link href="/dashboard/hr/employees/new" className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
              Add your first employee
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Designation</th>
                  <th className="px-4 py-3 text-left font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {empList.map((emp) => {
                  const att = attList.find((a) => a.employee_id === emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/hr/employees/${emp.id}`} className="font-medium hover:underline">
                          {emp.name}
                        </Link>
                        {emp.department && <span className="ml-2 text-xs text-neutral-400">{emp.department}</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{emp.designation ?? '—'}</td>
                      <td className="px-4 py-3">
                        {att ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATTENDANCE_COLORS[att.status]}`}>
                            {ATTENDANCE_LABELS[att.status]}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">Not marked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent payroll */}
      {(payrollRuns ?? []).length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Payroll</h2>
            <Link href="/dashboard/hr/payroll" className="text-sm text-neutral-500 hover:text-neutral-900">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Month</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(payrollRuns ?? []).map((run: any) => (
                  <tr key={run.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/hr/payroll/${run.id}`} className="font-medium hover:underline">
                        {new Date(run.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${run.status === 'processed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {run.status === 'processed' ? 'Processed' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(Number(run.total_net))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
