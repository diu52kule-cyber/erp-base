import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEPT_GRADIENTS: Record<string, { from: string; to: string; text: string; badge: string }> = {
  'Engineering':     { from: '#6366f1', to: '#818cf8', text: '#fff', badge: 'bg-indigo-600' },
  'Product':         { from: '#7c3aed', to: '#a78bfa', text: '#fff', badge: 'bg-violet-600' },
  'Design':          { from: '#db2777', to: '#f472b6', text: '#fff', badge: 'bg-pink-600' },
  'Marketing':       { from: '#d97706', to: '#fbbf24', text: '#fff', badge: 'bg-amber-500' },
  'Sales':           { from: '#059669', to: '#34d399', text: '#fff', badge: 'bg-emerald-600' },
  'Operations':      { from: '#2563eb', to: '#60a5fa', text: '#fff', badge: 'bg-blue-600' },
  'Human Resources': { from: '#dc2626', to: '#f87171', text: '#fff', badge: 'bg-red-600' },
  'Finance':         { from: '#0d9488', to: '#2dd4bf', text: '#fff', badge: 'bg-teal-600' },
};

const DEFAULT_GRAD = { from: '#6b7280', to: '#9ca3af', text: '#fff', badge: 'bg-neutral-500' };

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const NAV = [
  { label: 'People',     href: '/dashboard/hr' },
  { label: 'Departments', href: '/dashboard/hr/departments' },
  { label: 'Attendance', href: '/dashboard/hr/attendance' },
  { label: 'Payroll',    href: '/dashboard/hr/payroll' },
  { label: 'Leaves',     href: '/dashboard/hr/leaves' },
  { label: 'Holidays',   href: '/dashboard/hr/holidays' },
  { label: 'Loans',      href: '/dashboard/hr/loans' },
];

export default async function DepartmentsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  const [{ data: departments }, { data: employees }, { data: teams }] = await Promise.all([
    supabase.from('departments').select('id, name, description, color').eq('org_id', ctx.org.id).order('name'),
    supabase.from('employees')
      .select('id, name, department, department_id, designation, monthly_salary, manager_id')
      .eq('org_id', ctx.org.id).eq('status', 'active').is('archived_at', null),
    supabase.from('teams').select('id, name, color, department_id').eq('org_id', ctx.org.id),
  ]);

  const deptList = (departments ?? []) as { id: string; name: string; description: string | null; color: string }[];
  const empList = (employees ?? []) as { id: string; name: string; department: string; department_id: string | null; designation: string | null; monthly_salary: number; manager_id: string | null }[];
  const teamList = (teams ?? []) as { id: string; name: string; color: string; department_id: string | null }[];

  // Build employee index by department name (free-text match, best effort)
  const empByDeptName: Record<string, typeof empList> = {};
  for (const e of empList) {
    const key = e.department ?? 'Unassigned';
    (empByDeptName[key] ??= []).push(e);
  }

  // Resolve manager name
  const empById = Object.fromEntries(empList.map(e => [e.id, e]));

  const totalHeadcount = empList.length;
  const totalPayroll = empList.reduce((s, e) => s + Number(e.monthly_salary), 0);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Departments</h1>
            <p className="text-sm text-neutral-500">{deptList.length} departments · {totalHeadcount} employees</p>
          </div>
          <Link href="/dashboard/settings/departments"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            + New Department
          </Link>
        </div>
        {/* Sub-nav */}
        <div className="mt-4 flex gap-1">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                n.href === '/dashboard/hr/departments'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white'
              }`}>
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Summary stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Total Headcount', value: totalHeadcount, sub: 'active employees' },
            { label: 'Departments', value: deptList.length, sub: 'org units' },
            { label: 'Monthly Payroll', value: '₹' + (totalPayroll / 100000).toFixed(1) + 'L', sub: 'CTC across all depts' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs text-neutral-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Kanban columns */}
        {deptList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-20 text-center">
            <p className="text-xl text-neutral-400">No departments yet</p>
            <p className="mt-2 text-sm text-neutral-400">Create departments to organise your team</p>
            <Link href="/dashboard/settings/departments"
              className="mt-4 inline-block rounded-lg bg-neutral-900 px-6 py-2 text-sm text-white">
              Create Department
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deptList.map((dept) => {
              const grad = DEPT_GRADIENTS[dept.name] ?? DEFAULT_GRAD;
              const emps = empByDeptName[dept.name] ?? [];
              const deptTeams = teamList.filter(t => t.department_id === dept.id);
              const payroll = emps.reduce((s, e) => s + Number(e.monthly_salary), 0);
              // Find manager: employee who is manager_id of others in this dept, or first employee
              const managerIds = new Set(emps.map(e => e.manager_id).filter(Boolean));
              const manager = emps.find(e => managerIds.has(e.id)) ?? emps[0];
              const pct = totalHeadcount > 0 ? Math.round((emps.length / totalHeadcount) * 100) : 0;

              return (
                <div key={dept.id} className="flex flex-col rounded-2xl overflow-hidden border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm hover:shadow-md transition-shadow">
                  {/* Colored header */}
                  <div className="relative px-5 pt-5 pb-4"
                    style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white text-base">{dept.name}</h3>
                        {dept.description && (
                          <p className="mt-0.5 text-xs text-white/70 line-clamp-2">{dept.description}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">
                        {emps.length}
                      </span>
                    </div>
                    {/* Headcount bar */}
                    <div className="mt-3">
                      <div className="h-1 rounded-full bg-white/20">
                        <div className="h-1 rounded-full bg-white/80 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-white/60">{pct}% of headcount</p>
                    </div>
                  </div>

                  {/* Employee avatars */}
                  <div className="px-5 py-4 flex-1 space-y-3">
                    {emps.length > 0 ? (
                      <>
                        <div className="flex items-center gap-1 flex-wrap">
                          {emps.slice(0, 8).map((e) => (
                            <Link key={e.id} href={`/dashboard/hr/employees/${e.id}`}
                              className="group relative"
                              title={e.name}>
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold ${grad.badge} ring-2 ring-white dark:ring-neutral-900`}>
                                {initials(e.name)}
                              </div>
                            </Link>
                          ))}
                          {emps.length > 8 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300 ring-2 ring-white dark:ring-neutral-900">
                              +{emps.length - 8}
                            </div>
                          )}
                        </div>

                        {manager && (
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span>Manager:</span>
                            <Link href={`/dashboard/hr/employees/${manager.id}`}
                              className="font-medium text-neutral-700 hover:underline dark:text-neutral-300">
                              {manager.name}
                            </Link>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-neutral-400">No active employees</p>
                    )}

                    {/* Stats */}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-neutral-400">Payroll/mo</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {payroll > 0 ? '₹' + (payroll / 1000).toFixed(0) + 'K' : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-400">Teams</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">{deptTeams.length}</p>
                      </div>
                    </div>

                    {/* Teams chips */}
                    {deptTeams.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deptTeams.map(t => (
                          <Link key={t.id} href={`/dashboard/teams/${t.id}`}
                            className="rounded-full px-2 py-0.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: t.color }}>
                            {t.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 px-5 py-3 flex items-center justify-between">
                    <Link href={`/dashboard/hr?dept=${encodeURIComponent(dept.name)}`}
                      className="text-xs text-neutral-500 hover:text-indigo-600 hover:underline">
                      View employees →
                    </Link>
                    <Link href="/dashboard/settings/departments"
                      className="text-xs text-neutral-400 hover:text-neutral-600">
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Unassigned card */}
            {(empByDeptName['Unassigned'] ?? []).length > 0 && (
              <div className="flex flex-col rounded-2xl overflow-hidden border border-dashed border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                <div className="px-5 pt-5 pb-4 bg-neutral-100 dark:bg-neutral-800">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-600 dark:text-neutral-300">Unassigned</h3>
                    <span className="rounded-full bg-neutral-200 dark:bg-neutral-700 px-2.5 py-1 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                      {(empByDeptName['Unassigned'] ?? []).length}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-4 flex-1">
                  <p className="text-xs text-neutral-400 mb-3">Employees with no department assigned</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(empByDeptName['Unassigned'] ?? []).slice(0, 6).map(e => (
                      <Link key={e.id} href={`/dashboard/hr/employees/${e.id}`} title={e.name}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-400 text-xs font-bold text-white ring-2 ring-white dark:ring-neutral-900">
                          {initials(e.name)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
