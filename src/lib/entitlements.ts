import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";

const ALL_MODULES = new Set(MODULES.map((m) => m.key));

// Returns the current user's org plus the set of module keys they have enabled.
export async function getOrgContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(name, business_type)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return { user, org: null, enabledModules: new Set<string>() };

  // All orgs get all modules (max plan).
  const enabledModules = ALL_MODULES;

  return {
    user,
    org: {
      id: membership.org_id,
      role: membership.role,
      // @ts-expect-error supabase nested select typing
      name: membership.organizations?.name as string,
      // @ts-expect-error supabase nested select typing
      business_type: membership.organizations?.business_type as string,
    },
    enabledModules,
  };
}
