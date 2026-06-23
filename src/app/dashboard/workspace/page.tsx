import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  const ctx = await getOrgContext();
  if (!ctx?.org) redirect('/login');

  const supabase = createClient();
  const userId = ctx.user.id;
  const orgId = ctx.org.id;
  const today = new Date().toISOString().split('T')[0];

  const [
    { data: myTasks },
    { data: myIssues },
    { data: todayMeetings },
    { data: myCheckin },
    { data: activeSprint },
    { data: myGoals },
  ] = await Promise.all([
    // My open tasks
    supabase.from('tasks').select('id,title,status,priority,due_date,sprint_id')
      .eq('org_id', orgId).eq('assignee_id', userId)
      .not('status', 'in', '("done","closed")')
      .is('parent_task_id', null)
      .order('priority', { ascending: false })
      .limit(10),

    // My open issues
    supabase.from('issues').select('id,title,severity,status,due_date')
      .eq('org_id', orgId).eq('assignee_id', userId)
      .not('status', 'in', '("resolved","closed")')
      .order('created_at', { ascending: false })
      .limit(5),

    // Today's meetings
    supabase.from('meetings').select('id,title,meeting_date')
      .eq('org_id', orgId).eq('meeting_date', today)
      .order('created_at'),

    // My check-in today
    supabase.from('checkins').select('id,yesterday,today,blockers,mood')
      .eq('org_id', orgId).eq('user_id', userId).eq('checkin_date', today)
      .maybeSingle(),

    // Active sprint
    supabase.from('sprints').select('id,name,start_date,end_date')
      .eq('org_id', orgId).eq('status', 'active').maybeSingle(),

    // My OKRs (individual level)
    supabase.from('goals').select('id,title,progress,status,quarter')
      .eq('org_id', orgId).eq('owner_id', userId).eq('level', 'individual')
      .order('created_at', { ascending: false }).limit(5),
  ]);

  // Sprint task stats
  let sprintStats = { total: 0, done: 0 };
  if (activeSprint) {
    try {
      const { data: sprintTasks } = await supabase.from('tasks')
        .select('id,status').eq('org_id', orgId).eq('sprint_id', activeSprint.id);
      sprintStats = {
        total: sprintTasks?.length ?? 0,
        done: sprintTasks?.filter(t => t.status === 'done').length ?? 0,
      };
    } catch { /* ok */ }
  }

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700',
    medium: 'bg-blue-100 text-blue-700', low: 'bg-neutral-100 text-neutral-500',
  };
  const SEV_COLORS: Record<string, string> = {
    critical: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700',
    medium: 'bg-blue-100 text-blue-700', low: 'bg-neutral-100 text-neutral-500',
  };
  const STATUS_COLORS: Record<string, string> = {
    on_track: 'text-green-600', at_risk: 'text-amber-600', off_track: 'text-red-600', done: 'text-neutral-400',
  };
  const MOODS: Record<number, string> = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🚀' };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const memberName = ctx.org.role;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{greeting} 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">Here's what needs your attention today.</p>
      </div>

      {/* Check-in status banner */}
      {!myCheckin ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-medium text-amber-800 text-sm">You haven't checked in today</p>
            <p className="text-xs text-amber-600 mt-0.5">Let your team know what you're working on</p>
          </div>
          <Link href="/dashboard/checkins" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
            Check in now →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">{myCheckin.mood ? MOODS[myCheckin.mood] : '✅'}</span>
          <div>
            <p className="font-medium text-green-800 text-sm">Checked in today</p>
            {myCheckin.today && <p className="text-xs text-green-600 mt-0.5 max-w-md truncate">{myCheckin.today}</p>}
          </div>
          <Link href="/dashboard/checkins" className="ml-auto text-xs text-green-700 hover:text-green-900 underline">Update</Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* My Tasks */}
        <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 className="font-semibold text-sm">My tasks</h2>
            <Link href="/dashboard/tasks" className="text-xs text-neutral-400 hover:text-neutral-700">View all →</Link>
          </div>
          {!myTasks || myTasks.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-400">No open tasks assigned to you.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {myTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  <span className="flex-1 text-sm truncate">{t.title}</span>
                  <span className={`text-xs shrink-0 ${t.status.replace('_', ' ') === 'blocked' ? 'text-red-500' : 'text-neutral-400'}`}>{t.status.replace('_', ' ')}</span>
                  {t.due_date && (
                    <span className={`text-xs shrink-0 ${new Date(t.due_date) < new Date() ? 'text-red-500' : 'text-neutral-400'}`}>
                      {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Today's meetings */}
          <div className="rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <h2 className="font-semibold text-sm">Today's meetings</h2>
              <Link href="/dashboard/meetings" className="text-xs text-neutral-400 hover:text-neutral-700">All →</Link>
            </div>
            {!todayMeetings || todayMeetings.length === 0 ? (
              <div className="px-4 py-4 text-xs text-neutral-400">No meetings today.</div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {todayMeetings.map(m => (
                  <Link key={m.id} href={`/dashboard/meetings/${m.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-neutral-50">
                    <span className="text-base">📝</span>
                    <span className="flex-1 truncate">{m.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Active sprint */}
          {activeSprint && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-sm">Active sprint</h2>
                <Link href="/dashboard/tasks" className="text-xs text-neutral-400 hover:text-neutral-700">Board →</Link>
              </div>
              <p className="text-sm font-medium mb-2">{activeSprint.name}</p>
              <div className="h-2 w-full rounded-full bg-neutral-100">
                <div className="h-2 rounded-full bg-neutral-900 transition-all"
                  style={{ width: `${sprintStats.total ? (sprintStats.done / sprintStats.total) * 100 : 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-neutral-400">{sprintStats.done}/{sprintStats.total} tasks done</p>
            </div>
          )}
        </div>
      </div>

      {/* My Issues + OKRs */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* My Issues */}
        <div className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 className="font-semibold text-sm">My issues</h2>
            <Link href="/dashboard/issues" className="text-xs text-neutral-400 hover:text-neutral-700">All →</Link>
          </div>
          {!myIssues || myIssues.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-400">No open issues assigned to you. 🎉</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {myIssues.map(i => (
                <div key={i.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${SEV_COLORS[i.severity]}`}>{i.severity}</span>
                  <span className="flex-1 text-sm truncate">{i.title}</span>
                  {i.due_date && (
                    <span className={`text-xs shrink-0 ${new Date(i.due_date) < new Date() ? 'text-red-500' : 'text-neutral-400'}`}>
                      {new Date(i.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My OKRs */}
        <div className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 className="font-semibold text-sm">My objectives</h2>
            <Link href="/dashboard/goals" className="text-xs text-neutral-400 hover:text-neutral-700">All →</Link>
          </div>
          {!myGoals || myGoals.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-400">No personal OKRs yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {myGoals.map(g => (
                <div key={g.id} className="px-4 py-3 hover:bg-neutral-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex-1 text-sm font-medium truncate">{g.title}</span>
                    <span className={`text-xs font-medium ${STATUS_COLORS[g.status]}`}>{g.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-1.5 rounded-full bg-neutral-800" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-xs text-neutral-400 w-8 text-right">{g.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Workspace</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { icon: '✅', label: 'Tasks', href: '/dashboard/tasks' },
            { icon: '🎯', label: 'OKRs', href: '/dashboard/goals' },
            { icon: '📝', label: 'Meetings', href: '/dashboard/meetings' },
            { icon: '🐞', label: 'Issues', href: '/dashboard/issues' },
            { icon: '🏷️', label: 'Releases', href: '/dashboard/releases' },
            { icon: '📚', label: 'Docs', href: '/dashboard/docs' },
            { icon: '☀️', label: 'Check-ins', href: '/dashboard/checkins' },
            { icon: '🚀', label: 'Pipeline', href: '/dashboard/features' },
            { icon: '⚖️', label: 'Decisions', href: '/dashboard/decisions' },
            { icon: '✨', label: 'AI', href: '/dashboard/assistant' },
            { icon: '🏢', label: 'Teams', href: '/dashboard/teams' },
            { icon: '📊', label: 'Projects', href: '/dashboard/projects' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-4 text-center hover:bg-neutral-50 transition-colors">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium text-neutral-600">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
