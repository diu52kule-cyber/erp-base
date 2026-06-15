import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { EMPLOYMENT_TYPE_LABELS, ATTENDANCE_COLORS, ATTENDANCE_LABELS } from '@/lib/types/hr';
import type { Employee, AttendanceRecord } from '@/lib/types/hr';
import AttachmentPanel from '@/components/AttachmentPanel';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: employee }, { data: recentAtt }] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('attendance').select('*').eq('employee_id', id).eq('org_id', ctx.org.id)
      .order('date', { ascending: false }).limit(30),
  ]);

  if (!employee) notFound();
  const emp = employee as Employee;
  const attList = (recentAtt ?? []) as AttendanceRecord[];
  const presentDays = attList.filter((a) => a.status === 'present').length;
  const halfDays = attList.filter((a) => a.status === 'half-day').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
          <h1 className="mt-2 text-2xl font-semibold">{emp.name}</h1>
          <p className="mt-1 text-neutral-500">
            {emp.designation ?? 'No designation'}
            {emp.department ? ` · ${emp.department}` : ''}
            {' · '}
            <span className="text-sm">{EMPLOYMENT_TYPE_LABELS[emp.employment_type]}</span>
          </p>
        </div>
        <span className={`mt-8 rounded-full px-3 py-1 text-xs font-medium ${emp.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
          {emp.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Monthly Salary</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(Number(emp.monthly_salary))}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-400">Joining Date</p>
          <p className="mt-1 text-lg font-semibold">
            {new Date(emp.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-1">
          <p className="text-xs text-neutral-400">Contact</p>
          <p className="text-sm">{emp.email ?? '—'}</p>
          <p className="text-sm text-neutral-500">{emp.phone ?? ''}</p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Recent Attendance <span className="text-sm font-normal text-neutral-400">(last 30 records)</span></h2>
          <p className="text-sm text-neutral-500">
            Present: <span className="font-medium text-green-700">{presentDays}</span>
            {halfDays > 0 && <> · Half-day: <span className="font-medium text-amber-700">{halfDays}</span></>}
          </p>
        </div>
        {attList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
            No attendance records yet
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {attList.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 tabular-nums">{a.date}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATTENDANCE_COLORS[a.status]}`}>
                        {ATTENDANCE_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{a.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <AttachmentPanel entityType="employee" entityId={emp.id} />
      </div>
    </div>
  );
}
