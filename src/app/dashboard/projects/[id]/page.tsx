import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import KanbanBoard from './KanbanBoard';
import TimePanel from './TimePanel';
import Comments from '@/components/Comments';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('projects') || !ctx.org) redirect('/dashboard');
  const { id } = await params;
  const supabase = createClient();
  const [{ data: project }, { data: tasks }, { data: time }] = await Promise.all([
    supabase.from('projects').select('*, client:contacts(id,name)').eq('id', id).eq('org_id', ctx.org.id).single(),
    supabase.from('tasks').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('time_entries').select('*').eq('project_id', id).order('date', { ascending: false }),
  ]);
  if (!project) notFound();

  const totalMins    = (time ?? []).reduce((s: number, t: any) => s + t.minutes, 0);
  const billableMins = (time ?? []).filter((t: any) => t.billable).reduce((s: number, t: any) => s + t.minutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/projects" className="text-sm text-neutral-500 hover:text-neutral-900">← Projects</Link>
          <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
          {(project.client as any)?.name && <p className="text-sm text-neutral-500 mt-0.5">{(project.client as any).name}</p>}
        </div>
        <div className="flex items-center gap-3 mt-8">
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 capitalize">{project.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[['Tasks', (tasks ?? []).length], ['Done', (tasks ?? []).filter((t: any) => t.status === 'done').length],
          ['Hours Logged', (totalMins / 60).toFixed(1) + 'h'], ['Billable', (billableMins / 60).toFixed(1) + 'h']
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <KanbanBoard projectId={id} initialTasks={tasks ?? []} />
      <TimePanel projectId={id} initialEntries={time ?? []} tasks={tasks ?? []} />
      <Comments entityType="project" entityId={id} currentUserId={ctx.user.id} />
    </div>
  );
}
