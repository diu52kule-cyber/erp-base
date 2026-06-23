'use client';

import { useState } from 'react';
import Link from 'next/link';
import AttachmentPanel from '@/components/AttachmentPanel';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ATT_COLORS: Record<string, string> = {
  present:  'bg-green-100 text-green-700',
  absent:   'bg-red-100 text-red-700',
  'half-day': 'bg-amber-100 text-amber-700',
  leave:    'bg-blue-100 text-blue-700',
  holiday:  'bg-violet-100 text-violet-700',
};
const ATT_LABELS: Record<string, string> = {
  present: 'Present', absent: 'Absent', 'half-day': 'Half Day', leave: 'On Leave', holiday: 'Holiday',
};
const LEAVE_STATUS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
};
const AVATAR_COLORS: Record<string, string> = {
  'Engineering': 'bg-indigo-600', 'Product': 'bg-violet-600', 'Design': 'bg-pink-600',
  'Marketing': 'bg-amber-500', 'Sales': 'bg-emerald-600', 'Operations': 'bg-blue-600',
  'Human Resources': 'bg-red-600', 'Finance': 'bg-teal-600',
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

interface Props {
  emp: any;
  attList: any[];
  leaves: any[];
  loans: any[];
  payEntries: any[];
  directs: any[];
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  latestPay: any;
}

const TABS = ['Overview', 'Attendance', 'Payroll', 'Leaves & Loans', 'Team', 'Documents'];

export default function EmployeeTabs({ emp, attList, leaves, loans, payEntries, directs, presentDays, absentDays, halfDays, leaveDays, latestPay }: Props) {
  const [tab, setTab] = useState('Overview');

  const basic = Number(emp.monthly_salary) * (Number(emp.basic_pct ?? 50) / 100);
  const hra = basic * 0.4;
  const allowances = Number(emp.monthly_salary) - basic - hra;
  const pf = Math.min(basic, 15000) * 0.12;
  const esi = Number(emp.monthly_salary) <= 21000 ? Number(emp.monthly_salary) * 0.0075 : 0;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Contact info */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Contact Information</h3>
            <dl className="space-y-3 text-sm">
              {[
                { label: 'Work Email', value: emp.email },
                { label: 'Phone', value: emp.phone },
                { label: 'Department', value: emp.department },
                { label: 'Designation', value: emp.designation },
                { label: 'Employment Type', value: emp.employment_type },
                { label: 'PAN', value: emp.pan_number ?? '—' },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <dt className="text-neutral-400">{r.label}</dt>
                  <dd className="font-medium text-neutral-800 dark:text-neutral-200">{r.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* This month summary */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
              This Month — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Present', value: presentDays, color: 'text-green-600' },
                { label: 'Absent',  value: absentDays,  color: 'text-red-500' },
                { label: 'Half Day',value: halfDays,     color: 'text-amber-600' },
                { label: 'On Leave',value: leaveDays,    color: 'text-blue-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Attendance bar */}
            {attList.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-neutral-400 mb-2">Daily attendance</p>
                <div className="flex gap-0.5 flex-wrap">
                  {attList.slice().reverse().map((a: any) => (
                    <div key={a.date} title={`${a.date}: ${ATT_LABELS[a.status] ?? a.status}`}
                         className={`h-5 w-5 rounded-sm text-[8px] flex items-center justify-center text-white font-bold ${
                           a.status === 'present' ? 'bg-green-500' :
                           a.status === 'absent'  ? 'bg-red-400' :
                           a.status === 'half-day'? 'bg-amber-400' :
                           a.status === 'leave'   ? 'bg-blue-400' : 'bg-neutral-200'
                         }`}>
                      {a.date.slice(-2)}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-3 text-xs text-neutral-400">
                  {[['bg-green-500','Present'],['bg-red-400','Absent'],['bg-amber-400','Half'],['bg-blue-400','Leave']].map(([c,l]) => (
                    <span key={l} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${c}`} />{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Salary breakdown */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Salary Structure</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Gross CTC', value: Number(emp.monthly_salary), highlight: true },
                { label: `Basic (${emp.basic_pct ?? 50}%)`, value: basic, sub: true },
                { label: 'HRA (40% of basic)', value: hra, sub: true },
                { label: 'Allowances', value: allowances, sub: true },
              ].map((r) => (
                <div key={r.label} className={`flex justify-between ${r.sub ? 'pl-4 text-neutral-500' : 'font-semibold'}`}>
                  <span>{r.label}</span>
                  <span className={r.highlight ? 'text-indigo-600' : ''}>{fmt(r.value)}</span>
                </div>
              ))}
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 mt-2 text-neutral-500">
                <p className="text-xs font-medium text-neutral-400 mb-2">Deductions</p>
                {[
                  { label: 'PF (Employee 12%)', value: pf },
                  { label: esi > 0 ? 'ESI (0.75%)' : 'ESI', value: esi, na: esi === 0 },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between pl-4 text-sm">
                    <span>{r.label}</span>
                    <span className="text-red-600">{r.na ? 'Not applicable' : `− ${fmt(r.value)}`}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-semibold border-t border-neutral-200 dark:border-neutral-700 pt-2">
                <span>Estimated Net</span>
                <span className="text-green-600">{fmt(Number(emp.monthly_salary) - pf - esi)}</span>
              </div>
            </div>
          </div>

          {/* Direct reports */}
          {directs.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
                Direct Reports ({directs.length})
              </h3>
              <div className="space-y-3">
                {directs.map((d: any) => {
                  const av = AVATAR_COLORS[d.department] ?? 'bg-neutral-600';
                  return (
                    <Link key={d.id} href={`/dashboard/hr/employees/${d.id}`}
                          className="flex items-center gap-3 hover:text-indigo-600">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${av} text-xs font-bold text-white`}>
                        {initials(d.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-neutral-400">{d.designation}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Tab */}
      {tab === 'Attendance' && (
        <div className="space-y-4">
          {attList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-400">
              No attendance records this month
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Check In</th>
                    <th className="px-4 py-3 text-left font-medium">Check Out</th>
                    <th className="px-4 py-3 text-left font-medium">OT Hours</th>
                    <th className="px-4 py-3 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {attList.map((a: any) => (
                    <tr key={a.date} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-4 py-2.5 font-medium tabular-nums">{a.date}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATT_COLORS[a.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                          {ATT_LABELS[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-500 tabular-nums">{a.check_in ? a.check_in.slice(0,5) : '—'}</td>
                      <td className="px-4 py-2.5 text-neutral-500 tabular-nums">{a.check_out ? a.check_out.slice(0,5) : '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums">{Number(a.overtime_hours) > 0 ? <span className="text-amber-600 font-medium">{a.overtime_hours}h</span> : '—'}</td>
                      <td className="px-4 py-2.5 text-neutral-400">{a.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payroll Tab */}
      {tab === 'Payroll' && (
        <div className="space-y-6">
          {payEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-400">
              No payroll records yet. Run payroll from{' '}
              <Link href="/dashboard/hr/payroll" className="text-indigo-600 hover:underline">Payroll</Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                    {['Month', 'Gross', 'PF Deduction', 'ESI', 'TDS', 'Net Pay', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {payEntries.map((p: any) => (
                    <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/dashboard/hr/payroll/${p.payroll_run_id}`} className="hover:text-indigo-600">
                          {p.run?.month ? new Date(p.run.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{fmt(Number(p.gross_salary ?? 0))}</td>
                      <td className="px-4 py-3 text-red-600 tabular-nums">{fmt(Number(p.pf_employee ?? 0))}</td>
                      <td className="px-4 py-3 text-red-600 tabular-nums">{fmt(Number(p.esi_employee ?? 0))}</td>
                      <td className="px-4 py-3 text-red-600 tabular-nums">{fmt(Number(p.tds ?? 0))}</td>
                      <td className="px-4 py-3 font-semibold text-green-600 tabular-nums">{fmt(Number(p.net_salary ?? 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.run?.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.run?.status ?? 'draft'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Leaves & Loans Tab */}
      {tab === 'Leaves & Loans' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Leaves */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Leave Requests</h3>
            {leaves.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
                No leave requests
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((l: any) => (
                  <div key={l.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{l.start_date} → {l.end_date}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{l.reason ?? 'No reason given'}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEAVE_STATUS[l.status] ?? 'bg-neutral-100 text-neutral-500'}`}>
                        {l.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loans */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Loans & Advances</h3>
            {loans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
                No loans or advances
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map((l: any) => (
                  <div key={l.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{l.purpose ?? 'Loan'}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {fmt(Number(l.amount))} · {l.installments ?? '—'} installments
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">{fmt(Number(l.balance ?? l.amount))}</p>
                        <p className="text-xs text-neutral-400">outstanding</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500"
                             style={{ width: `${Math.max(0, 100 - (Number(l.balance ?? l.amount) / Number(l.amount)) * 100)}%` }} />
                      </div>
                    </div>
                    <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Tab */}
      {tab === 'Team' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Organisation</h3>
            {emp.manager && (
              <div className="mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <p className="text-xs text-neutral-400 mb-2">Manager</p>
                <Link href={`/dashboard/hr/employees/${emp.manager.id}`}
                      className="flex items-center gap-3 hover:text-indigo-600">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${AVATAR_COLORS[emp.manager.department] ?? 'bg-neutral-600'} text-white text-sm font-bold`}>
                    {initials(emp.manager.name)}
                  </div>
                  <div>
                    <p className="font-medium">{emp.manager.name}</p>
                    <p className="text-xs text-neutral-400">{emp.manager.designation}</p>
                  </div>
                </Link>
              </div>
            )}
            {directs.length > 0 && (
              <div>
                <p className="text-xs text-neutral-400 mb-2">Direct Reports ({directs.length})</p>
                <div className="space-y-2">
                  {directs.map((d: any) => (
                    <Link key={d.id} href={`/dashboard/hr/employees/${d.id}`}
                          className="flex items-center gap-3 hover:text-indigo-600">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${AVATAR_COLORS[d.department] ?? 'bg-neutral-600'} text-white text-xs font-bold`}>
                        {initials(d.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-neutral-400">{d.designation}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {!emp.manager && directs.length === 0 && (
              <p className="text-sm text-neutral-400">No reporting structure configured</p>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'Documents' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <AttachmentPanel entityType="employee" entityId={emp.id} />
        </div>
      )}
    </div>
  );
}
