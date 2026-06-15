import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700', on_hold: 'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700', cancelled: 'bg-neutral-100 text-neutral-500',
};

export default async function ProjectsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('projects') || !ctx.org) redirect('/dashboard');
  const supabase = await createClient();
  const { data: projects } = await supabase.from('projects')
    .select('*, client:contacts(name), tasks(id,status), time_entries(minutes,billable)')
    .eq('org_id', ctx.org.id).order('created_at', { ascending: false });

  const totalBillableHrs = (projects ?? []).reduce((s, p) =>
    s + (p.time_entries ?? []).filter((t: any) => t.billable).reduce((a: number, t: any) => a + t.minutes / 60, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/dashboard/projects/new" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          + New Project
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[['Active', (projects ?? []).filter((p) => p.status === 'active').length.toString()],
          ['Total', (projects ?? []).length.toString()],
          ['Billable Hours', totalBillableHrs.toFixed(1) + 'h']
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {(projects ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No projects yet</p>
          <Link href="/dashboard/projects/new" className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
            Create first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {(projects ?? []).map((p: any) => {
            const totalTasks    = (p.tasks ?? []).length;
            const doneTasks     = (p.tasks ?? []).filter((t: any) => t.status === 'done').length;
            const totalMins     = (p.time_entries ?? []).reduce((s: number, t: any) => s + t.minutes, 0);
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}
                className="rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.client && <p className="text-sm text-neutral-500 mt-0.5">{p.client.name}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-4 flex gap-6 text-sm text-neutral-500">
                  <span>{doneTasks}/{totalTasks} tasks</span>
                  <span>{(totalMins / 60).toFixed(1)}h logged</span>
                  {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString('en-IN')}</span>}
                  {p.budget && <span>Budget ₹{Number(p.budget).toLocaleString('en-IN')}</span>}
                </div>
                {totalTasks > 0 && (
                  <div className="mt-3 h-1.5 rounded-full bg-neutral-100">
                    <div className="h-1.5 rounded-full bg-neutral-900" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
