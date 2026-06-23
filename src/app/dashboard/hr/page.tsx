'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  if (months < 12) return `${months}m`;
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

interface Employee {
  id: string; name: string; email: string; phone: string;
  department: string; designation: string; employment_type: string;
  joining_date: string; monthly_salary: number; status: string;
  avatar_color?: string;
  manager?: { name: string } | null;
}

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{id:string;name:string}[]>([]);
  const [stats, setStats] = useState({ total: 0, presentToday: 0, pendingLeaves: 0, payroll: 0 });
  const [selectedDept, setSelectedDept] = useState('All');
  const [view, setView] = useState<'card' | 'list'>('card');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/hr/employees').then(r => r.json()),
      fetch('/api/hr/stats').then(r => r.json()),
    ]).then(([empData, statsData]) => {
      const emps = empData.employees ?? [];
      setEmployees(emps);
      const depts = Array.from(new Set<string>(emps.map((e: Employee) => e.department).filter(Boolean)));
      setDepartments(depts.map((n: string) => ({ id: n, name: n })));
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = employees.filter((e) =>
    (selectedDept === 'All' || e.department === selectedDept) &&
    (search === '' || e.name.toLowerCase().includes(search.toLowerCase()) ||
     e.designation?.toLowerCase().includes(search.toLowerCase()))
  );

  const deptCounts = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.department] = (acc[e.department] ?? 0) + 1;
    return acc;
  }, {});

  const NAV = [
    { label: 'Departments', href: '/dashboard/hr/departments' },
    { label: 'Attendance',  href: '/dashboard/hr/attendance' },
    { label: 'Payroll',     href: '/dashboard/hr/payroll' },
    { label: 'Leaves',      href: '/dashboard/hr/leaves' },
    { label: 'Holidays',    href: '/dashboard/hr/holidays' },
    { label: 'Loans',       href: '/dashboard/hr/loans' },
    { label: 'Shifts',      href: '/dashboard/hr/shifts' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">People</h1>
            <p className="text-sm text-neutral-500">Employees, teams &amp; payroll</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/hr/employees/export" download
               className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              Export CSV
            </a>
            <Link href="/dashboard/hr/employees/new"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              + Add Employee
            </Link>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="mt-4 flex gap-1">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href}
                  className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white">
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar — dept filter */}
        <aside className="w-52 shrink-0 border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 min-h-[calc(100vh-120px)]">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">Department</p>
          {[{ id: 'All', name: 'All' }, ...departments].map((d) => (
            <button key={d.id} onClick={() => setSelectedDept(d.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectedDept === d.name
                        ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                        : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    }`}>
              <span>{d.name}</span>
              <span className="text-xs text-neutral-400">
                {d.name === 'All' ? employees.length : (deptCounts[d.name] ?? 0)}
              </span>
            </button>
          ))}
        </aside>

        <main className="flex-1 p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: stats.total || employees.length, color: 'text-indigo-600' },
              { label: 'Present Today',   value: stats.presentToday ?? 0, color: 'text-emerald-600' },
              { label: 'Pending Leaves',  value: stats.pendingLeaves ?? 0, color: 'text-amber-600' },
              { label: 'Monthly Payroll', value: fmt(stats.payroll || employees.reduce((s, e) => s + Number(e.monthly_salary), 0)), color: 'text-teal-600' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs text-neutral-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Search + View Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                     placeholder="Search employees..."
                     className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900" />
            </div>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              {(['card', 'list'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                        className={`px-3 py-2 text-sm ${view === v ? 'bg-indigo-600 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800'}`}>
                  {v === 'card' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
            <p className="text-sm text-neutral-400">{filtered.length} employees</p>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-36 rounded-xl border border-neutral-200 bg-white animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />
              ))}
            </div>
          )}

          {/* Card View */}
          {!loading && view === 'card' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((emp) => {
                const av = AVATAR_COLORS[emp.department] ?? 'bg-neutral-600';
                const dc = DEPT_COLORS[emp.department] ?? 'bg-neutral-100 text-neutral-600';
                return (
                  <Link key={emp.id} href={`/dashboard/hr/employees/${emp.id}`}
                        className="group block rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${av} text-white text-sm font-bold`}>
                        {initials(emp.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-neutral-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-400 truncate">
                          {emp.name}
                        </p>
                        <p className="text-sm text-neutral-500 truncate">{emp.designation ?? '—'}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${dc}`}>
                          {emp.department}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                      <span>{fmt(Number(emp.monthly_salary))}<span className="text-neutral-400">/mo</span></span>
                      <span className="text-neutral-400">{tenure(emp.joining_date)}</span>
                    </div>
                    {emp.manager && (
                      <p className="mt-1 text-xs text-neutral-400">↑ {emp.manager.name}</p>
                    )}
                  </Link>
                );
              })}
              {filtered.length === 0 && !loading && (
                <div className="col-span-3 rounded-xl border border-dashed border-neutral-200 py-16 text-center">
                  <p className="text-neutral-500">No employees in {selectedDept}</p>
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {!loading && view === 'list' && (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                    {['Employee', 'Department', 'Designation', 'Joining', 'Salary', 'Type'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filtered.map((emp) => {
                    const av = AVATAR_COLORS[emp.department] ?? 'bg-neutral-500';
                    const dc = DEPT_COLORS[emp.department] ?? 'bg-neutral-100 text-neutral-600';
                    return (
                      <tr key={emp.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/hr/employees/${emp.id}`} className="flex items-center gap-3 hover:text-indigo-600">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${av} text-xs font-bold text-white`}>
                              {initials(emp.name)}
                            </div>
                            <div>
                              <p className="font-medium">{emp.name}</p>
                              <p className="text-xs text-neutral-400">{emp.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dc}`}>{emp.department}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{emp.designation ?? '—'}</td>
                        <td className="px-4 py-3 text-neutral-500 tabular-nums">
                          {new Date(emp.joining_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </td>
                        <td className="px-4 py-3 font-medium tabular-nums">{fmt(Number(emp.monthly_salary))}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {emp.employment_type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
