import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import AttachmentPanel from '@/components/AttachmentPanel';
import ArchiveButton from '@/components/ArchiveButton';
import SelfServiceTokenButton from './SelfServiceTokenButton';
import EmployeeTabs from './EmployeeTabs';
import LoginActions from './LoginActions';

const DEPT_COLORS: Record<string, string> = {
  'Engineering':     'bg-indigo-100 text-indigo-700',
  'Product':         'bg-violet-100 text-violet-700',
  'Design':          'bg-pink-100 text-pink-700',
  'Marketing':       'bg-amber-100 text-amber-700',
  'Sales':           'bg-emerald-100 text-emerald-700',
  'Operations':      'bg-blue-100 text-blue-700',
  'Human Resources': 'bg-red-100 text-red-700',
  'Finance':         'bg-teal-100 text-teal-700',
};
const AVATAR_COLORS: Record<string, string> = {
  'Engineering':     'bg-indigo-600',
  'Product':         'bg-violet-600',
  'Design':          'bg-pink-600',
  'Marketing':       'bg-amber-500',
  'Sales':           'bg-emerald-600',
  'Operations':      'bg-blue-600',
  'Human Resources': 'bg-red-600',
  'Finance':         'bg-teal-600',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function tenure(joining: string) {
  const months = Math.floor((Date.now() - new Date(joining).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return 'New hire';
  if (months < 12) return `${months} months`;
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

export const dynamic = 'force-dynamic';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const { id } = await params;
  const supabase = createClient();

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthStart = `${thisMonth}-01`;

  const [empResult, attResult, leaveResult, loanResult, payrollResult, directsResult] = await Promise.all([
    supabase.from('employees')
      .select('*, manager:manager_id(id, name, designation, department), department_obj:department_id(name)')
      .eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('attendance').select('date, status, check_in, check_out, overtime_hours, notes')
      .eq('employee_id', id).eq('org_id', ctx.org.id)
      .gte('date', monthStart).order('date', { ascending: false }),
    supabase.from('leave_requests').select('id, leave_type_id, start_date, end_date, status, reason, created_at')
      .eq('employee_id', id).eq('org_id', ctx.org.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('employee_loans').select('*').eq('employee_id', id).eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
    supabase.from('payroll_entries').select('*, run:payroll_run_id(month, status)')
      .eq('employee_id', id).eq('org_id', ctx.org.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('employees').select('id, name, designation, department')
      .eq('manager_id', id).eq('org_id', ctx.org.id).eq('status', 'active'),
  ]);

  if (!empResult.data) notFound();
  const emp = empResult.data as any;
  const attList = attResult.data ?? [];
  const leaves = leaveResult.data ?? [];
  const loans = loanResult.data ?? [];
  const payEntries = payrollResult.data ?? [];
  const directs = directsResult.data ?? [];

  // Attendance stats this month
  const presentDays = attList.filter((a: any) => a.status === 'present').length;
  const absentDays = attList.filter((a: any) => a.status === 'absent').length;
  const halfDays = attList.filter((a: any) => a.status === 'half-day').length;
  const leaveDays = attList.filter((a: any) => a.status === 'leave').length;
  const totalOT = attList.reduce((s: number, a: any) => s + Number(a.overtime_hours ?? 0), 0);

  // Payroll from latest entry
  const latestPay = payEntries[0] as any;

  // Loan stats
  const activeLoan = loans.find((l: any) => l.status === 'active') as any;

  const avColor = AVATAR_COLORS[emp.department] ?? 'bg-neutral-600';
  const deptBadge = DEPT_COLORS[emp.department] ?? 'bg-neutral-100 text-neutral-600';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Profile header */}
      <div className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="px-6 py-4">
          <Link href="/dashboard/hr" className="text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            ← People
          </Link>
        </div>
        <div className="px-6 pb-6 flex items-start gap-6">
          {/* Avatar */}
          <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl ${avColor} text-2xl font-bold text-white`}>
            {initials(emp.name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{emp.name}</h1>
                <p className="mt-0.5 text-base text-neutral-500">{emp.designation ?? 'No designation'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${deptBadge}`}>
                    {emp.department}
                  </span>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {emp.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-3 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {emp.employment_type}
                  </span>
                  <span className="text-xs text-neutral-400">{tenure(emp.joining_date)} tenure</span>
                </div>
                {emp.manager && (
                  <p className="mt-1 text-sm text-neutral-500">
                    Reports to{' '}
                    <Link href={`/dashboard/hr/employees/${emp.manager.id}`} className="font-medium text-neutral-700 hover:underline dark:text-neutral-300">
                      {emp.manager.name}
                    </Link>
                    <span className="text-neutral-400"> · {emp.manager.designation}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <SelfServiceTokenButton employeeId={emp.id} existingToken={emp.self_service_token ?? null} />
                  <ArchiveButton table="employees" id={emp.id} archived={!!emp.archived_at} redirectTo="/dashboard/hr" />
                </div>
                <LoginActions employeeId={emp.id} userId={emp.user_id ?? null} email={emp.email ?? null} />
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-neutral-400">Monthly CTC</p>
                <p className="font-semibold text-neutral-900 dark:text-white">{fmt(Number(emp.monthly_salary))}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Joined</p>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {new Date(emp.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">This month</p>
                <p className="font-semibold text-green-600">{presentDays}P <span className="text-neutral-400 font-normal">/ {absentDays}A / {halfDays}H</span></p>
              </div>
              {totalOT > 0 && (
                <div>
                  <p className="text-xs text-neutral-400">Overtime hrs</p>
                  <p className="font-semibold text-amber-600">{totalOT.toFixed(1)}h</p>
                </div>
              )}
              {activeLoan && (
                <div>
                  <p className="text-xs text-neutral-400">Loan outstanding</p>
                  <p className="font-semibold text-red-600">{fmt(Number(activeLoan.balance ?? activeLoan.amount))}</p>
                </div>
              )}
              {directs.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-400">Direct reports</p>
                  <p className="font-semibold text-indigo-600">{directs.length}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed content */}
      <div className="p-6">
        <EmployeeTabs
          emp={emp}
          attList={attList}
          leaves={leaves}
          loans={loans}
          payEntries={payEntries}
          directs={directs}
          presentDays={presentDays}
          absentDays={absentDays}
          halfDays={halfDays}
          leaveDays={leaveDays}
          latestPay={latestPay}
        />
      </div>
    </div>
  );
}
