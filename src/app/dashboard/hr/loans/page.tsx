import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import LoansClient from './LoansClient';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function LoansPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  let loans: any[] = [];
  let employees: { id: string; name: string; department?: string }[] = [];

  try {
    const [lRes, eRes] = await Promise.all([
      supabase.from('employee_loans').select('*, employee:employees(name, department), repayments:loan_repayments(*)')
        .eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, name, department').eq('org_id', ctx.org.id).eq('status', 'active').order('name'),
    ]);
    loans = lRes.data ?? [];
    employees = eRes.data ?? [];
  } catch { /* migration not run yet */ }

  const totalDisbursed = loans.reduce((s, l) => s + Number(l.amount), 0);
  const totalBalance = loans.filter((l) => l.status === 'active').reduce((s, l) => s + Number(l.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
          <h1 className="mt-1 text-2xl font-semibold">Employee Loans &amp; Advances</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Total Disbursed</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(totalDisbursed)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Outstanding Balance</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{fmt(totalBalance)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Active Loans</p>
          <p className="mt-1 text-2xl font-semibold">{loans.filter((l) => l.status === 'active').length}</p>
        </div>
      </div>

      <LoansClient initialLoans={loans} employees={employees} />
    </div>
  );
}
