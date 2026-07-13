import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import TeamClient from './TeamClient';
import { canInvite } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';

export default async function TeamPage() {
  const ctx = await getOrgContext();
  if (!ctx?.org) redirect('/login');
  // Only the team-management tier (owner/admin/manager) may view this page.
  if (!canInvite(ctx.org.role as OrgRole)) redirect('/dashboard/settings/preferences');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team & Roles</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage who has access to your workspace and what they can do.
        </p>
      </div>
      <TeamClient myRole={ctx.org.role as OrgRole} appUrl={appUrl} />
    </div>
  );
}
