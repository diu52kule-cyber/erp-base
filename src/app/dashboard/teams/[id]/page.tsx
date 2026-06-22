import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import TeamWorkspaceClient from './TeamWorkspaceClient';
import TeamActivityFeed from './TeamActivityFeed';

export default async function TeamWorkspacePage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('teams') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  const [{ data: team }, { data: orgMembers }] = await Promise.all([
    supabase
      .from('teams')
      .select('*, department:departments(id,name,color), members:team_memberships(user_id, is_lead, joined_at)')
      .eq('id', params.id)
      .eq('org_id', ctx.org.id)
      .maybeSingle(),
    supabase
      .from('memberships')
      .select('user_id, role, job_title, email:users(email)')
      .eq('org_id', ctx.org.id),
  ]);

  if (!team) notFound();

  const members = (orgMembers ?? []) as any[];
  const canManage = ['owner', 'admin', 'manager'].includes(ctx.org.role);
  const teamMemberIds = new Set((team.members ?? []).map((m: any) => m.user_id));

  // Activity feed — recent audit_log rows from team members
  const teamMemberIdList = [...teamMemberIds] as string[];
  let activityLogs: any[] = [];
  const memberEmails: Record<string, string> = {};
  for (const m of members) {
    const email = Array.isArray(m.email) ? m.email[0]?.email :
                  typeof m.email === 'object' ? (m.email as any)?.email : m.email;
    if (email) memberEmails[m.user_id] = email;
  }
  if (teamMemberIdList.length > 0) {
    try {
      const { data: logs } = await supabase
        .from('audit_log')
        .select('id, user_id, table_name, record_id, action, created_at')
        .eq('org_id', ctx.org.id)
        .in('user_id', teamMemberIdList)
        .order('created_at', { ascending: false })
        .limit(30);
      activityLogs = logs ?? [];
    } catch { /* audit_log may not exist yet */ }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/teams" className="text-sm text-neutral-500 hover:text-neutral-900">← Teams</Link>
          <div className="mt-1 flex items-center gap-3">
            <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
            <h1 className="text-2xl font-semibold">{team.name}</h1>
            {(team.department as any) && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: (team.department as any).color + '20', color: (team.department as any).color }}
              >
                {(team.department as any).name}
              </span>
            )}
            {team.focus_area && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">{team.focus_area}</span>
            )}
          </div>
          {team.description && <p className="mt-1 text-sm text-neutral-500">{team.description}</p>}
        </div>
        {canManage && (
          <Link
            href="/dashboard/settings/departments"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Manage
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Members', value: (team.members ?? []).length },
          { label: 'Leads', value: (team.members ?? []).filter((m: any) => m.is_lead).length },
          { label: 'Department', value: (team.department as any)?.name ?? 'None' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Members + add-member (client component) */}
      <TeamWorkspaceClient
        teamId={params.id}
        currentMembers={team.members ?? []}
        orgMembers={members}
        teamMemberIds={(team.members ?? []).map((m: any) => String(m.user_id))}
        canManage={canManage}
        currentUserId={ctx.user.id}
      />

      {/* Activity feed */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="font-medium">Team Activity</h2>
        <p className="text-xs text-neutral-400">Live feed — updates in real time as team members take actions.</p>
        <TeamActivityFeed
          orgId={ctx.org.id}
          teamMemberIds={teamMemberIdList}
          initialLogs={activityLogs}
          memberEmails={memberEmails}
        />
      </div>

      {/* Quick links to workspace modules */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="font-medium">Team Workspace</h2>
        <p className="text-sm text-neutral-500">Jump to shared tools for this team.</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tasks', href: '/dashboard/tasks', icon: '✅' },
            { label: 'Docs', href: '/dashboard/docs', icon: '📚' },
            { label: 'Projects', href: '/dashboard/projects', icon: '📊' },
            { label: 'Goals', href: '/dashboard/goals', icon: '🎯' },
            { label: 'Meetings', href: '/dashboard/meetings', icon: '📝' },
            { label: 'Issues', href: '/dashboard/issues', icon: '🐞' },
            { label: 'Check-ins', href: '/dashboard/checkins', icon: '☀️' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
