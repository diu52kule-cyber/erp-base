import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export default async function TeamsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('teams') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();

  const [{ data: depts }, { data: teams }] = await Promise.all([
    supabase.from('departments').select('*').eq('org_id', ctx.org.id).order('name'),
    supabase
      .from('teams')
      .select('*, department:departments(id,name,color), members:team_memberships(user_id, is_lead)')
      .eq('org_id', ctx.org.id)
      .order('name'),
  ]);

  const departments = depts ?? [];
  const teamsList   = teams ?? [];

  // Group teams by department
  const byDept: Record<string, typeof teamsList> = { __none: [] };
  for (const d of departments) byDept[d.id] = [];
  for (const t of teamsList) {
    const key = t.department_id ?? '__none';
    if (!byDept[key]) byDept[key] = [];
    byDept[key].push(t);
  }

  const canManage = ['owner', 'admin', 'manager'].includes(ctx.org.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Browse teams and open their workspaces.</p>
        </div>
        {canManage && (
          <Link
            href="/dashboard/settings/departments"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Manage Departments & Teams
          </Link>
        )}
      </div>

      {teamsList.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-neutral-500">No teams yet.</p>
          {canManage && (
            <Link href="/dashboard/settings/departments" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              Create your first department and team →
            </Link>
          )}
        </div>
      )}

      {/* Teams grouped by department */}
      {departments.map((dept) => {
        const deptTeams = byDept[dept.id] ?? [];
        if (deptTeams.length === 0) return null;
        return (
          <section key={dept.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dept.color }} />
              <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">{dept.name}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deptTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Unassigned teams */}
      {byDept['__none']?.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">No Department</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byDept['__none'].map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: any }) {
  const memberCount = (team.members ?? []).length;
  const leads = (team.members ?? []).filter((m: any) => m.is_lead);

  return (
    <Link
      href={`/dashboard/teams/${team.id}`}
      className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
          <span className="font-medium text-sm">{team.name}</span>
        </div>
        {team.focus_area && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{team.focus_area}</span>
        )}
      </div>
      {team.description && (
        <p className="text-xs text-neutral-500 line-clamp-2">{team.description}</p>
      )}
      <div className="mt-auto pt-1 flex items-center justify-between">
        <span className="text-xs text-neutral-400">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        {leads.length > 0 && (
          <span className="text-xs text-neutral-400">{leads.length} lead{leads.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </Link>
  );
}
