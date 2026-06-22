import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import LeavesClient from './LeavesClient';

export default async function LeavesPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();

  let leaves: any[] = [];
  let leaveTypes: any[] = [];
  let employees: any[] = [];

  try {
    const [lRes, ltRes, eRes] = await Promise.all([
      supabase
        .from('leave_requests')
        .select('*, employee:employees(name, department), leave_type:leave_types(name, color, paid)')
        .eq('org_id', ctx.org.id)
        .order('created_at', { ascending: false }),
      supabase.from('leave_types').select('*').eq('org_id', ctx.org.id).order('name'),
      supabase.from('employees').select('id, name, department').eq('org_id', ctx.org.id).eq('status', 'active').order('name'),
    ]);
    leaves = lRes.data ?? [];
    leaveTypes = ltRes.data ?? [];
    employees = eRes.data ?? [];
  } catch { /* migration not run yet */ }

  const pending = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/hr" className="text-sm text-neutral-500 hover:text-neutral-900">← HR</Link>
          <h1 className="mt-1 text-2xl font-semibold">Leave Management</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Pending Requests</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{pending}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Approved This Year</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{approved}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Total Requests</p>
          <p className="mt-1 text-2xl font-semibold">{leaves.length}</p>
        </div>
      </div>

      <LeavesClient
        initialLeaves={leaves}
        leaveTypes={leaveTypes}
        employees={employees}
      />
    </div>
  );
}
