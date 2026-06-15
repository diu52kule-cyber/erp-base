import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import AttendanceSheet from './AttendanceSheet';
import type { Employee, AttendanceStatus } from '@/lib/types/hr';

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const { date: dateParam } = await searchParams;
  const date = dateParam ?? new Date().toISOString().split('T')[0];

  const supabase = await createClient();
  const [{ data: employees }, { data: existing }] = await Promise.all([
    supabase.from('employees').select('*').eq('org_id', ctx.org.id).eq('status', 'active').order('name'),
    supabase.from('attendance').select('employee_id, status').eq('org_id', ctx.org.id).eq('date', date),
  ]);

  const empList = (employees ?? []) as Employee[];
  const existingMap = Object.fromEntries(
    (existing ?? []).map((a) => [a.employee_id, a.status as AttendanceStatus])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
          <h1 className="mt-2 text-2xl font-semibold">Mark Attendance</h1>
        </div>
        <input
          type="date"
          defaultValue={date}
          onChange={(e) => {
            if (typeof window !== 'undefined') {
              window.location.href = '/dashboard/hr/attendance?date=' + (e.target as HTMLInputElement).value;
            }
          }}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>
      <p className="text-sm text-neutral-500">Date: <span className="font-medium text-neutral-800">{date}</span> · {empList.length} active employees</p>
      <AttendanceSheet employees={empList} existing={existingMap} date={date} />
    </div>
  );
}
