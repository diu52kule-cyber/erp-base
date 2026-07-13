import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function EmployeeSelfServicePage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  // Look up employee by token
  const { data: emp } = await admin
    .from('employees')
    .select('id, name, designation, department, org_id, status, monthly_salary, joining_date, email, phone, employment_type, self_service_enabled')
    .eq('self_service_token', params.token)
    .maybeSingle();

  if (!emp || !emp.self_service_enabled) notFound();

  // Fetch payroll entries for this employee
  const [{ data: payEntries }, { data: attendance }, leaveRequests] = await Promise.all([
    admin
      .from('payroll_entries')
      .select('*, run:payroll_runs(month, status)')
      .eq('employee_id', emp.id)
      .order('created_at', { ascending: false })
      .limit(12),
    admin
      .from('attendance')
      .select('date, status, notes, in_time, out_time')
      .eq('employee_id', emp.id)
      .order('date', { ascending: false })
      .limit(30),
    (async () => {
      try {
        const r = await admin
          .from('leave_requests')
          .select('*, leave_type:leave_types(name)')
          .eq('employee_id', emp.id)
          .order('created_at', { ascending: false })
          .limit(10);
        return r.data ?? [];
      } catch { return []; }
    })(),
  ]);

  const presentDays  = (attendance ?? []).filter((a: any) => a.status === 'present').length;
  const absentDays   = (attendance ?? []).filter((a: any) => a.status === 'absent').length;

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-6">
          <p className="text-xs text-neutral-400 uppercase tracking-wider">Employee Self-Service</p>
          <h1 className="mt-1 text-2xl font-semibold">{emp.name}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {emp.designation ?? 'Employee'}
            {emp.department ? ` · ${emp.department}` : ''}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: 'Monthly Salary', value: fmt(Number(emp.monthly_salary ?? 0)) },
              { label: 'Joining Date', value: emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN') : '—' },
              { label: 'Status', value: emp.status === 'active' ? 'Active' : 'Inactive' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs text-neutral-400">{s.label}</p>
                <p className="text-sm font-medium mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent payslips */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-3">
          <h2 className="font-semibold">Recent Payslips</h2>
          {(payEntries ?? []).length === 0 ? (
            <p className="text-sm text-neutral-400">No payroll processed yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-500 border-b border-neutral-100">
                  <th className="pb-2 text-left">Month</th>
                  <th className="pb-2 text-right">Gross</th>
                  <th className="pb-2 text-right">Net Pay</th>
                  <th className="pb-2 text-left pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(payEntries ?? []).map((e: any) => (
                  <tr key={e.id}>
                    <td className="py-2">
                      {e.run ? new Date(e.run.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums">{fmt(Number(e.gross_salary ?? 0))}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{fmt(Number(e.net_salary ?? 0))}</td>
                    <td className="py-2 pl-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${e.run?.status === 'processed' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {e.run?.status === 'processed' ? 'Paid' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Attendance */}
        <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Attendance (Last 30)</h2>
            <div className="flex gap-3 text-xs text-neutral-500">
              <span className="text-green-600 font-medium">{presentDays} present</span>
              <span className="text-red-500 font-medium">{absentDays} absent</span>
            </div>
          </div>
          {(attendance ?? []).length === 0 ? (
            <p className="text-sm text-neutral-400">No attendance records.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(attendance ?? []).map((a: any) => (
                <div
                  key={a.date}
                  title={`${a.date}: ${a.status}`}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    a.status === 'present'   ? 'bg-green-50 text-green-700' :
                    a.status === 'absent'    ? 'bg-red-50 text-red-600' :
                    a.status === 'half-day'  ? 'bg-amber-50 text-amber-700' :
                    'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {a.date.slice(5)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leave requests */}
        {(leaveRequests ?? []).length > 0 && (
          <div className="rounded-2xl bg-white border border-neutral-200 p-6 space-y-3">
            <h2 className="font-semibold">Leave Requests</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-500 border-b border-neutral-100">
                  <th className="pb-2 text-left">Type</th>
                  <th className="pb-2 text-left">From</th>
                  <th className="pb-2 text-left">To</th>
                  <th className="pb-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(leaveRequests ?? []).map((lr: any) => (
                  <tr key={lr.id}>
                    <td className="py-2">{lr.leave_type?.name ?? '—'}</td>
                    <td className="py-2 tabular-nums">{lr.start_date}</td>
                    <td className="py-2 tabular-nums">{lr.end_date}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        lr.status === 'approved' ? 'bg-green-50 text-green-700' :
                        lr.status === 'rejected' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>{lr.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-center text-neutral-300">Powered by Gradia · Private link — do not share</p>
      </div>
    </div>
  );
}
