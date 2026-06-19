import { createAdminClient } from "@/lib/supabase/admin";

export type OrgMember = { user_id: string; role: string; email: string; name: string };

// Server-only: list an org's members with their emails (resolved via service role).
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const admin = createAdminClient();
  const { data: members } = await admin.from("memberships").select("user_id, role").eq("org_id", orgId);
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  const { data: { users } = { users: [] } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emap = Object.fromEntries((users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email]));

  return (members ?? []).map((m) => {
    const email = emap[m.user_id] ?? "";
    return { user_id: m.user_id, role: m.role, email: email || m.user_id, name: email ? email.split("@")[0] : "member" };
  });
}
